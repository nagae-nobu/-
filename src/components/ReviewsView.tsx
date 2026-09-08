import React, { useState } from 'react';
import { Star, MessageSquare, Quote, Tag, BookCheck, Clock, Bookmark, Search, Edit3 } from 'lucide-react';
import { Book, ReadingStatus } from '../types';

interface ReviewsViewProps {
  books: Book[];
  onOpenReviewModal: (book: Book) => void;
  onSelectBook: (book: Book) => void;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({
  books,
  onOpenReviewModal,
  onSelectBook
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Stats
  const completedBooks = books.filter(b => b.review.readingStatus === 'completed');
  const readingBooks = books.filter(b => b.review.readingStatus === 'reading');
  const tsundokuBooks = books.filter(b => b.review.readingStatus === 'tsundoku');
  
  // Rated books & average rating
  const ratedBooks = books.filter(b => (b.review.rating || 0) > 0);
  const avgRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((sum, b) => sum + b.review.rating, 0) / ratedBooks.length).toFixed(1)
    : '0.0';

  // Extract all unique tags
  const allTags = Array.from(
    new Set(books.flatMap(b => b.review.tags || []).filter(Boolean))
  );

  // Filtered books
  const filteredBooks = books.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.review.comment || '').toLowerCase().includes(q) ||
      (b.review.quotes || '').toLowerCase().includes(q);

    const matchesRating = selectedRating === null || b.review.rating === selectedRating;
    const matchesStatus = selectedStatus === 'all' || b.review.readingStatus === selectedStatus;
    const matchesTag = selectedTag === null || (b.review.tags || []).includes(selectedTag);

    return matchesSearch && matchesRating && matchesStatus && matchesTag;
  });

  // Sort by rating desc, then has comment, then updatedAt
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if ((b.review.rating || 0) !== (a.review.rating || 0)) {
      return (b.review.rating || 0) - (a.review.rating || 0);
    }
    const aHasComment = a.review.comment ? 1 : 0;
    const bHasComment = b.review.comment ? 1 : 0;
    return bHasComment - aHasComment;
  });

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E8E1D7] shadow-xs">
          <div className="flex items-center space-x-2 text-[#334A36] mb-1">
            <BookCheck className="w-4 h-4" />
            <span className="text-xs font-bold">読了</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#3E362E] font-serif">{completedBooks.length}</span>
            <span className="text-xs text-[#786C5E]">冊</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E1D7] shadow-xs">
          <div className="flex items-center space-x-2 text-[#5D6D5F] mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold">読書中</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#3E362E] font-serif">{readingBooks.length}</span>
            <span className="text-xs text-[#786C5E]">冊</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E1D7] shadow-xs">
          <div className="flex items-center space-x-2 text-[#786C5E] mb-1">
            <Bookmark className="w-4 h-4" />
            <span className="text-xs font-bold">積読</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#3E362E] font-serif">{tsundokuBooks.length}</span>
            <span className="text-xs text-[#786C5E]">冊</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E8E1D7] shadow-xs">
          <div className="flex items-center space-x-2 text-[#C48E59] mb-1">
            <Star className="w-4 h-4 fill-[#C48E59]" />
            <span className="text-xs font-bold">平均評価</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#3E362E] font-serif">{avgRating}</span>
            <span className="text-xs text-[#786C5E]">/ 5.0</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E8E1D7] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-[#F7F3EE] p-1 rounded-lg text-xs overflow-x-auto">
            {[
              { id: 'all', label: 'すべて' },
              { id: 'completed', label: '読了' },
              { id: 'reading', label: '読書中' },
              { id: 'tsundoku', label: '積読' },
              { id: 'unread', label: '未読' },
            ].map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedStatus(item.id as any)}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedStatus === item.id ? 'bg-white text-[#3E362E] shadow-xs' : 'text-[#786C5E] hover:text-[#3E362E]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Star Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-[#786C5E] font-medium mr-1">星評価:</span>
            {[5, 4, 3, 2, 1].map(star => (
              <button
                type="button"
                key={star}
                onClick={() => setSelectedRating(selectedRating === star ? null : star)}
                className={`px-2 py-1 rounded border text-xs font-semibold cursor-pointer transition-colors ${
                  selectedRating === star
                    ? 'bg-[#F5ECE1] text-[#7A4B20] border-[#D8BA9C] font-bold'
                    : 'bg-[#FDFBF7] border-[#E8E1D7] text-[#786C5E] hover:bg-[#F7F3EE]'
                }`}
              >
                ★{star}
              </button>
            ))}
            {selectedRating !== null && (
              <button
                type="button"
                onClick={() => setSelectedRating(null)}
                className="text-[11px] text-[#A99C8E] hover:text-[#3E362E] underline ml-1 cursor-pointer"
              >
                解除
              </button>
            )}
          </div>
        </div>

        {/* Search input & Tag chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#EFE9E0]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#A99C8E] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="感想のキーワード、名言、書名で検索..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] py-0.5">
              <span className="text-[#786C5E] whitespace-nowrap">タグ:</span>
              {allTags.slice(0, 8).map(tag => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-full border whitespace-nowrap cursor-pointer transition-colors ${
                    selectedTag === tag
                      ? 'bg-[#5D6D5F] text-white border-[#5D6D5F]'
                      : 'bg-[#F7F3EE] text-[#6E5F52] border-[#E8E1D7] hover:bg-[#EAE4DB]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {selectedTag !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="text-[#A99C8E] hover:text-[#3E362E] underline text-[10px] cursor-pointer"
                >
                  クリア
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review Cards Grid */}
      {sortedBooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E1D7] p-12 text-center text-[#786C5E]">
          <MessageSquare className="w-10 h-10 text-[#A99C8E] mx-auto mb-2" />
          <h4 className="text-sm font-bold text-[#3E362E] font-serif">該当する読書記録がありません</h4>
          <p className="text-xs text-[#786C5E] mt-1">
            検索条件を変更するか、蔵書一覧から本を選んで「感想を書く」から記録を追加してください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedBooks.map(book => (
            <div
              key={book.id}
              className="bg-white rounded-xl border border-[#E8E1D7] p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#D9C5B2] transition-colors"
            >
              {/* Top Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div
                    className="w-2.5 h-12 rounded-xs shrink-0 mt-0.5"
                    style={{ backgroundColor: book.spineColor || '#5D6D5F' }}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-[#F7F3EE] text-[#6E5F52] border border-[#E8E1D7]">
                      {book.genre}
                    </span>
                    <h4
                      onClick={() => onSelectBook(book)}
                      className="text-xs font-bold text-[#3E362E] font-serif hover:text-[#5D6D5F] cursor-pointer mt-1 line-clamp-2 leading-snug"
                    >
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-[#786C5E] truncate mt-0.5">{book.author}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center space-x-0.5 justify-end">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= (book.review.rating || 0)
                            ? 'text-[#C48E59] fill-[#C48E59]'
                            : 'text-[#E0D7CC]'
                        }`}
                      />
                    ))}
                  </div>
                  {book.review.completedDate && (
                    <span className="text-[10px] text-[#786C5E] block mt-0.5">
                      読了: {book.review.completedDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Review Comment Body */}
              <div className="space-y-2 flex-1">
                {book.review.comment ? (
                  <div className="bg-[#FDFBF7] p-3 rounded-lg border border-[#E8E1D7] text-xs text-[#3E362E] leading-relaxed whitespace-pre-wrap font-serif">
                    {book.review.comment}
                  </div>
                ) : (
                  <div className="bg-[#FDFBF7] p-3 rounded-lg border border-dashed border-[#E8E1D7] text-xs text-[#A99C8E] italic">
                    まだ感想は記入されていません。
                  </div>
                )}

                {/* Quotes */}
                {book.review.quotes && (
                  <div className="bg-[#FAF6F0] p-2.5 rounded-lg border border-[#E8E1D7] text-xs text-[#3E362E] italic border-l-2 border-[#C48E59] pl-3 font-serif">
                    <Quote className="w-3 h-3 text-[#C48E59] inline mr-1 -mt-1" />
                    "{book.review.quotes}"
                  </div>
                )}

                {/* Tags */}
                {book.review.tags && book.review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {book.review.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F3EE] text-[#6E5F52] border border-[#E8E1D7]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#EFE9E0] text-xs">
                <span className="text-[11px] text-[#786C5E]">
                  {book.review.readingStatus === 'completed'
                    ? '読了済み'
                    : book.review.readingStatus === 'reading'
                    ? '読書中'
                    : book.review.readingStatus === 'tsundoku'
                    ? '積読'
                    : '未読'}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenReviewModal(book)}
                  className="text-xs text-[#5D6D5F] hover:text-[#3E4E40] font-semibold hover:underline flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>感想を編集・追記</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
