import React from 'react';
import { BookOpen, Camera, ClipboardCheck, Sparkles, RefreshCw, Plus, AlertTriangle, FileSpreadsheet, CheckCircle2, Wrench } from 'lucide-react';
import { Book } from '../types';
import { exportBooksToCSV } from '../utils/csvExport';

interface HeaderProps {
  books: Book[];
  activeTab: 'library' | 'scan' | 'audit' | 'reviews' | 'maintenance';
  setActiveTab: (tab: 'library' | 'scan' | 'audit' | 'reviews' | 'maintenance') => void;
  onOpenManualAdd: () => void;
  onResetSample: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  books,
  activeTab,
  setActiveTab,
  onOpenManualAdd,
  onResetSample,
  isLoading
}) => {
  // Compute inventory audit stats
  const totalBooks = books.length;
  const ocrFailedBooks = books.filter(b => b.isOcrFailed || b.auditStatus === 'ocr_failed' || b.title.includes('OCR読み取り不可'));
  const ocrFailedCount = ocrFailedBooks.length;
  const normalCount = totalBooks - ocrFailedCount;
  const normalRate = totalBooks > 0 ? Math.round((normalCount / totalBooks) * 100) : 100;

  const handleExportCSV = () => {
    exportBooksToCSV(books);
  };

  return (
    <header className="bg-[#FDFBF7] border-b border-[#E8E1D7] sticky top-0 z-30 shadow-xs backdrop-blur-xs/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with Branding & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 border-b border-[#EFE9E0]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#5D6D5F] flex items-center justify-center text-white shadow-xs ring-2 ring-[#5D6D5F]/20">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-[#3E362E] font-serif">
                  本棚書籍管理アプリ
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#EDF2EE] text-[#425044] border border-[#D0DCD2]">
                  蔵書点検モード
                </span>
              </div>
              <p className="text-xs text-[#786C5E]">
                本棚写真からAIで書籍・棚卸し数を自動認識 ＆ 本棚・書籍一覧CSVエクスポート
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 self-end sm:self-auto flex-wrap">
            <button
              id="header-export-csv-btn"
              type="button"
              onClick={handleExportCSV}
              title="本棚と書籍の一覧をCSVエクスポート"
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg text-[#3E362E] bg-[#F7F3EE] hover:bg-[#EAE4DB] active:bg-[#DFD7CC] border border-[#D9C5B2] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-[#5D6D5F]" />
              CSVエクスポート
            </button>
            <button
              id="header-reset-sample-btn"
              type="button"
              onClick={onResetSample}
              disabled={isLoading}
              title="初期点検サンプルデータに戻す"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-[#635547] bg-[#F7F3EE] hover:bg-[#EAE4DB] active:bg-[#DFD7CC] border border-[#E8E1D7] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              サンプル復元
            </button>
            <button
              id="header-manual-add-btn"
              type="button"
              onClick={onOpenManualAdd}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-[#3E362E] bg-[#F7F3EE] hover:bg-[#EAE4DB] active:bg-[#DFD7CC] transition-colors border border-[#D9C5B2] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-[#786C5E]" />
              手動登録
            </button>
            <button
              id="header-scan-cta-btn"
              type="button"
              onClick={() => setActiveTab('scan')}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#5D6D5F] hover:bg-[#4D5C4F] active:bg-[#3E4C40] shadow-xs transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              本棚を点検スキャン
            </button>
          </div>
        </div>

        {/* Stats & Navigation Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between py-2 gap-2.5">
          {/* Main Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto pb-1 xl:pb-0 shrink-0" aria-label="Tabs">
            <button
              id="tab-library"
              onClick={() => setActiveTab('library')}
              className={`flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === 'library'
                  ? 'bg-[#EDF2EE] text-[#38483B] font-semibold border border-[#CCDACC] shadow-xs'
                  : 'text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE]'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-1.5 sm:mr-2 text-[#5D6D5F]" />
              蔵書・本棚一覧
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs bg-[#EAE4DB] text-[#3E362E]">
                {totalBooks}
              </span>
            </button>

            <button
              id="tab-scan"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === 'scan'
                  ? 'bg-[#EDF2EE] text-[#38483B] font-semibold border border-[#CCDACC] shadow-xs'
                  : 'text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE]'
              }`}
            >
              <Camera className="w-4 h-4 mr-1.5 sm:mr-2 text-[#5D6D5F]" />
              本棚AI点検スキャン
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs bg-[#DDE6DF] text-[#38483B] font-medium">
                画像認識
              </span>
            </button>

            <button
              id="tab-audit"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === 'audit'
                  ? 'bg-[#EDF2EE] text-[#38483B] font-semibold border border-[#CCDACC] shadow-xs'
                  : 'text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE]'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 mr-1.5 sm:mr-2 text-[#5D6D5F]" />
              蔵書点検集計・レポート
              {ocrFailedCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                  不可 {ocrFailedCount}
                </span>
              )}
            </button>

            <button
              id="tab-reviews"
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === 'reviews'
                  ? 'bg-[#EDF2EE] text-[#38483B] font-semibold border border-[#CCDACC] shadow-xs'
                  : 'text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE]'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-1.5 sm:mr-2 text-[#5D6D5F]" />
              読書メモ・レビュー
            </button>

            <button
              id="tab-maintenance"
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === 'maintenance'
                  ? 'bg-[#EDF2EE] text-[#38483B] font-semibold border border-[#CCDACC] shadow-xs'
                  : 'text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE]'
              }`}
            >
              <Wrench className="w-4 h-4 mr-1.5 sm:mr-2 text-[#5D6D5F]" />
              メンテナンス
            </button>
          </nav>

          {/* Inventory Audit Metrics Bar */}
          <div className="flex items-center space-x-2 text-xs text-[#786C5E] overflow-x-auto shrink-0 self-start xl:self-auto pt-1 xl:pt-0">
            <div className="flex items-center space-x-1.5 bg-[#F7F3EE] px-2.5 py-1 rounded-md border border-[#E8E1D7] whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5D6D5F]" />
              <span>正常読取: <strong className="text-[#2D5A34]">{normalCount}</strong>/{totalBooks}冊 ({normalRate}%)</span>
            </div>
            <div 
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border cursor-pointer transition-colors whitespace-nowrap ${
                ocrFailedCount > 0 
                  ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E] hover:bg-[#FDE68A]' 
                  : 'bg-[#F7F3EE] border-[#E8E1D7] text-[#786C5E]'
              }`}
              title="クリックして点検集計画面を開く"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${ocrFailedCount > 0 ? 'text-[#D97706]' : 'text-[#786C5E]'}`} />
              <span>OCR読み取り不可: <strong className={ocrFailedCount > 0 ? 'text-[#B45309]' : 'text-[#3E362E]'}>{ocrFailedCount}</strong>冊</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
