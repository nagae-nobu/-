import React, { useState } from 'react';
import { X, Bookmark, Edit3, Check, Trash2, MessageSquare, Copy, ExternalLink, ClipboardCheck, AlertTriangle, CheckCircle2, Search, Wand2 } from 'lucide-react';
import { Book, ReadingStatus, AuditStatus, BookLookupResult } from '../types';
import { BookLookupModal } from './BookLookupModal';
import { normalizeHorizontalText } from '../utils/textUtils';

interface BookDetailModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  onDeleteBook: (id: string) => void;
  onOpenReviewModal: (book: Book) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  onUpdateBook,
  onDeleteBook,
  onOpenReviewModal,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'audit' | 'review'>('info');
  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedIsbn, setCopiedIsbn] = useState<boolean>(false);

  // Editable basic info
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [publisher, setPublisher] = useState(book.publisher || '');
  const [publishedYear, setPublishedYear] = useState(book.publishedYear || '');
  const [isbn, setIsbn] = useState(book.isbn || '');
  const [genre, setGenre] = useState(book.genre);
  const [shelfLocation, setShelfLocation] = useState(book.shelfLocation || '');
  const [spineColor, setSpineColor] = useState(book.spineColor || '#5D6D5F');
  const [summary, setSummary] = useState(book.summary || '');

  // Editable audit info
  const isFailed = book.isOcrFailed || book.auditStatus === 'ocr_failed' || book.title.includes('OCR読み取り不可');
  const [isOcrFailedState, setIsOcrFailedState] = useState<boolean>(isFailed);
  const [auditNotes, setAuditNotes] = useState<string>(book.auditNotes || '');

  // Book API Lookup Modal State
  const [isLookupOpen, setIsLookupOpen] = useState<boolean>(false);

  const handleApplyLookupResult = (res: BookLookupResult) => {
    if (res.title) setTitle(res.title);
    if (res.author) setAuthor(res.author);
    if (res.publisher) setPublisher(res.publisher);
    if (res.publishedYear) setPublishedYear(res.publishedYear);
    if (res.isbn) setIsbn(res.isbn);
    if (res.description) setSummary(res.description);
    if (res.genre) setGenre(res.genre);
    // If it was OCR failed, automatically resolve it
    if (isOcrFailedState) {
      setIsOcrFailedState(false);
      setAuditNotes(prev => prev ? `${prev} (外部API照合完了)` : '外部API照合完了');
    }
  };

  const handleCopyIsbn = () => {
    if (!book.isbn) return;
    navigator.clipboard.writeText(book.isbn);
    setCopiedIsbn(true);
    setTimeout(() => setCopiedIsbn(false), 2000);
  };

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      const newTitle = title.trim();
      const newAuthor = author.trim();

      // If user corrected the title from an OCR result, save to knowledge base
      if (book.title && newTitle && book.title !== newTitle) {
        fetch('/api/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalTitle: book.title,
            correctedTitle: newTitle,
            originalAuthor: book.author || '',
            correctedAuthor: newAuthor,
            isbn: isbn.trim() || undefined,
            source: 'manual'
          })
        }).catch(e => console.warn("Failed to save correction log:", e));
      }

      await onUpdateBook(book.id, {
        title: newTitle,
        author: newAuthor,
        publisher: publisher.trim(),
        publishedYear: publishedYear.trim(),
        isbn: isbn.trim(),
        genre: genre.trim(),
        shelfLocation: shelfLocation.trim(),
        spineColor,
        summary: summary.trim(),
        isOcrFailed: isOcrFailedState,
        auditStatus: isOcrFailedState ? 'ocr_failed' : 'normal',
        auditNotes: auditNotes.trim()
      });
      setIsEditingInfo(false);
    } catch (err) {
      console.error("Failed to update book info:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAudit = async () => {
    setIsSaving(true);
    try {
      await onUpdateBook(book.id, {
        isOcrFailed: isOcrFailedState,
        auditStatus: isOcrFailedState ? 'ocr_failed' : 'normal',
        auditNotes: auditNotes.trim(),
      });
    } catch (err) {
      console.error("Failed to update audit info:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const readingStatusLabels: Record<ReadingStatus, string> = {
    unread: '未読',
    reading: '読書中',
    completed: '読了',
    tsundoku: '積読',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E362E]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E1D7] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Ribbon */}
        <div
          className="h-2 w-full"
          style={{ backgroundColor: spineColor }}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#EFE9E0]">
          <div className="flex items-start space-x-3.5 min-w-0 pr-4">
            <div
              className="w-4 h-16 rounded-xs shrink-0 shadow-xs border border-black/10 mt-1"
              style={{ backgroundColor: spineColor }}
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7F3EE] text-[#6E5F52] border border-[#E8E1D7] uppercase tracking-wide">
                  {genre}
                </span>
                {isFailed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                    ⚠️ OCR読み取り不可
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#3E362E] font-serif mt-1 line-clamp-2 leading-snug break-words" style={{ writingMode: 'horizontal-tb' }}>
                {normalizeHorizontalText(title)}
              </h2>
              <p className="text-xs text-[#786C5E] mt-0.5 break-words" style={{ writingMode: 'horizontal-tb' }}>
                {normalizeHorizontalText(author)} {publisher ? `· ${normalizeHorizontalText(publisher)}` : ''}
              </p>

              {/* ISBN & Meta Pill */}
              {(book.isbn || book.publishedYear) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {book.isbn && (
                    <div className="inline-flex items-center bg-[#F7F3EE] border border-[#E8E1D7] rounded-md px-2 py-0.5 text-xs text-[#524436]">
                      <span className="font-mono text-[11px] mr-1.5">ISBN: {book.isbn}</span>
                      <button
                        type="button"
                        onClick={handleCopyIsbn}
                        className="text-[#8C7355] hover:text-[#3E362E] p-0.5 rounded hover:bg-[#EFE9E0] transition-colors"
                        title="ISBNをコピー"
                      >
                        {copiedIsbn ? (
                          <Check className="w-3 h-3 text-[#5D6D5F]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <a
                        href={`https://iss.ndl.go.jp/books?op_id=1&any=${encodeURIComponent(book.isbn)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8C7355] hover:text-[#3E362E] p-0.5 rounded hover:bg-[#EFE9E0] transition-colors ml-0.5"
                        title="国立国会図書館で検索"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {book.publishedYear && (
                    <span className="text-[11px] text-[#8C7355] bg-[#F7F3EE] border border-[#E8E1D7] px-2 py-0.5 rounded-md">
                      {book.publishedYear}年 刊行
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A99C8E] hover:text-[#3E362E] rounded-lg hover:bg-[#F7F3EE] cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs within Modal */}
        <div className="flex border-b border-[#E8E1D7] bg-[#F7F3EE] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'info'
                ? 'border-[#5D6D5F] text-[#3E362E] bg-white'
                : 'border-transparent text-[#786C5E] hover:text-[#3E362E]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>基本情報・配置</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'audit'
                ? 'border-[#5D6D5F] text-[#3E362E] bg-white'
                : 'border-transparent text-[#786C5E] hover:text-[#3E362E]'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>蔵書点検・現物補正</span>
            {isFailed && (
              <span className="w-2 h-2 rounded-full bg-[#D97706] ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'review'
                ? 'border-[#5D6D5F] text-[#3E362E] bg-white'
                : 'border-transparent text-[#786C5E] hover:text-[#3E362E]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>読書メモ・感想</span>
            {book.review.rating > 0 && (
              <span className="text-[#C48E59] font-bold ml-1">★{book.review.rating}</span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: BASIC INFO */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* OCR Failed Banner if applicable */}
              {isFailed && (
                <div className="p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#92400E]">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#B45309]" />
                    <span>背表紙の文字が不鮮明なため「OCR読み取り不可」として記録されています。</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingInfo(true);
                      setIsLookupOpen(true);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-[#FFFBEB] border border-[#F59E0B] text-[#92400E] font-bold rounded-md shadow-2xs shrink-0 flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
                  >
                    <Search className="w-3 h-3 text-[#D97706]" />
                    <span>外部APIで書誌照合・補正</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-[#EFE9E0]">
                <span className="text-xs font-bold text-[#524436] font-serif">書籍メタデータ</span>
                {isEditingInfo ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsLookupOpen(true)}
                      className="text-xs px-2.5 py-1 bg-[#EDF2EE] hover:bg-[#DDE7DE] text-[#334A36] border border-[#C3D5C5] rounded-md font-bold flex items-center space-x-1 cursor-pointer"
                      title="Google Books / OpenBDから書誌情報を検索・自動補正"
                    >
                      <Search className="w-3 h-3 text-[#5D6D5F]" />
                      <span>外部API照合</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(false)}
                      className="text-xs text-[#786C5E] hover:text-[#3E362E] px-2 py-1 cursor-pointer"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInfo}
                      disabled={isSaving}
                      className="px-3 py-1 bg-[#5D6D5F] hover:bg-[#4D5C4F] text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      <span>{isSaving ? '保存中...' : '保存'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="text-xs text-[#5D6D5F] hover:text-[#4B594D] font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>情報を編集</span>
                  </button>
                )}
              </div>

              {isEditingInfo ? (
                /* Edit Form */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">タイトル *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">著者名 *</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">ジャンル</label>
                    <input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">出版社</label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">出版年</label>
                    <input
                      type="text"
                      value={publishedYear}
                      onChange={(e) => setPublishedYear(e.target.value)}
                      placeholder="2024"
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">ISBN</label>
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="978-4-..."
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">本棚の配置場所</label>
                    <input
                      type="text"
                      value={shelfLocation}
                      onChange={(e) => setShelfLocation(e.target.value)}
                      placeholder="例: メイン本棚 上段"
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[#786C5E] mb-1">あらすじ・メモ</label>
                    <textarea
                      rows={3}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                    />
                  </div>
                </div>
              ) : (
                /* Readonly Meta Grid */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F3EE] p-4 rounded-xl border border-[#E8E1D7]">
                    <div>
                      <span className="text-[#786C5E] text-[11px]">本棚・配架場所:</span>
                      <p className="font-bold text-[#3E362E] mt-0.5">{shelfLocation || '未設定'}</p>
                    </div>
                    <div>
                      <span className="text-[#786C5E] text-[11px]">登録方法:</span>
                      <p className="font-bold text-[#3E362E] mt-0.5">
                        {book.registeredVia === 'scan' ? '📷 写真点検スキャン' : '✍️ 手動登録'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#786C5E] text-[11px]">ジャンル:</span>
                      <p className="font-bold text-[#3E362E] mt-0.5">{genre}</p>
                    </div>
                    <div>
                      <span className="text-[#786C5E] text-[11px]">出版社:</span>
                      <p className="font-bold text-[#3E362E] mt-0.5">{publisher || '記載なし'}</p>
                    </div>
                    <div>
                      <span className="text-[#786C5E] text-[11px]">出版年:</span>
                      <p className="font-bold text-[#3E362E] mt-0.5">{publishedYear ? `${publishedYear}年` : '不明'}</p>
                    </div>
                    <div>
                      <span className="text-[#786C5E] text-[11px]">登録日:</span>
                      <p className="font-bold text-[#3E362E] mt-0.5">
                        {new Date(book.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>

                  {summary && (
                    <div className="bg-white p-3.5 rounded-xl border border-[#E8E1D7]">
                      <h4 className="text-xs font-bold text-[#524436] font-serif mb-1">概要・あらすじ</h4>
                      <p className="text-xs text-[#786C5E] leading-relaxed whitespace-pre-wrap">{summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIT & CORRECTION */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isOcrFailedState
                  ? 'bg-[#FFFBEB] border-[#FCD34D]'
                  : 'bg-[#EDF2EE] border-[#D0DDD2]'
              }`}>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                      isOcrFailedState
                        ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]'
                        : 'bg-[#E7EFE8] text-[#2D5A34] border border-[#C3D5C5]'
                    }`}>
                      {isOcrFailedState ? '⚠️ OCR読み取り不可 (要現物確認)' : '✓ 蔵書点検 正常'}
                    </span>
                  </div>
                  <p className="text-xs text-[#786C5E] mt-1.5">
                    {isOcrFailedState 
                      ? '背表紙かすれ・文字消失・極細本等で読み取れなかった書籍です。現物と照合してタイトルを補正してください。'
                      : '正常にタイトル・著者が認識され、配架が確認された書籍です。'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOcrFailedState(!isOcrFailedState)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                    isOcrFailedState
                      ? 'bg-[#5D6D5F] hover:bg-[#4D5C4F] text-white shadow-xs'
                      : 'bg-[#FFFBEB] text-[#92400E] border border-[#FCD34D] hover:bg-[#FEF3C7]'
                  }`}
                >
                  {isOcrFailedState ? '正常読取に切替' : 'OCR不可としてマーク'}
                </button>
              </div>

              {/* Audit Notes Form */}
              <div className="bg-[#F7F3EE] p-4 rounded-xl border border-[#E8E1D7] space-y-3">
                <h4 className="text-xs font-bold text-[#3E362E] font-serif">点検記録・現物確認メモ</h4>
                <div>
                  <label className="block text-[11px] font-medium text-[#786C5E] mb-1">
                    点検メモ・状態
                  </label>
                  <input
                    type="text"
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="例: 背表紙日焼け、目視で『夏目漱石全集 第2巻』と確認"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveAudit}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#5D6D5F] hover:bg-[#4D5C4F] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? '保存中...' : '点検ステータスを保存'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW & MEMO */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFE9E0]">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#524436] font-serif">読書状況:</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F7F3EE] text-[#6E5F52] border border-[#E8E1D7]">
                    {readingStatusLabels[book.review.readingStatus] || '未読'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenReviewModal(book)}
                  className="text-xs text-[#5D6D5F] hover:text-[#4B594D] font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>感想・評価を編集</span>
                </button>
              </div>

              {/* Review Comment */}
              <div className="bg-[#F7F3EE] p-4 rounded-xl border border-[#E8E1D7]">
                <h4 className="text-xs font-bold text-[#524436] font-serif mb-1.5">感想・書評</h4>
                {book.review.comment ? (
                  <p className="text-xs text-[#3E362E] whitespace-pre-wrap leading-relaxed font-serif">
                    {book.review.comment}
                  </p>
                ) : (
                  <p className="text-xs text-[#786C5E] italic">
                    まだ感想は記録されていません。
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 bg-[#F7F3EE] border-t border-[#EFE9E0] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`「${book.title}」をデータベースから削除してもよろしいですか？`)) {
                onDeleteBook(book.id);
                onClose();
              }
            }}
            className="text-xs text-[#9A392F] hover:text-[#7F2F26] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>書籍を削除</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#EAE4DB] hover:bg-[#DFD7CD] text-[#3E362E] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* External Book API Lookup Modal */}
      <BookLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        initialQuery={title}
        initialAuthor={author}
        initialIsbn={isbn}
        onApply={handleApplyLookupResult}
      />
    </div>
  );
};
