import React, { useState, useEffect, useMemo } from 'react';
import { Book, BookLookupResult, BookIsbnLookupItem, IsbnMatchStatus } from '../types';
import {
  X,
  Search,
  Globe,
  Check,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  BookOpen,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Edit2
} from 'lucide-react';

interface BatchIsbnLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onRefreshBooks: () => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const BatchIsbnLookupModal: React.FC<BatchIsbnLookupModalProps> = ({
  isOpen,
  onClose,
  books,
  onRefreshBooks,
  onShowToast
}) => {
  if (!isOpen) return null;

  // Filter mode: 'missing_only' (default) or 'all'
  const [targetScope, setTargetScope] = useState<'missing_only' | 'all'>('missing_only');
  const [searchFilterText, setSearchFilterText] = useState<string>('');

  // Target items list
  const [items, setItems] = useState<BookIsbnLookupItem[]>([]);
  const [isSearchingAll, setIsSearchingAll] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');

  // Expand states for candidates per book
  const [expandedCandidateBookId, setExpandedCandidateBookId] = useState<string | null>(null);

  // Editing search terms for individual books
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAuthor, setEditAuthor] = useState<string>('');
  const [isRowSearching, setIsRowSearching] = useState<string | null>(null);

  // Initialize items when modal opens or scope changes
  useEffect(() => {
    const targetBooks = books.filter(b => {
      if (targetScope === 'missing_only') {
        return !b.isbn || b.isbn.trim().length === 0;
      }
      return true;
    });

    const initialItems: BookIsbnLookupItem[] = targetBooks.map(b => ({
      bookId: b.id,
      originalTitle: b.title,
      originalAuthor: b.author,
      currentIsbn: b.isbn || '',
      publisher: b.publisher,
      publishedYear: b.publishedYear,
      shelfLocation: b.shelfLocation,
      status: 'idle',
      candidates: [],
      selectedCandidateIndex: -1,
      selectedIsbn: '',
      selectedForUpdate: false
    }));

    setItems(initialItems);
  }, [books, targetScope, isOpen]);

  // Filtered display items based on searchFilterText
  const displayedItems = useMemo(() => {
    if (!searchFilterText.trim()) return items;
    const q = searchFilterText.toLowerCase();
    return items.filter(
      item =>
        item.originalTitle.toLowerCase().includes(q) ||
        item.originalAuthor.toLowerCase().includes(q) ||
        (item.shelfLocation || '').toLowerCase().includes(q)
    );
  }, [items, searchFilterText]);

  // Counts for summary
  const exactMatchedCount = items.filter(i => i.status === 'exact_matched').length;
  const candidatesFoundCount = items.filter(i => i.status === 'candidates_found').length;
  const notFoundCount = items.filter(i => i.status === 'not_found').length;
  const selectedCount = items.filter(i => i.selectedForUpdate && i.selectedIsbn).length;

  // Execute batch lookup
  const handleStartBatchLookup = async () => {
    if (items.length === 0) return;

    setIsSearchingAll(true);
    setProgressText(`全 ${items.length} 冊のタイトル・著者名からWeb書籍データベース（Google Books / OpenBD）を一括照合中...`);

    try {
      // Mark all as searching
      setItems(prev => prev.map(i => ({ ...i, status: 'searching' })));

      const payloadBooks = items.map(i => ({
        id: i.bookId,
        title: i.originalTitle,
        author: i.originalAuthor,
        currentIsbn: i.currentIsbn
      }));

      const res = await fetch('/api/books/batch-isbn-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: payloadBooks })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '一括照合に失敗しました');
      }

      const data = await res.json();
      const lookupResults: any[] = data.results || [];

      // Update state with lookup results
      setItems(prev =>
        prev.map(item => {
          const found = lookupResults.find(r => r.bookId === item.bookId);
          if (!found) return { ...item, status: 'not_found' };

          const isExact = found.status === 'exact_matched';
          const isCandidate = found.status === 'candidates_found';

          return {
            ...item,
            status: found.status as IsbnMatchStatus,
            matchedIsbn: found.matchedIsbn || '',
            matchedTitle: found.matchedTitle || '',
            matchedAuthor: found.matchedAuthor || '',
            matchedPublisher: found.matchedPublisher || '',
            matchedPublishedYear: found.matchedPublishedYear || '',
            candidates: found.candidates || [],
            selectedCandidateIndex: found.selectedCandidateIndex ?? -1,
            selectedIsbn: found.selectedIsbn || found.matchedIsbn || '',
            applyTitle: isExact ? found.matchedTitle : undefined,
            applyAuthor: isExact ? found.matchedAuthor : undefined,
            applyPublisher: found.matchedPublisher || undefined,
            applyPublishedYear: found.matchedPublishedYear || undefined,
            selectedForUpdate: Boolean(found.selectedIsbn || found.matchedIsbn),
            errorMessage: found.errorMessage
          };
        })
      );

      onShowToast(
        `照合完了: ${data.exactMatchedCount || 0}冊のISBNを特定、${data.candidatesFoundCount || 0}冊の修正候補を発見しました`,
        'success'
      );
    } catch (err: any) {
      console.error('Batch ISBN lookup failed:', err);
      onShowToast(err.message || '一括照合処理でエラーが発生しました', 'error');
      setItems(prev => prev.map(i => ({ ...i, status: i.status === 'searching' ? 'error' : i.status })));
    } finally {
      setIsSearchingAll(false);
      setProgressText('');
    }
  };

  // Perform single book search (e.g. after tweaking title or author)
  const handleSingleLookup = async (bookId: string, qTitle: string, qAuthor: string) => {
    setIsRowSearching(bookId);
    try {
      const params = new URLSearchParams();
      if (qTitle.trim()) params.append('query', qTitle.trim());
      if (qAuthor.trim()) params.append('author', qAuthor.trim());

      const res = await fetch(`/api/lookup-book?${params.toString()}`);
      if (!res.ok) throw new Error('単体照合に失敗しました');

      const data = await res.json();
      const candidates: BookLookupResult[] = data.results || [];
      const best = data.bestMatch;

      setItems(prev =>
        prev.map(item => {
          if (item.bookId !== bookId) return item;

          if (best && best.isbn) {
            return {
              ...item,
              status: 'exact_matched',
              matchedIsbn: best.isbn,
              matchedTitle: best.title,
              matchedAuthor: best.author,
              matchedPublisher: best.publisher,
              matchedPublishedYear: best.publishedYear,
              candidates,
              selectedCandidateIndex: candidates.findIndex(c => c.isbn === best.isbn),
              selectedIsbn: best.isbn,
              applyPublisher: best.publisher,
              applyPublishedYear: best.publishedYear,
              selectedForUpdate: true
            };
          } else if (candidates.length > 0) {
            const firstWithIsbn = candidates.find(c => c.isbn && c.isbn.length >= 10);
            return {
              ...item,
              status: 'candidates_found',
              matchedIsbn: firstWithIsbn?.isbn || '',
              matchedTitle: firstWithIsbn?.title || '',
              matchedAuthor: firstWithIsbn?.author || '',
              matchedPublisher: firstWithIsbn?.publisher || '',
              matchedPublishedYear: firstWithIsbn?.publishedYear || '',
              candidates,
              selectedCandidateIndex: firstWithIsbn ? candidates.indexOf(firstWithIsbn) : -1,
              selectedIsbn: firstWithIsbn?.isbn || '',
              selectedForUpdate: Boolean(firstWithIsbn?.isbn)
            };
          } else {
            return {
              ...item,
              status: 'not_found',
              candidates: [],
              selectedCandidateIndex: -1,
              selectedIsbn: '',
              selectedForUpdate: false
            };
          }
        })
      );

      setEditingBookId(null);
      onShowToast(`「${qTitle}」の再照合を完了しました`);
    } catch (err: any) {
      onShowToast(err.message || '再照合に失敗しました', 'error');
    } finally {
      setIsRowSearching(null);
    }
  };

  // Toggle selection checkbox
  const handleToggleSelect = (bookId: string) => {
    setItems(prev =>
      prev.map(i => {
        if (i.bookId === bookId) {
          return { ...i, selectedForUpdate: !i.selectedForUpdate };
        }
        return i;
      })
    );
  };

  // Select all / Deselect all
  const handleSelectAll = (select: boolean) => {
    setItems(prev =>
      prev.map(i => {
        if (i.selectedIsbn) {
          return { ...i, selectedForUpdate: select };
        }
        return i;
      })
    );
  };

  // User manually chooses one of the candidate books
  const handleSelectCandidate = (bookId: string, candidateIndex: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.bookId !== bookId) return item;
        const candidate = item.candidates[candidateIndex];
        if (!candidate) return item;

        return {
          ...item,
          selectedCandidateIndex: candidateIndex,
          selectedIsbn: candidate.isbn || item.selectedIsbn,
          matchedTitle: candidate.title,
          matchedAuthor: candidate.author,
          matchedPublisher: candidate.publisher,
          matchedPublishedYear: candidate.publishedYear,
          applyPublisher: candidate.publisher,
          applyPublishedYear: candidate.publishedYear,
          selectedForUpdate: Boolean(candidate.isbn)
        };
      })
    );
  };

  // Save / Apply all selected ISBNs to backend
  const handleApplyBatchUpdate = async () => {
    const toUpdate = items.filter(i => i.selectedForUpdate && i.selectedIsbn.trim());
    if (toUpdate.length === 0) {
      onShowToast('一括更新する書籍が選択されていません', 'error');
      return;
    }

    setIsApplying(true);
    try {
      const updatesPayload = toUpdate.map(i => ({
        bookId: i.bookId,
        isbn: i.selectedIsbn.trim(),
        publisher: i.applyPublisher,
        publishedYear: i.applyPublishedYear
      }));

      const res = await fetch('/api/books/batch-update-isbn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: updatesPayload })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'ISBNの一括更新に失敗しました');
      }

      await onRefreshBooks();
      onShowToast(`${toUpdate.length} 冊のISBNを一括修正・保存しました！`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to apply ISBN updates:', err);
      onShowToast(err.message || '一括更新中にエラーが発生しました', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FDFBF7] border border-[#D9C5B2] rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-[#3E362E]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E1D7] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#5D6D5F] text-white flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-serif text-[#3E362E]">
                  タイトル・作者名からISBNをネット検索＆一括修正
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#E7EFE8] text-[#2D5A34] border border-[#C3D5C5]">
                  Google Books & OpenBD連携
                </span>
              </div>
              <p className="text-xs text-[#786C5E] mt-0.5">
                蔵書一覧のタイトルと作者名を照合し、ISBNを自動特定・修正候補から選んで一括更新できます。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A99C8E] hover:text-[#3E362E] p-1.5 rounded-lg hover:bg-[#F7F3EE] transition-colors cursor-pointer"
            title="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar & Filters */}
        <div className="p-3 sm:p-4 bg-[#F7F3EE] border-b border-[#E8E1D7] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          
          {/* Left: Scope selector & search query */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#D9C5B2] bg-white p-0.5">
              <button
                type="button"
                onClick={() => setTargetScope('missing_only')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                  targetScope === 'missing_only'
                    ? 'bg-[#5D6D5F] text-white shadow-xs'
                    : 'text-[#786C5E] hover:text-[#3E362E]'
                }`}
              >
                ISBN未登録のみ ({books.filter(b => !b.isbn).length}冊)
              </button>
              <button
                type="button"
                onClick={() => setTargetScope('all')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                  targetScope === 'all'
                    ? 'bg-[#5D6D5F] text-white shadow-xs'
                    : 'text-[#786C5E] hover:text-[#3E362E]'
                }`}
              >
                全蔵書を対象 ({books.length}冊)
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C7D6F] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchFilterText}
                onChange={e => setSearchFilterText(e.target.value)}
                placeholder="リスト内を絞り込み..."
                className="pl-8 pr-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg text-xs text-[#3E362E] placeholder-[#A99C8E] focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
              />
            </div>
          </div>

          {/* Right: Start lookup action button */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleStartBatchLookup}
              disabled={isSearchingAll || items.length === 0}
              className="px-4 py-2 bg-[#5D6D5F] hover:bg-[#4B594D] text-white font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSearchingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ネット照合中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>タイトル・作者名から一括検索を開始</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress & Stat Notification Banner */}
        {progressText && (
          <div className="px-4 py-2 bg-[#E7EFE8] border-b border-[#C3D5C5] text-xs font-medium text-[#2D5A34] flex items-center space-x-2 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{progressText}</span>
          </div>
        )}

        {/* Summary Chips if searched */}
        {(exactMatchedCount > 0 || candidatesFoundCount > 0 || notFoundCount > 0) && (
          <div className="px-4 py-2 bg-white border-b border-[#E8E1D7] flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-[#786C5E]">検索結果の内訳:</span>
              <span className="inline-flex items-center text-[#2D5A34] bg-[#E7EFE8] px-2 py-0.5 rounded-full font-bold">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                高確度特定: {exactMatchedCount}冊
              </span>
              <span className="inline-flex items-center text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full font-bold">
                <HelpCircle className="w-3 h-3 mr-1" />
                修正候補あり: {candidatesFoundCount}冊
              </span>
              {notFoundCount > 0 && (
                <span className="inline-flex items-center text-[#786C5E] bg-[#F7F3EE] px-2 py-0.5 rounded-full">
                  未検出: {notFoundCount}冊
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="text-[11px] text-[#5D6D5F] hover:underline font-semibold cursor-pointer"
              >
                ISBN検出済みを全選択
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="text-[11px] text-[#786C5E] hover:underline cursor-pointer"
              >
                選択全解除
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Books List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedItems.length === 0 ? (
            <div className="p-12 text-center text-[#786C5E] bg-white rounded-xl border border-[#E8E1D7]">
              <BookOpen className="w-8 h-8 mx-auto text-[#8C7D6F] mb-2" />
              <p className="font-bold text-sm text-[#3E362E]">該当する書籍がありません</p>
              <p className="text-xs mt-1">「全蔵書を対象」に切り替えるか、検索キーワードを変更してください。</p>
            </div>
          ) : (
            displayedItems.map((item, idx) => {
              const hasCandidate = item.candidates && item.candidates.length > 0;
              const isExpanded = expandedCandidateBookId === item.bookId;
              const isEditing = editingBookId === item.bookId;

              return (
                <div
                  key={item.bookId}
                  className={`bg-white rounded-xl border transition-all p-3.5 space-y-2.5 ${
                    item.selectedForUpdate && item.selectedIsbn
                      ? 'border-[#8DA28F] shadow-xs ring-1 ring-[#8DA28F]/40'
                      : 'border-[#E8E1D7]'
                  }`}
                >
                  {/* Top row: Checkbox, Title/Author, Status, ISBN Diff */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    
                    {/* Checkbox & Book Info */}
                    <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selectedForUpdate}
                        disabled={!item.selectedIsbn}
                        onChange={() => handleToggleSelect(item.bookId)}
                        className="mt-0.5 rounded border-[#D9C5B2] text-[#5D6D5F] focus:ring-[#5D6D5F] w-4 h-4 cursor-pointer disabled:opacity-30"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#3E362E] font-serif truncate" title={item.originalTitle}>
                            {item.originalTitle}
                          </span>
                          {item.shelfLocation && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F7F3EE] text-[#786C5E] border border-[#E8E1D7] shrink-0">
                              {item.shelfLocation}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#786C5E] flex items-center space-x-2 mt-0.5">
                          <span>著者: {item.originalAuthor || '不明'}</span>
                          {item.publisher && <span>· {item.publisher}</span>}
                          {item.currentIsbn ? (
                            <span className="font-mono text-[#5D6D5F]">ISBN: {item.currentIsbn}</span>
                          ) : (
                            <span className="text-[#C53030] font-semibold">ISBN: 未登録</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {item.status === 'searching' && (
                        <span className="inline-flex items-center text-[11px] font-semibold text-[#5D6D5F] bg-[#F7F3EE] px-2 py-0.5 rounded-full animate-pulse">
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          検索中
                        </span>
                      )}

                      {item.status === 'exact_matched' && (
                        <span className="inline-flex items-center text-[11px] font-bold text-[#2D5A34] bg-[#E7EFE8] px-2 py-0.5 rounded-full border border-[#C3D5C5]">
                          <Check className="w-3 h-3 mr-1 text-[#2D5A34]" />
                          自動特定
                        </span>
                      )}

                      {item.status === 'candidates_found' && (
                        <span className="inline-flex items-center text-[11px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FCD34D]">
                          <HelpCircle className="w-3 h-3 mr-1" />
                          候補 {item.candidates.length} 件
                        </span>
                      )}

                      {item.status === 'not_found' && (
                        <span className="inline-flex items-center text-[11px] text-[#786C5E] bg-[#F7F3EE] px-2 py-0.5 rounded-full border border-[#E8E1D7]">
                          未検出
                        </span>
                      )}

                      {item.status === 'error' && (
                        <span className="inline-flex items-center text-[11px] text-[#C53030] bg-[#FFF5F5] px-2 py-0.5 rounded-full border border-[#FEB2B2]">
                          エラー
                        </span>
                      )}

                      {/* Manual Keyword Edit Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingBookId(null);
                          } else {
                            setEditingBookId(item.bookId);
                            setEditTitle(item.originalTitle);
                            setEditAuthor(item.originalAuthor);
                          }
                        }}
                        className="p-1 text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE] rounded transition-colors cursor-pointer"
                        title="検索キーワードを手動で微調整して再検索"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ISBN Diff & Selected Value Preview */}
                  {item.selectedIsbn && (
                    <div className="bg-[#F7F3EE] p-2 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 border border-[#E8E1D7]">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-semibold text-[#786C5E]">反映予定ISBN:</span>
                        <span className="font-mono font-bold text-[#2D5A34] text-xs bg-white px-2 py-0.5 rounded border border-[#C3D5C5]">
                          {item.selectedIsbn}
                        </span>
                        {item.matchedPublisher && (
                          <span className="text-[11px] text-[#786C5E]">
                            （{item.matchedPublisher} {item.matchedPublishedYear ? `${item.matchedPublishedYear}年` : ''}）
                          </span>
                        )}
                      </div>

                      {hasCandidate && (
                        <button
                          type="button"
                          onClick={() => setExpandedCandidateBookId(isExpanded ? null : item.bookId)}
                          className="text-[11px] text-[#5D6D5F] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <span>{isExpanded ? '候補を閉じる' : `他の候補を見る (${item.candidates.length}件)`}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* If not matched but candidates exist, guide user to candidates list */}
                  {!item.selectedIsbn && hasCandidate && (
                    <div className="bg-[#FEF3C7]/40 p-2 rounded-lg text-xs flex items-center justify-between border border-[#FCD34D]">
                      <span className="text-[11px] text-[#92400E] font-medium flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#D97706] shrink-0" />
                        タイトル・作者名から完全一致しませんでしたが、{item.candidates.length} 件の修正候補があります。
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedCandidateBookId(isExpanded ? null : item.bookId)}
                        className="px-2.5 py-1 bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-bold rounded-md shadow-2xs flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                      >
                        <span>候補一覧から選択</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  {/* Manual Keyword Editing Form */}
                  {isEditing && (
                    <div className="p-3 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg space-y-2 text-xs animate-fadeIn">
                      <div className="font-semibold text-[#3E362E] text-[11px]">
                        検索キーワードの微調整（サブタイトルや表記ゆれを調整して再検索）:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#786C5E] block mb-0.5">タイトル:</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#786C5E] block mb-0.5">著者名:</label>
                          <input
                            type="text"
                            value={editAuthor}
                            onChange={e => setEditAuthor(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs bg-white border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingBookId(null)}
                          className="px-2.5 py-1 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          disabled={isRowSearching === item.bookId}
                          onClick={() => handleSingleLookup(item.bookId, editTitle, editAuthor)}
                          className="px-3 py-1 bg-[#5D6D5F] hover:bg-[#4B594D] text-white text-xs font-semibold rounded-md shadow-2xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          {isRowSearching === item.bookId ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>再照合中...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-3 h-3" />
                              <span>この本を再検索</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Accordion / Candidate List Display (THE CRITICAL USER FEATURE) */}
                  {isExpanded && hasCandidate && (
                    <div className="border-t border-[#E8E1D7] pt-2.5 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] text-[#786C5E] font-semibold">
                        <span>ネット検索から取得された修正候補一覧（クリックしてISBNを採用）:</span>
                        <span>{item.candidates.length} 件</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                        {item.candidates.map((cand, cIdx) => {
                          const isSelectedCandidate = item.selectedCandidateIndex === cIdx;
                          const hasIsbn = Boolean(cand.isbn);

                          return (
                            <div
                              key={cIdx}
                              onClick={() => {
                                if (hasIsbn) handleSelectCandidate(item.bookId, cIdx);
                              }}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                isSelectedCandidate
                                  ? 'bg-[#E7EFE8] border-[#2D5A34] ring-1 ring-[#2D5A34]'
                                  : 'bg-white hover:bg-[#F7F3EE] border-[#E8E1D7]'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                {cand.coverThumbnail ? (
                                  <img
                                    src={cand.coverThumbnail}
                                    alt={cand.title}
                                    className="w-8 h-11 object-cover rounded shadow-2xs shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-11 bg-[#E8E1D7] rounded flex items-center justify-center text-[#786C5E] shrink-0">
                                    <BookOpen className="w-4 h-4" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[#3E362E] truncate font-serif text-xs">
                                    {cand.title}
                                  </div>
                                  <div className="text-[11px] text-[#786C5E] truncate">
                                    {cand.author || '著者不明'} · {cand.publisher || '出版社不明'}
                                    {cand.publishedYear ? ` (${cand.publishedYear})` : ''}
                                  </div>
                                  <div className="text-[11px] font-mono mt-0.5">
                                    {cand.isbn ? (
                                      <span className="font-semibold text-[#2D5A34]">ISBN: {cand.isbn}</span>
                                    ) : (
                                      <span className="text-[#A99C8E]">ISBN情報なし</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isSelectedCandidate ? (
                                  <span className="px-2.5 py-1 bg-[#2D5A34] text-white text-[10px] font-bold rounded-md flex items-center space-x-1">
                                    <Check className="w-3 h-3" />
                                    <span>選択中</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!hasIsbn}
                                    className="px-2.5 py-1 bg-[#F7F3EE] hover:bg-[#5D6D5F] hover:text-white text-[#3E362E] text-[10px] font-semibold rounded-md border border-[#D9C5B2] transition-colors cursor-pointer disabled:opacity-30"
                                  >
                                    このISBNを採用
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E8E1D7] bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#786C5E]">
            反映対象: <strong className="text-[#3E362E] text-sm">{selectedCount}</strong> 冊を選択中
            {selectedCount > 0 && (
              <span className="ml-2 text-[11px] text-[#5D6D5F]">
                ※ 選択した書籍のISBNおよび出版社・刊行年が一括反映されます
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 text-xs font-semibold text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={handleApplyBatchUpdate}
              disabled={isApplying || selectedCount === 0}
              className="px-5 py-2 bg-[#5D6D5F] hover:bg-[#4B594D] text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>一括反映・保存中...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedCount} 冊のISBNを一括更新する</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
