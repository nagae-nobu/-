import React, { useState } from 'react';
import { X, Plus, BookOpen, Bookmark } from 'lucide-react';
import { Book, ReadingStatus } from '../types';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (book: Partial<Book>) => Promise<void>;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  onClose,
  onAddBook
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [genre, setGenre] = useState('一般');
  const [shelfLocation, setShelfLocation] = useState('メイン本棚');
  const [spineColor, setSpineColor] = useState('#3b82f6');
  const [summary, setSummary] = useState('');
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('unread');
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predefinedGenres = [
    '技術書', '小説・文芸', 'ビジネス・経済', '自己啓発', '人文書・思想',
    '漫画・コミック', '雑誌', '資格・学習', '趣味・実用', '一般'
  ];

  const predefinedColors = [
    '#5D6D5F', '#8A9A86', '#C48E59', '#A65B32', '#3E4E40',
    '#6E5F52', '#8C7355', '#4A607A', '#9A392F', '#5C4A72',
    '#B8977E', '#3E362E'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const newBook: Partial<Book> = {
        title: title.trim(),
        author: author.trim() || '著者不明',
        publisher: publisher.trim(),
        genre: genre.trim() || '一般',
        shelfLocation: shelfLocation.trim() || 'メイン本棚',
        spineColor,
        summary: summary.trim(),
        registeredVia: 'manual',
        review: {
          rating,
          comment: comment.trim(),
          tags: [genre],
          readingStatus,
          updatedAt: new Date().toISOString()
        },
        lending: {
          status: 'available',
          history: []
        }
      };

      await onAddBook(newBook);
      onClose();
    } catch (err) {
      console.error("Failed to add book manually:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E362E]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#E8E1D7] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE9E0] bg-[#F7F3EE]">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-[#5D6D5F]" />
            <h3 className="text-base font-bold text-[#3E362E] font-serif">
              書籍の手動登録
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

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
          <div>
            <label className="block font-bold text-[#6E5F52] mb-1">
              書籍タイトル <span className="text-[#9A392F]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: プロを目指す人のためのTypeScript"
              className="w-full px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#6E5F52] mb-1">著者名</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="例: 鈴木 孝明"
                className="w-full px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#6E5F52] mb-1">出版社</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="例: 技術評論社"
                className="w-full px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#6E5F52] mb-1">ジャンル</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
              >
                {predefinedGenres.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#6E5F52] mb-1">本棚の配置場所</label>
              <input
                type="text"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="例: 書斎 A棚"
                className="w-full px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
              />
            </div>
          </div>

          {/* Spine color picker */}
          <div>
            <label className="block font-bold text-[#6E5F52] mb-1">背表紙カラー（本棚の目印）</label>
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
              {predefinedColors.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSpineColor(c)}
                  className={`w-5 h-5 rounded-full border border-black/10 transition-transform cursor-pointer ${
                    spineColor === c ? 'scale-125 ring-2 ring-[#5D6D5F] ring-offset-1' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Reading Status */}
          <div>
            <label className="block font-bold text-[#6E5F52] mb-1">読書ステータス</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'unread', label: '未読' },
                { id: 'reading', label: '読書中' },
                { id: 'completed', label: '読了' },
                { id: 'tsundoku', label: '積読' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setReadingStatus(opt.id as ReadingStatus)}
                  className={`py-1.5 text-center rounded border font-semibold cursor-pointer transition-colors ${
                    readingStatus === opt.id
                      ? 'border-[#5D6D5F] bg-[#EDF2EE] text-[#334A36]'
                      : 'border-[#E8E1D7] text-[#6E5F52] hover:bg-[#F7F3EE]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Summary */}
          <div>
            <label className="block font-bold text-[#6E5F52] mb-1">概要・感想メモ（任意）</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="気になる点や購入動機など..."
              className="w-full px-3 py-2 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none font-serif"
            />
          </div>

          <div className="pt-3 border-t border-[#EFE9E0] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE] rounded-lg transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 bg-[#5D6D5F] hover:bg-[#4D5C4F] active:bg-[#3E4E40] text-white font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? '登録中...' : '書籍を登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
