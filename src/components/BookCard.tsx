import React from 'react';
import { Star, AlertTriangle, CheckCircle2, MessageSquare, Edit3, Trash2, Bookmark, Eye } from 'lucide-react';
import { Book, ReadingStatus } from '../types';
import { normalizeHorizontalText } from '../utils/textUtils';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onOpenReviewModal: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onToggleOcrFailed?: (book: Book) => void;
  readOnly?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onOpenReviewModal,
  onDeleteBook,
  onToggleOcrFailed,
  readOnly = false
}) => {
  const isOcrFailed = book.isOcrFailed || book.auditStatus === 'ocr_failed' || book.title.includes('OCR読み取り不可');
  const cleanTitle = normalizeHorizontalText(book.title);
  const cleanAuthor = normalizeHorizontalText(book.author);
  const cleanPublisher = normalizeHorizontalText(book.publisher);

  const readingStatusMap: Record<ReadingStatus, { label: string; color: string; bg: string }> = {
    unread: { label: '未読', color: 'text-[#6E5F52]', bg: 'bg-[#F7F3EE] border-[#E8E1D7]' },
    reading: { label: '読書中', color: 'text-[#3E4E40]', bg: 'bg-[#EDF2EE] border-[#D0DCD2]' },
    completed: { label: '読了', color: 'text-[#334A36]', bg: 'bg-[#E7EFE8] border-[#C3D5C5]' },
    tsundoku: { label: '積読', color: 'text-[#7D533A]', bg: 'bg-[#FAF0EA] border-[#EAD7CB]' },
  };

  const statusInfo = readingStatusMap[book.review.readingStatus] || readingStatusMap.unread;

  return (
    <div className={`bg-white rounded-xl border shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
      isOcrFailed ? 'border-[#FCD34D] hover:border-[#F59E0B]' : 'border-[#E8E1D7] hover:border-[#D9C5B2]'
    }`}>
      {/* Top Banner / Spine Color Bar */}
      <div className="flex items-stretch border-b border-[#EFE9E0]">
        {/* Book Spine strip */}
        <div
          className="w-3 shrink-0"
          style={{ backgroundColor: book.spineColor || '#5D6D5F' }}
          title={`背表紙色: ${book.spineColor}`}
        />

        {/* Header content */}
        <div className="flex-1 p-3.5 pb-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F7F3EE] text-[#6E5F52] border border-[#E8E1D7]">
              {book.genre}
            </span>
            <div className="flex items-center space-x-1">
              {isOcrFailed ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                  ⚠️ OCR不可
                </span>
              ) : (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusInfo.bg} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* Book Title */}
          <h3
            onClick={() => onSelect(book)}
            className={`text-sm font-bold font-serif mt-2 line-clamp-2 cursor-pointer transition-colors leading-snug break-words ${
              isOcrFailed ? 'text-[#92400E] hover:text-[#B45309]' : 'text-[#3E362E] hover:text-[#5D6D5F]'
            }`}
            style={{ writingMode: 'horizontal-tb' }}
            title={cleanTitle}
          >
            {cleanTitle}
          </h3>

          {/* Author & Publisher */}
          <p className="text-xs text-[#786C5E] mt-1 line-clamp-1 break-words" style={{ writingMode: 'horizontal-tb' }}>
            {cleanAuthor} {cleanPublisher ? `· ${cleanPublisher}` : ''}
          </p>

          {/* ISBN & Year Badge */}
          {(book.isbn || book.publishedYear) && (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#786C5E]">
              {book.isbn && (
                <span className="font-mono bg-[#F7F3EE] px-1.5 py-0.2 rounded border border-[#E8E1D7]" title={`ISBN: ${book.isbn}`}>
                  ISBN: {book.isbn.length > 17 ? `${book.isbn.substring(0, 16)}…` : book.isbn}
                </span>
              )}
              {book.publishedYear && (
                <span className="text-[#8C7355]">{book.publishedYear}年</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle Body: Shelf Location & Review Snippet */}
      <div className="px-4 py-2.5 space-y-2 flex-1">
        {/* Location tag */}
        {book.shelfLocation && (
          <div className="flex items-center text-[11px] text-[#786C5E]">
            <Bookmark className="w-3 h-3 mr-1 text-[#A99C8E]" />
            <span className="truncate font-medium">{book.shelfLocation}</span>
          </div>
        )}

        {/* Audit Note or Summary */}
        {isOcrFailed ? (
          <div className="p-2 rounded bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E]">
            <p className="font-medium text-[11px]">
              要現物確認: {book.auditNotes || '背表紙文字不鮮明・手動補正推奨'}
            </p>
          </div>
        ) : book.review.comment ? (
          <p className="text-xs text-[#524436] bg-[#F7F3EE] p-2 rounded-md line-clamp-2 border border-[#E8E1D7] italic font-serif">
            "{book.review.comment}"
          </p>
        ) : book.summary ? (
          <p className="text-[11px] text-[#8C7D6F] line-clamp-2">
            {book.summary}
          </p>
        ) : null}

        {/* Rating & Review */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center space-x-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= (book.review.rating || 0)
                    ? 'text-[#C48E59] fill-[#C48E59]'
                    : 'text-[#E0D7CC]'
                }`}
              />
            ))}
            {book.review.rating > 0 && (
              <span className="text-[11px] font-bold text-[#3E362E] ml-1">
                {book.review.rating}.0
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenReviewModal(book)}
            className="text-[11px] text-[#786C5E] hover:text-[#5D6D5F] flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            <span>{book.review.comment ? '感想あり' : '感想を書く'}</span>
          </button>
        </div>
      </div>

      {/* Inventory Audit Status Footer */}
      <div className="px-4 py-2.5 bg-[#FDFBF7] border-t border-[#EFE9E0] flex flex-col gap-2">
        {/* Status Indicator */}
        <div className="flex items-center justify-between">
          {isOcrFailed ? (
            <div className="flex items-center space-x-1.5 text-xs font-semibold px-2 py-0.5 rounded-md border bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="truncate max-w-[140px]">
                OCR読み取り不可
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-xs font-medium text-[#273B2A] bg-[#E7EFE8] border border-[#C3D5C5] px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5D6D5F]" />
              <span>点検読取 正常</span>
            </div>
          )}

          {!readOnly && onToggleOcrFailed && (
            <button
              type="button"
              onClick={() => onToggleOcrFailed(book)}
              title={isOcrFailed ? "正常読取に切替" : "OCR不可としてマーク"}
              className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors cursor-pointer ${
                isOcrFailed
                  ? 'bg-[#EAE4DB] text-[#3E362E] hover:bg-[#DCD4C9]'
                  : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] hover:bg-[#FEF3C7]'
              }`}
            >
              {isOcrFailed ? '正常に変更' : '不可に変更'}
            </button>
          )}
        </div>

        {/* Card Sub-actions */}
        <div className="flex items-center justify-between pt-1 text-xs text-[#8C7D6F] border-t border-[#EFE9E0]">
          <button
            type="button"
            onClick={() => onSelect(book)}
            className="text-[11px] text-[#6E5F52] hover:text-[#3E362E] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
          >
            {readOnly ? (
              <>
                <Eye className="w-3 h-3 text-[#32526E]" />
                <span>詳細を閲覧</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3 h-3" />
                <span>詳細・現物補正</span>
              </>
            )}
          </button>

          {!readOnly ? (
            <button
              type="button"
              onClick={() => onDeleteBook(book.id)}
              title="削除"
              className="text-[#A99C8E] hover:text-[#9A392F] transition-colors p-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] text-[#32526E] font-medium">閲覧専用</span>
          )}
        </div>
      </div>
    </div>
  );
};
