import React, { useState, useEffect } from 'react';
import { BookLookupResult } from '../types';
import { Search, BookOpen, ExternalLink, Check, Loader2, X, Sparkles, Building, Calendar, Hash } from 'lucide-react';

interface BookLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialAuthor?: string;
  initialIsbn?: string;
  onApply: (selected: BookLookupResult) => void;
}

export const BookLookupModal: React.FC<BookLookupModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialAuthor = '',
  initialIsbn = '',
  onApply
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [author, setAuthor] = useState(initialAuthor);
  const [isbn, setIsbn] = useState(initialIsbn);
  const [results, setResults] = useState<BookLookupResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props
  useEffect(() => {
    if (isOpen) {
      // Clean query if it was "OCR読み取り不可"
      const cleanQ = initialQuery === 'OCR読み取り不可' ? '' : initialQuery;
      const cleanA = initialAuthor === '著者不明' || initialAuthor === '不明' ? '' : initialAuthor;
      setQuery(cleanQ);
      setAuthor(cleanA);
      setIsbn(initialIsbn);
      setResults([]);
      setHasSearched(false);
      setError(null);

      // Trigger search if there's any search term
      if (cleanQ || cleanA || initialIsbn) {
        performSearch(cleanQ, cleanA, initialIsbn);
      }
    }
  }, [isOpen, initialQuery, initialAuthor, initialIsbn]);

  const performSearch = async (qTerm: string, aTerm: string, isbnTerm: string) => {
    if (!qTerm.trim() && !aTerm.trim() && !isbnTerm.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (qTerm.trim()) params.append('query', qTerm.trim());
      if (aTerm.trim()) params.append('author', aTerm.trim());
      if (isbnTerm.trim()) params.append('isbn', isbnTerm.trim());

      const res = await fetch(`/api/lookup-book?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `検索に失敗しました: ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results || []);
      setHasSearched(true);
    } catch (err: any) {
      console.error("Book lookup error:", err);
      setError(err.message || "書籍APIからの検索中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, author, isbn);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#E8E1D7] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E8E1D7] bg-[#FDFBF7] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-[#5D6D5F] text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#3E362E]">外部書籍API照合・書誌データ自動補正</h3>
              <p className="text-[11px] text-[#786C5E]">Google Books / OpenBD（JPRO出版情報）から正式名称・著者・ISBNを特定</p>
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

        {/* Search Inputs */}
        <form onSubmit={handleFormSubmit} className="p-4 border-b border-[#EFE9E0] bg-[#FAF8F5] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-[#6E5F52] mb-1">書名・キーワード</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例: リーダブルコード"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D9C5B2] focus:border-[#5D6D5F] focus:ring-1 focus:ring-[#5D6D5F] outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6E5F52] mb-1">著者名（任意）</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="例: Dustin"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D9C5B2] focus:border-[#5D6D5F] focus:ring-1 focus:ring-[#5D6D5F] outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6E5F52] mb-1">ISBN（任意）</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="例: 9784..."
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D9C5B2] focus:border-[#5D6D5F] focus:ring-1 focus:ring-[#5D6D5F] outline-hidden bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end items-center space-x-2 pt-1">
            <span className="text-[10px] text-[#786C5E] mr-auto">
              ※あいまい検索対応。背表紙の一部しか読めない場合でも候補を検索できます。
            </span>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-[#5D6D5F] text-white text-xs font-semibold rounded-lg hover:bg-[#4A574C] transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>書籍API検索中...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>再検索</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FDFBF7]">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-center text-[#786C5E]">
              <Loader2 className="w-7 h-7 animate-spin text-[#5D6D5F]" />
              <p className="text-xs font-medium">Google Books & OpenBD から書籍情報を照合中...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-[#6E5F52] flex items-center justify-between">
                <span>見つかった候補（{results.length} 件）: 正しい情報を選択して適用してください</span>
              </div>
              {results.map((item, idx) => (
                <div
                  key={`${item.isbn}-${idx}`}
                  className="p-3 bg-white rounded-xl border border-[#E8E1D7] hover:border-[#5D6D5F] hover:shadow-md transition-all flex items-start gap-3 group"
                >
                  {/* Thumbnail if available */}
                  <div className="w-14 h-20 shrink-0 bg-[#F7F3EE] rounded border border-[#E8E1D7] overflow-hidden flex items-center justify-center">
                    {item.coverThumbnail ? (
                      <img
                        src={item.coverThumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <BookOpen className="w-6 h-6 text-[#A99C8E]" />
                    )}
                  </div>

                  {/* Book Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#3E362E] font-serif leading-snug group-hover:text-[#2563eb] transition-colors">
                        {item.title}
                      </h4>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                        item.source === 'openbd'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {item.source === 'openbd' ? 'OpenBD(出版情報)' : 'Google Books'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#786C5E] mt-1">
                      <span>著者: <strong className="text-[#3E362E]">{item.author}</strong></span>
                      {item.publisher && (
                        <span className="flex items-center space-x-1">
                          <Building className="w-3 h-3 text-[#A99C8E]" />
                          <span>{item.publisher}</span>
                        </span>
                      )}
                      {item.publishedYear && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#A99C8E]" />
                          <span>{item.publishedYear}年</span>
                        </span>
                      )}
                      {item.isbn && (
                        <span className="flex items-center space-x-1 font-mono text-[10px]">
                          <Hash className="w-3 h-3 text-[#A99C8E]" />
                          <span>{item.isbn}</span>
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-[10px] text-[#786C5E] line-clamp-2 mt-1.5 leading-relaxed bg-[#FAF8F5] p-1.5 rounded">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onApply(item);
                          onClose();
                        }}
                        className="px-3 py-1 bg-[#5D6D5F] hover:bg-[#4A574C] text-white text-[11px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1 shadow-xs"
                      >
                        <Check className="w-3 h-3" />
                        <span>この書籍情報で補正・適用</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[#786C5E]">
              <Search className="w-8 h-8 text-[#A99C8E]" />
              <p className="text-xs font-medium">該当する書籍情報が見つかりませんでした</p>
              <p className="text-[11px] text-[#A99C8E]">
                キーワードや著者名を少し短くするか、背表紙に読める単語で再検索してみてください。
              </p>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[#786C5E]">
              <BookOpen className="w-8 h-8 text-[#A99C8E]" />
              <p className="text-xs font-medium">書籍名または著者名を入力して検索してください</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E8E1D7] bg-[#F7F3EE] flex items-center justify-between text-xs text-[#786C5E]">
          <span className="text-[11px]">
            ※適用すると、次回のAI背表紙スキャンへの学習ナレッジとしても自動保存されます
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
