import React, { useState } from 'react';
import { X, Star, BookOpen, Quote, Tag, Check, Calendar } from 'lucide-react';
import { Book, BookReview, ReadingStatus } from '../types';

interface ReviewModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onSaveReview: (bookId: string, review: BookReview) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  book,
  isOpen,
  onClose,
  onSaveReview
}) => {
  if (!isOpen) return null;

  const [rating, setRating] = useState<number>(book.review.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>(book.review.readingStatus || 'unread');
  const [comment, setComment] = useState<string>(book.review.comment || '');
  const [quotes, setQuotes] = useState<string>(book.review.quotes || '');
  const [tagInput, setTagInput] = useState<string>((book.review.tags || []).join(', '));
  const [completedDate, setCompletedDate] = useState<string>(
    book.review.completedDate || (readingStatus === 'completed' ? new Date().toISOString().split('T')[0] : '')
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const readingOptions: Array<{ id: ReadingStatus; label: string; desc: string }> = [
    { id: 'unread', label: '未読', desc: 'まだ読んでいない' },
    { id: 'reading', label: '読書中', desc: '現在読み進めている' },
    { id: 'completed', label: '読了', desc: '最後まで読み終えた' },
    { id: 'tsundoku', label: '積読', desc: '購入したが保管中' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsedTags = tagInput
        .split(/[,、\s]+/)
        .map(t => t.replace(/^#/, '').trim())
        .filter(Boolean);

      const updatedReview: BookReview = {
        rating,
        comment: comment.trim(),
        quotes: quotes.trim(),
        tags: parsedTags,
        readingStatus,
        completedDate: readingStatus === 'completed' ? completedDate || new Date().toISOString().split('T')[0] : undefined,
        updatedAt: new Date().toISOString(),
      };

      await onSaveReview(book.id, updatedReview);
      onClose();
    } catch (err) {
      console.error("Failed to save review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E362E]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#E8E1D7] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE9E0] bg-[#F7F3EE]">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#5D6D5F]" />
            <h3 className="text-base font-bold text-[#3E362E] font-serif">
              読書感想・レビューの記録
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#A99C8E] hover:text-[#3E362E] rounded-md hover:bg-[#EAE4DB] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Book snippet */}
        <div className="px-5 py-3 bg-[#FDFBF7] border-b border-[#E8E1D7] flex items-center space-x-3">
          <div
            className="w-2.5 h-10 rounded-xs shrink-0"
            style={{ backgroundColor: book.spineColor || '#5D6D5F' }}
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-[#3E362E] font-serif truncate">{book.title}</h4>
            <p className="text-[11px] text-[#786C5E] truncate">{book.author}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Reading Status Selector */}
          <div>
            <label className="block text-xs font-bold text-[#6E5F52] mb-1.5">
              読書ステータス
            </label>
            <div className="grid grid-cols-4 gap-2">
              {readingOptions.map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => {
                    setReadingStatus(opt.id);
                    if (opt.id === 'completed' && !completedDate) {
                      setCompletedDate(new Date().toISOString().split('T')[0]);
                    }
                  }}
                  className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold transition-colors cursor-pointer flex flex-col items-center justify-center ${
                    readingStatus === opt.id
                      ? 'border-[#5D6D5F] bg-[#EDF2EE] text-[#334A36] ring-2 ring-[#5D6D5F]/20'
                      : 'border-[#E8E1D7] text-[#6E5F52] hover:bg-[#F7F3EE]'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-bold text-[#6E5F52] mb-1">
              評価（星1〜5）
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating || rating);
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setRating(star === rating ? 0 : star)}
                      className="p-1 text-[#E0D7CC] hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          active ? 'text-[#C48E59] fill-[#C48E59]' : 'text-[#E0D7CC]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-[#3E362E]">
                {rating > 0 ? `${rating}.0 / 5.0` : '未評価'}
              </span>
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="text-[10px] text-[#A99C8E] hover:text-[#3E362E] underline"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {/* Completed Date if completed */}
          {readingStatus === 'completed' && (
            <div>
              <label className="block text-xs font-bold text-[#6E5F52] mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-[#786C5E]" />
                <span>読了日</span>
              </label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
              />
            </div>
          )}

          {/* Comment / Review */}
          <div>
            <label className="block text-xs font-bold text-[#6E5F52] mb-1">
              感想・書評・メモ
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="本を読んだ気づきや感想、おすすめしたいポイントなどを自由に記録できます..."
              className="w-full text-xs px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none font-serif"
            />
          </div>

          {/* Quotes / Memorable Phrase */}
          <div>
            <label className="block text-xs font-bold text-[#6E5F52] mb-1 flex items-center space-x-1">
              <Quote className="w-3.5 h-3.5 text-[#786C5E]" />
              <span>心に残った一節・名言（引用）</span>
            </label>
            <textarea
              rows={2}
              value={quotes}
              onChange={(e) => setQuotes(e.target.value)}
              placeholder="例: 「真の発見の旅とは、新しい景色を探すことではなく、新しい目を持つことにある。」"
              className="w-full text-xs px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none italic font-serif"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-[#6E5F52] mb-1 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5 text-[#786C5E]" />
              <span>タグ（カンマ区切り）</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="例: 必読, 仕事術, 感動, 新人教育"
              className="w-full text-xs px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#EFE9E0] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE] rounded-lg cursor-pointer transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#5D6D5F] hover:bg-[#4D5C4F] active:bg-[#3E4E40] text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '保存中...' : '感想を保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
