import React, { useState, useMemo } from 'react';
import { Search, Filter, Grid, List, LayoutGrid, ArrowUpDown, Plus, Camera, Bookmark, BookOpen, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, Globe, Sparkles, RefreshCw } from 'lucide-react';
import { Book, ReadingStatus } from '../types';
import { BookCard } from './BookCard';
import { AuditPromptBanner } from './AuditPromptBanner';
import { BatchIsbnLookupModal } from './BatchIsbnLookupModal';
import { exportBooksToCSV, exportShelfStatsToCSV, calculateShelfAuditStats } from '../utils/csvExport';
import { normalizeHorizontalText } from '../utils/textUtils';

interface LibraryViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenReviewModal: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onToggleOcrFailed?: (book: Book) => void;
  onOpenManualAdd: () => void;
  onNavigateToScan: () => void;
  onRefreshBooks?: () => Promise<void>;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
  readOnly?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  onOpenReviewModal,
  onDeleteBook,
  onToggleOcrFailed,
  onOpenManualAdd,
  onNavigateToScan,
  onRefreshBooks,
  onShowToast,
  readOnly = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedAuditStatus, setSelectedAuditStatus] = useState<string>('all');
  const [selectedIsbnStatus, setSelectedIsbnStatus] = useState<string>('all');
  const [selectedReading, setSelectedReading] = useState<string>('all');
  const [selectedShelf, setSelectedShelf] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'rating_desc' | 'title_asc'>('date_desc');
  const [displayMode, setDisplayMode] = useState<'grid' | 'shelf' | 'table'>('grid');
  const [spineTextOrientation, setSpineTextOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isBatchIsbnModalOpen, setIsBatchIsbnModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    if (!onRefreshBooks) return;
    setIsRefreshing(true);
    try {
      await onRefreshBooks();
      onShowToast?.('最新の共有蔵書データを再取得しました', 'success');
    } catch {
      onShowToast?.('最新データの取得に失敗しました', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Books without ISBN count
  const missingIsbnCount = useMemo(() => {
    return books.filter(b => !b.isbn || b.isbn.trim().length === 0).length;
  }, [books]);

  // Unique genres
  const genres = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => { if (b.genre) set.add(b.genre); });
    return Array.from(set);
  }, [books]);

  // Unique shelves
  const shelfLocations = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => { if (b.shelfLocation) set.add(b.shelfLocation); });
    return Array.from(set);
  }, [books]);

  // Filtered & Sorted books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      // Multi-word Search (Title, Author, Publisher, Shelf, ISBN, Notes)
      if (searchQuery.trim()) {
        const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const matchesSearch = terms.every(term =>
          b.title.toLowerCase().includes(term) ||
          b.author.toLowerCase().includes(term) ||
          (b.publisher || '').toLowerCase().includes(term) ||
          (b.shelfLocation || '').toLowerCase().includes(term) ||
          (b.isbn || '').replace(/[^0-9X]/gi, '').includes(term.replace(/[^0-9X]/gi, '')) ||
          (b.auditNotes || '').toLowerCase().includes(term) ||
          (b.review.comment || '').toLowerCase().includes(term)
        );
        if (!matchesSearch) return false;
      }

      // Genre
      if (selectedGenre !== 'all' && b.genre !== selectedGenre) return false;

      // Audit / OCR Status
      const isFailed = b.isOcrFailed || b.auditStatus === 'ocr_failed' || b.title.includes('OCR読み取り不可');
      if (selectedAuditStatus === 'ocr_failed' && !isFailed) return false;
      if (selectedAuditStatus === 'normal' && isFailed) return false;

      // Reading
      if (selectedReading !== 'all' && b.review.readingStatus !== selectedReading) return false;

      // Shelf
      if (selectedShelf !== 'all' && b.shelfLocation !== selectedShelf) return false;

      // ISBN Status Filter
      const hasIsbn = Boolean(b.isbn && b.isbn.trim().length > 0);
      if (selectedIsbnStatus === 'missing' && hasIsbn) return false;
      if (selectedIsbnStatus === 'has_isbn' && !hasIsbn) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'rating_desc') {
        return (b.review.rating || 0) - (a.review.rating || 0);
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title, 'ja');
      }
      return 0;
    });
  }, [books, searchQuery, selectedGenre, selectedAuditStatus, selectedIsbnStatus, selectedReading, selectedShelf, sortBy]);

  const handleExportCSV = () => {
    exportBooksToCSV(filteredBooks, `本棚蔵書一覧_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportShelfSummary = () => {
    const stats = calculateShelfAuditStats(books);
    exportShelfStatsToCSV(stats);
  };

  return (
    <div className="space-y-5">
      {/* Audit Interval Reminder Banner */}
      <AuditPromptBanner
        books={books}
        onNavigateToScan={onNavigateToScan}
      />

      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-[#E8E1D7] shadow-xs space-y-3">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C7D6F] absolute left-3.5 top-3" />
            <input
              id="library-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タイトルや著者名で書籍を検索・絞り込み（出版社、棚、メモも検索可能）..."
              className="w-full text-xs pl-9 pr-14 py-2.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg text-[#3E362E] focus:bg-white focus:ring-2 focus:ring-[#5D6D5F] focus:border-[#5D6D5F] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-[#8C7D6F] hover:text-[#3E362E] cursor-pointer font-medium"
              >
                クリア
              </button>
            )}
          </div>

          {/* CSV Export, ISBN Batch Lookup & View Mode Buttons */}
          <div className="flex items-center space-x-2 self-end sm:self-center flex-wrap gap-y-1">
            <button
              type="button"
              onClick={() => setIsBatchIsbnModalOpen(true)}
              title="書籍のタイトル・作者名からGoogle Books・OpenBDをネット検索してISBNを一括照合・修正"
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-[#5D6D5F] hover:bg-[#4B594D] shadow-xs transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              <span>ISBNネット検索・一括修正</span>
              {missingIsbnCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-extrabold">
                  未登録 {missingIsbnCount}
                </span>
              )}
            </button>

            {onRefreshBooks && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="全ユーザー共通の最新蔵書データを再同期"
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg text-[#3E4E40] bg-[#EDF2EE] hover:bg-[#DDE6DF] border border-[#CCDACC] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 text-[#5D6D5F] ${isRefreshing ? 'animate-spin' : ''}`} />
                共有同期
              </button>
            )}

            <button
              id="library-csv-export-btn"
              type="button"
              onClick={handleExportCSV}
              title="絞り込み結果の書籍・本棚一覧をCSVエクスポート"
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg text-[#3E362E] bg-[#F7F3EE] hover:bg-[#EAE4DB] border border-[#D9C5B2] transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-[#5D6D5F]" />
              CSV出力
            </button>

            <div className="flex items-center bg-[#F7F3EE] p-1 rounded-lg border border-[#E8E1D7]">
              <button
                type="button"
                onClick={() => setDisplayMode('grid')}
                title="カードグリッド表示"
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  displayMode === 'grid' ? 'bg-white text-[#3E362E] shadow-xs font-semibold' : 'text-[#786C5E] hover:text-[#3E362E]'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('shelf')}
                title="本棚ビジュアル表示"
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  displayMode === 'shelf' ? 'bg-white text-[#3E362E] shadow-xs font-semibold' : 'text-[#786C5E] hover:text-[#3E362E]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                title="リスト表形式表示"
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  displayMode === 'table' ? 'bg-white text-[#3E362E] shadow-xs font-semibold' : 'text-[#786C5E] hover:text-[#3E362E]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter chips & dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EFE9E0] text-xs">
          {/* Audit / OCR status selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[#786C5E] text-[11px] font-semibold">点検状態:</span>
            <select
              value={selectedAuditStatus}
              onChange={(e) => setSelectedAuditStatus(e.target.value)}
              className="text-xs px-2.5 py-1 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F] cursor-pointer font-medium"
            >
              <option value="all">すべて ({books.length})</option>
              <option value="normal">正常読取のみ ({books.filter(b => !b.isOcrFailed && !b.title.includes('OCR読み取り不可')).length})</option>
              <option value="ocr_failed">⚠️ OCR読み取り不可のみ ({books.filter(b => b.isOcrFailed || b.title.includes('OCR読み取り不可')).length})</option>
            </select>
          </div>

          {/* ISBN status selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[#786C5E] text-[11px] font-semibold">ISBN登録:</span>
            <select
              value={selectedIsbnStatus}
              onChange={(e) => setSelectedIsbnStatus(e.target.value)}
              className="text-xs px-2.5 py-1 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F] cursor-pointer font-medium"
            >
              <option value="all">すべて ({books.length})</option>
              <option value="missing">未登録のみ ({missingIsbnCount})</option>
              <option value="has_isbn">登録済のみ ({books.length - missingIsbnCount})</option>
            </select>
          </div>

          {/* Genre selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[#786C5E] text-[11px]">ジャンル:</span>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="text-xs px-2.5 py-1 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F] cursor-pointer"
            >
              <option value="all">すべて</option>
              {genres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Shelf location */}
          {shelfLocations.length > 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-[#786C5E] text-[11px]">本棚:</span>
              <select
                value={selectedShelf}
                onChange={(e) => setSelectedShelf(e.target.value)}
                className="text-xs px-2.5 py-1 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F] cursor-pointer"
              >
                <option value="all">すべての棚</option>
                {shelfLocations.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reading status selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[#786C5E] text-[11px]">読書状況:</span>
            <select
              value={selectedReading}
              onChange={(e) => setSelectedReading(e.target.value)}
              className="text-xs px-2.5 py-1 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F] cursor-pointer"
            >
              <option value="all">すべて</option>
              <option value="unread">未読</option>
              <option value="reading">読書中</option>
              <option value="completed">読了</option>
              <option value="tsundoku">積読</option>
            </select>
          </div>

          {/* Sort order */}
          <div className="flex items-center space-x-1 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8C7D6F]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2 py-1 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-md focus:outline-none focus:ring-1 focus:ring-[#5D6D5F] cursor-pointer"
            >
              <option value="date_desc">新着登録順</option>
              <option value="date_asc">古い順</option>
              <option value="rating_desc">評価の高い順</option>
              <option value="title_asc">五十音順 (タイトル)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Result Counter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#786C5E] px-1">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span>
            表示中: <strong className="text-[#3E362E]">{filteredBooks.length}</strong> / 全 {books.length} 冊
          </span>
          {searchQuery && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EFE9E0] text-[#3E362E] border border-[#D9C5B2]">
              検索: 「{searchQuery}」
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="ml-1 text-[#8C7D6F] hover:text-[#3E362E] cursor-pointer font-bold"
                title="検索をクリア"
              >
                ×
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenManualAdd}
            className="text-[#5D6D5F] hover:text-[#455347] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>手動追加</span>
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onNavigateToScan}
            className="text-[#5D6D5F] hover:text-[#455347] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>本棚写真からスキャン</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredBooks.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-[#E8E1D7] p-12 text-center text-[#786C5E] space-y-4">
          <div className="w-14 h-14 bg-[#F7F3EE] rounded-2xl flex items-center justify-center mx-auto text-[#786C5E]">
            <BookOpen className="w-7 h-7 text-[#5D6D5F]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#3E362E] font-serif">
              該当する書籍が見つかりませんでした
            </h3>
            <p className="text-xs text-[#786C5E] mt-1">
              {searchQuery ? `「${searchQuery}」に一致する書籍はありませんでした。タイトルや著者名をご確認ください。` : '検索語句やフィルター条件を変更するか、新しい書籍を登録してください。'}
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2 flex-wrap gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[#5D6D5F] hover:bg-[#4B594D] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                検索ワードをクリア
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateToScan}
              className="px-4 py-2 bg-[#F7F3EE] hover:bg-[#EAE4DB] text-[#3E362E] text-xs font-semibold rounded-lg border border-[#E8E1D7] flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Camera className="w-4 h-4 text-[#5D6D5F]" />
              <span>本棚写真をスキャンする</span>
            </button>
            <button
              type="button"
              onClick={onOpenManualAdd}
              className="px-4 py-2 bg-[#F7F3EE] hover:bg-[#EAE4DB] text-[#3E362E] text-xs font-semibold rounded-lg border border-[#E8E1D7] cursor-pointer transition-colors"
            >
              手動で書籍を登録
            </button>
          </div>
        </div>
      ) : displayMode === 'grid' ? (
        /* Grid Display */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBooks.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              onOpenReviewModal={onOpenReviewModal}
              onDeleteBook={onDeleteBook}
              onToggleOcrFailed={onToggleOcrFailed}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : displayMode === 'shelf' ? (
        /* Visual Bookshelf Display (Spines Standing on Wood Shelves) */
        <div className="bg-[#F7F3EE] rounded-2xl border border-[#D9C5B2] p-6 shadow-xs space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D9C5B2]">
            <h3 className="text-xs font-bold text-[#3E362E] font-serif tracking-wider uppercase flex items-center space-x-1.5">
              <span>◆ 本棚ビジュアルビュー（背表紙一覧） ◆</span>
            </h3>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 bg-white px-2 py-0.5 rounded-md border border-[#D9C5B2] shadow-2xs">
                <span className="text-[#786C5E] text-[11px]">背表紙文字:</span>
                <button
                  type="button"
                  onClick={() => setSpineTextOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                  className="text-[11px] font-bold text-[#5D6D5F] hover:text-[#3E362E] cursor-pointer"
                  title="文字の向き（横書き/縦書き）を切り替えます"
                >
                  {spineTextOrientation === 'horizontal' ? '横書き (標準)' : '縦書き'}
                </button>
              </div>
              <span className="text-xs text-[#786C5E] hidden sm:inline">本をクリックすると詳細が開きます</span>
            </div>
          </div>

          {/* Group books in rows of ~8-10 for shelf representation */}
          <div className="space-y-10">
            {Array.from({ length: Math.ceil(filteredBooks.length / 10) }).map((_, rowIndex) => {
              const rowBooks = filteredBooks.slice(rowIndex * 10, (rowIndex + 1) * 10);
              return (
                <div key={rowIndex} className="relative">
                  {/* Shelf Books Container */}
                  <div className="flex items-end justify-start space-x-1.5 px-4 h-64 overflow-x-auto pb-1">
                    {rowBooks.map((book, bIdx) => {
                      const isFailed = book.isOcrFailed || book.auditStatus === 'ocr_failed' || book.title.includes('OCR読み取り不可');
                      const spineHeight = 180 + ((bIdx * 17) % 50); // Natural varied height
                      const spineWidth = spineTextOrientation === 'horizontal' ? 44 + ((bIdx * 6) % 16) : 36 + ((bIdx * 7) % 18);
                      const cleanTitle = normalizeHorizontalText(book.title);

                      return (
                        <div
                          key={book.id}
                          onClick={() => onSelectBook(book)}
                          style={{
                            backgroundColor: isFailed ? '#92400E' : (book.spineColor || '#5D6D5F'),
                            height: `${spineHeight}px`,
                            width: `${spineWidth}px`,
                          }}
                          className={`relative rounded-t-xs rounded-b-[1px] shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-200 cursor-pointer flex flex-col justify-between py-3 px-1 border-t border-r border-l border-black/20 shrink-0 select-none group ${
                            isFailed ? 'ring-2 ring-[#FCD34D]' : ''
                          }`}
                          title={`${cleanTitle} / ${book.author}${isFailed ? ' (⚠️ OCR読み取り不可: 要現物確認)' : ''}`}
                        >
                          {/* Spine top embossed line */}
                          <div className="w-full h-1 bg-white/20 rounded-xs" />

                          {/* Title text (Horizontal by default, or Vertical) */}
                          <div className="flex-1 flex items-center justify-center overflow-hidden py-1 relative">
                            {spineTextOrientation === 'horizontal' ? (
                              <span
                                className="text-white font-bold text-[10px] font-sans tracking-normal leading-tight -rotate-90 whitespace-nowrap select-none max-w-[150px] truncate block text-center"
                                style={{ writingMode: 'horizontal-tb' }}
                              >
                                {cleanTitle}
                              </span>
                            ) : (
                              <span
                                className="text-white font-bold text-[11px] font-serif tracking-tight leading-tight writing-vertical select-none"
                                style={{ writingMode: 'vertical-rl' }}
                              >
                                {cleanTitle}
                              </span>
                            )}
                          </div>

                          {/* Spine bottom warning icon or tag */}
                          <div className="flex flex-col items-center space-y-1">
                            {isFailed && (
                              <span className="w-3 h-3 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center justify-center text-[9px] font-bold" title="OCR読み取り不可">
                                !
                              </span>
                            )}
                            <div className="w-full h-1 bg-black/20 rounded-xs" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Natural Wood Plank Shelf Bottom */}
                  <div className="w-full h-5 bg-gradient-to-r from-[#6B4E3D] via-[#85634E] to-[#5D4233] rounded-xs shadow-md border-t border-[#A88267]/40 relative">
                    <div className="w-full h-1.5 bg-[#3B291E]/30 absolute bottom-0" />
                  </div>
                  <div className="w-full h-2 bg-black/5 blur-[2px]" />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table Display */
        <div className="bg-white rounded-xl border border-[#E8E1D7] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-[#E8E1D7]">
              <thead className="bg-[#F7F3EE] text-[#6E5F52] font-bold uppercase text-[10px] tracking-wider font-serif">
                <tr>
                  <th className="py-3 px-4">書籍名</th>
                  <th className="py-3 px-4">著者</th>
                  <th className="py-3 px-4">ジャンル</th>
                  <th className="py-3 px-4">本棚配置</th>
                  <th className="py-3 px-4">ISBN</th>
                  <th className="py-3 px-4">点検状態</th>
                  <th className="py-3 px-4">点検メモ</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1] text-[#3E362E]">
                {filteredBooks.map(book => {
                  const isFailed = book.isOcrFailed || book.auditStatus === 'ocr_failed' || book.title.includes('OCR読み取り不可');
                  const hasIsbn = Boolean(book.isbn && book.isbn.trim().length > 0);

                  return (
                    <tr key={book.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5 min-w-[200px]">
                          <div
                            className="w-2 h-7 rounded-xs shrink-0"
                            style={{ backgroundColor: book.spineColor || '#5D6D5F' }}
                          />
                          <button
                            type="button"
                            onClick={() => onSelectBook(book)}
                            className={`font-bold font-serif hover:underline text-left line-clamp-1 cursor-pointer transition-colors ${
                              isFailed ? 'text-[#92400E]' : 'text-[#3E362E]'
                            }`}
                          >
                            {book.title}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#786C5E]">
                        {book.author}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#F7F3EE] text-[#6E5F52] text-[10px] font-medium border border-[#E8E1D7]">
                          {book.genre}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#786C5E] font-medium">
                        {book.shelfLocation || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasIsbn ? (
                          <span className="font-mono text-[11px] font-semibold text-[#2D5A34] bg-[#E7EFE8] px-2 py-0.5 rounded border border-[#C3D5C5]">
                            {book.isbn}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FCD34D]">
                            未登録
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isFailed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                            <AlertTriangle className="w-3 h-3 mr-1 text-[#D97706]" />
                            OCR読み取り不可
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[#2D5A34] bg-[#E7EFE8] border border-[#C3D5C5] px-2 py-0.5 rounded text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-[#5D6D5F]" />
                            正常
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#786C5E] text-[11px] max-w-[200px] truncate">
                        {book.auditNotes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {readOnly ? (
                          <button
                            type="button"
                            onClick={() => onSelectBook(book)}
                            className="px-2.5 py-1 bg-[#F0F4F8] text-[#32526E] hover:bg-[#E2ECF5] border border-[#C9D7E3] rounded text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            詳細閲覧
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery(book.title);
                                setIsBatchIsbnModalOpen(true);
                              }}
                              className="px-2 py-0.5 bg-[#E7EFE8] text-[#2D5A34] hover:bg-[#C3D5C5] rounded text-[11px] font-semibold cursor-pointer transition-colors"
                              title="この書籍のISBNをWebから照合"
                            >
                              ISBN照合
                            </button>
                            {onToggleOcrFailed && (
                              <button
                                type="button"
                                onClick={() => onToggleOcrFailed(book)}
                                className="px-2 py-0.5 bg-[#F7F3EE] text-[#6E5F52] hover:bg-[#EAE4DB] rounded text-[11px] font-medium cursor-pointer transition-colors"
                              >
                                {isFailed ? '正常に戻す' : '不可にする'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenReviewModal(book)}
                              className="px-2 py-0.5 bg-[#FAF2EB] text-[#8C5832] hover:bg-[#F3E3D5] rounded text-[11px] font-medium cursor-pointer transition-colors"
                            >
                              メモ
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectBook(book)}
                              className="px-2 py-0.5 bg-[#EDF2EE] text-[#38483B] hover:bg-[#DCE7DF] rounded text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              現物補正
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch ISBN Lookup & Correction Modal */}
      {isBatchIsbnModalOpen && onRefreshBooks && (
        <BatchIsbnLookupModal
          isOpen={isBatchIsbnModalOpen}
          onClose={() => setIsBatchIsbnModalOpen(false)}
          books={books}
          onRefreshBooks={onRefreshBooks}
          onShowToast={onShowToast || (() => {})}
        />
      )}
    </div>
  );
};
