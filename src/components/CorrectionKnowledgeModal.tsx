import React, { useState, useEffect } from 'react';
import { CorrectionLog } from '../types';
import { BrainCircuit, Trash2, X, AlertTriangle, ArrowRight, RefreshCw, CheckCircle2, BookOpen } from 'lucide-react';

interface CorrectionKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKnowledgeUpdated?: () => void;
}

export const CorrectionKnowledgeModal: React.FC<CorrectionKnowledgeModalProps> = ({
  isOpen,
  onClose,
  onKnowledgeUpdated
}) => {
  const [corrections, setCorrections] = useState<CorrectionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCorrections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/corrections');
      if (!res.ok) throw new Error(`修正履歴の取得に失敗しました: ${res.status}`);
      const data = await res.json();
      setCorrections(data.corrections || []);
    } catch (err: any) {
      console.error("Failed to load corrections:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCorrections();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/corrections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setCorrections(prev => prev.filter(c => c.id !== id));
      if (onKnowledgeUpdated) onKnowledgeUpdated();
    } catch (err: any) {
      alert("削除中にエラーが発生しました: " + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("すべての学習済み修正履歴をクリアしますか？次回スキャン時のプロンプト学習データがリセットされます。")) {
      return;
    }

    try {
      const res = await fetch('/api/corrections/clear', { method: 'POST' });
      if (!res.ok) throw new Error('クリアに失敗しました');
      setCorrections([]);
      if (onKnowledgeUpdated) onKnowledgeUpdated();
    } catch (err: any) {
      alert("クリア中にエラーが発生しました: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-[#E8E1D7] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E8E1D7] bg-[#FDFBF7] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-[#5D6D5F] text-white">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#3E362E]">AI学習済み修正ナレッジ</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E7EFE8] text-[#334A36] font-bold border border-[#C3D5C5]">
                  {corrections.length} 件学習中
                </span>
              </div>
              <p className="text-[11px] text-[#786C5E]">
                ユーザーが修正したタイトル・著者のペアを、次回スキャン時のAIプロンプトに自動反映して精度を継続向上します
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#786C5E] hover:text-[#3E362E] rounded-lg hover:bg-[#EFE9E0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explain Box */}
        <div className="p-3 bg-[#FAF8F5] border-b border-[#EFE9E0] text-[11px] text-[#6E5F52] flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[#3E362E]">どのように学習されるか:</strong>
            スキャン結果や書籍詳細モーダルで書名を修正したり外部APIで補正すると、自動的にここへ学習ログが蓄積されます。
            次回本棚をスキャンする際、Geminiのプロンプト内に「過去の誤読 ➡ 正解データ」が自動注入され、同一書籍や似たフォントの背表紙で同じ誤りを繰り返さなくなります。
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#FDFBF7]">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#786C5E]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#5D6D5F]" />
              <p className="text-xs">学習ログを読み込み中...</p>
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          ) : corrections.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 text-[#786C5E]">
              <BookOpen className="w-8 h-8 text-[#A99C8E]" />
              <p className="text-xs font-medium">まだ学習された修正ログはありません</p>
              <p className="text-[11px] text-[#A99C8E] max-w-sm">
                スキャン後の検出リストや書籍詳細で「タイトル・著者を編集」または「外部書籍APIで補正」を行うと、自動的にここに学習データとして記録されます。
              </p>
            </div>
          ) : (
            corrections.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-[#E8E1D7] hover:border-[#D9C5B2] transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                      OCR誤読: {item.originalTitle}
                    </span>
                    <ArrowRight className="w-3 h-3 text-[#A99C8E] shrink-0" />
                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      正解: {item.correctedTitle}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#786C5E]">
                    {item.correctedAuthor && (
                      <span>著者: <strong className="text-[#3E362E]">{item.correctedAuthor}</strong></span>
                    )}
                    {item.publisher && (
                      <span>出版社: {item.publisher}</span>
                    )}
                    {item.isbn && (
                      <span className="font-mono text-[10px]">ISBN: {item.isbn}</span>
                    )}
                    <span className="text-[10px] text-[#A99C8E]">
                      {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  title="この学習項目を削除"
                  className="p-1 text-[#A99C8E] hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E8E1D7] bg-[#F7F3EE] flex items-center justify-between">
          {corrections.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer transition-colors"
            >
              学習履歴を全クリア
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#5D6D5F] hover:bg-[#4A574C] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
