import React, { useState, useEffect } from 'react';
import { Camera, Calendar, AlertTriangle, Clock, X, Settings2, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';
import { Book } from '../types';

interface AuditPromptBannerProps {
  books: Book[];
  onNavigateToScan: () => void;
}

export const AuditPromptBanner: React.FC<AuditPromptBannerProps> = ({
  books,
  onNavigateToScan
}) => {
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);
  const [intervalDays, setIntervalDays] = useState<number>(30); // Default 30 days
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Load last scan date and settings from localStorage / books
  const checkLastScan = () => {
    try {
      // Check dismissed today
      const dismissedDate = localStorage.getItem('bookshelf_dismissed_audit_prompt');
      const todayStr = new Date().toISOString().split('T')[0];
      if (dismissedDate === todayStr) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }

      // Load interval setting
      const savedInterval = localStorage.getItem('bookshelf_audit_interval_days');
      if (savedInterval) {
        setIntervalDays(parseInt(savedInterval, 10) || 30);
      }

      // Load last scan date
      const storedScanStr = localStorage.getItem('bookshelf_last_scan_date');
      if (storedScanStr) {
        setLastScanDate(new Date(storedScanStr));
      } else if (books.length > 0) {
        // Fallback to earliest/latest book timestamp as reference
        const timestamps = books
          .map(b => new Date(b.createdAt || b.updatedAt || 0).getTime())
          .filter(t => !isNaN(t) && t > 0);
        
        if (timestamps.length > 0) {
          const maxTime = Math.max(...timestamps);
          setLastScanDate(new Date(maxTime));
        } else {
          // Simulated 40 days ago so the prompt is visible on clean state
          const fortyDaysAgo = new Date();
          fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
          setLastScanDate(fortyDaysAgo);
        }
      } else {
        // No books yet, set to 40 days ago
        const fortyDaysAgo = new Date();
        fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
        setLastScanDate(fortyDaysAgo);
      }
    } catch (e) {
      console.warn("Failed to check last scan date:", e);
    }
  };

  useEffect(() => {
    checkLastScan();

    // Listen to custom scan completion events
    const handleScanCompleted = () => {
      checkLastScan();
    };

    window.addEventListener('bookshelf_scan_completed', handleScanCompleted);
    return () => {
      window.removeEventListener('bookshelf_scan_completed', handleScanCompleted);
    };
  }, [books]);

  // Calculate elapsed days
  const now = new Date();
  const elapsedDays = lastScanDate
    ? Math.max(0, Math.floor((now.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 999;

  // Should show banner?
  const shouldShow = !isDismissed && elapsedDays >= intervalDays;

  // Handle Dismiss for today
  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('bookshelf_dismissed_audit_prompt', todayStr);
    } catch (e) {
      console.warn("Failed to save dismissal:", e);
    }
  };

  // Change interval setting
  const handleChangeInterval = (days: number) => {
    setIntervalDays(days);
    try {
      localStorage.setItem('bookshelf_audit_interval_days', String(days));
    } catch (e) {
      console.warn("Failed to save interval setting:", e);
    }
  };

  // Test simulation helper
  const handleSimulateDaysAgo = (days: number) => {
    const simDate = new Date();
    simDate.setDate(simDate.getDate() - days);
    setLastScanDate(simDate);
    setIsDismissed(false);
    try {
      localStorage.setItem('bookshelf_last_scan_date', simDate.toISOString());
      localStorage.removeItem('bookshelf_dismissed_audit_prompt');
    } catch (e) {
      console.warn("Failed to save simulated date:", e);
    }
  };

  const handleResetToNow = () => {
    const today = new Date();
    setLastScanDate(today);
    try {
      localStorage.setItem('bookshelf_last_scan_date', today.toISOString());
    } catch (e) {
      console.warn("Failed to save scan date:", e);
    }
  };

  // Unaudited / OCR-failed book count
  const ocrFailedCount = books.filter(
    b => b.isOcrFailed || b.auditStatus === 'ocr_failed' || b.title.includes('OCR読み取り不可')
  ).length;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="relative bg-[#FAF5EE] border border-[#E4D7C5] rounded-xl shadow-xs overflow-hidden transition-all animate-in fade-in duration-200">
      {/* Top subtle highlight border */}
      <div className="h-1 bg-[#D97736]" />

      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Main Info */}
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-[#F0E6D8] text-[#D97736] shrink-0 mt-0.5 border border-[#E2D2BE]">
              <Clock className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#FCE8DA] text-[#A74E16] border border-[#F3CDAF]">
                  定期蔵書点検アラート
                </span>
                <span className="text-xs font-semibold text-[#6E5F52]">
                  最終スキャンから <strong className="text-[#A74E16] font-bold text-sm">{elapsedDays} 日</strong> が経過しています
                </span>
              </div>

              <p className="text-xs text-[#5C5044] leading-relaxed max-w-2xl pt-0.5">
                背表紙の配架ズレや紛失本がないか、現物と蔵書台帳の一致を確認する定期棚卸しの時期です。
                カメラで本棚を撮影するだけで、AIが蔵書を自動照合・登録します。
                {ocrFailedCount > 0 && (
                  <span className="text-[#A74E16] font-medium ml-1">
                    （現在要確認の書籍: {ocrFailedCount} 冊）
                  </span>
                )}
              </p>

              {lastScanDate && (
                <div className="flex items-center space-x-3 text-[11px] text-[#8C7D6F] pt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>前回のスキャン実施日: {lastScanDate.toLocaleDateString('ja-JP')}</span>
                  </span>
                  <span>•</span>
                  <span>推奨間隔: {intervalDays} 日ごと</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
            <button
              type="button"
              onClick={onNavigateToScan}
              className="px-4 py-2 bg-[#5D6D5F] hover:bg-[#4D5C4F] active:bg-[#3E4E40] text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>本棚をスキャンして点検</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              title="通知設定"
              className="p-2 text-[#786C5E] hover:text-[#3E362E] hover:bg-[#EFE9E0] rounded-lg transition-colors cursor-pointer border border-[#D9C5B2]"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              title="本日はこの通知を閉じる"
              className="p-2 text-[#786C5E] hover:text-[#3E362E] hover:bg-[#EFE9E0] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Settings & Simulation Drawer */}
        {showSettings && (
          <div className="mt-4 pt-3.5 border-t border-[#E8E1D7] bg-[#F7F2EA] -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 rounded-b-xl space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-[#3E362E]">点検推奨間隔の設定</h4>
                <p className="text-[11px] text-[#786C5E]">本棚のスキャンから指定した日数が経過した際に通知バナーを表示します</p>
              </div>

              <div className="flex items-center space-x-1.5">
                {[7, 14, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleChangeInterval(days)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      intervalDays === days
                        ? 'bg-[#5D6D5F] text-white'
                        : 'bg-white text-[#5C5044] border border-[#D9C5B2] hover:bg-[#EFE9E0]'
                    }`}
                  >
                    {days}日
                  </button>
                ))}
              </div>
            </div>

            {/* Test Simulation Controls for easy verification */}
            <div className="pt-2 border-t border-[#E8E1D7]/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#786C5E]">
              <span>動作テスト（前回スキャン日のシミュレーション）:</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => handleSimulateDaysAgo(45)}
                  className="px-2 py-0.5 rounded bg-white border border-[#D9C5B2] hover:bg-[#FAF8F5] text-[#3E362E] cursor-pointer"
                >
                  45日前に設定
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateDaysAgo(15)}
                  className="px-2 py-0.5 rounded bg-white border border-[#D9C5B2] hover:bg-[#FAF8F5] text-[#3E362E] cursor-pointer"
                >
                  15日前に設定
                </button>
                <button
                  type="button"
                  onClick={handleResetToNow}
                  className="px-2 py-0.5 rounded bg-white border border-[#D9C5B2] hover:bg-[#FAF8F5] text-[#3E362E] cursor-pointer flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>本日スキャン済みに更新</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
