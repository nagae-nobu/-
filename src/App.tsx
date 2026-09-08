import React, { useState, useEffect, useCallback } from 'react';
import { Book, BookReview } from './types';
import { Header } from './components/Header';
import { LibraryView } from './components/LibraryView';
import { BookshelfScanner } from './components/BookshelfScanner';
import { AuditView } from './components/AuditView';
import { ReviewsView } from './components/ReviewsView';
import { BookDetailModal } from './components/BookDetailModal';
import { ReviewModal } from './components/ReviewModal';
import { AddBookModal } from './components/AddBookModal';
import { MaintenanceView } from './components/MaintenanceView';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'scan' | 'audit' | 'reviews' | 'maintenance'>('library');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [selectedBookForReview, setSelectedBookForReview] = useState<Book | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch books from server
  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/books');
      if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
      const data = await res.json();
      if (data.books) {
        setBooks(data.books);
      }
    } catch (err: any) {
      console.error("Error loading books:", err);
      showToast("サーバーからの書籍データの取得に失敗しました", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Keep detail modal synced when book updates
  useEffect(() => {
    if (selectedBookForDetail) {
      const updated = books.find(b => b.id === selectedBookForDetail.id);
      if (updated) setSelectedBookForDetail(updated);
    }
  }, [books, selectedBookForDetail]);

  // Register multiple or single book(s)
  const handleRegisterBooks = async (newBooks: Partial<Book>[]) => {
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: newBooks })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '登録に失敗しました');
      }

      const data = await res.json();
      if (data.books) {
        setBooks(data.books);
      } else {
        await fetchBooks();
      }
      showToast(`${newBooks.length} 冊の書籍を点検台帳へ登録しました`);
    } catch (err: any) {
      console.error("Failed to register books:", err);
      showToast(err.message || "書籍の登録中にエラーが発生しました", "error");
      throw err;
    }
  };

  // Update book general details
  const handleUpdateBook = async (id: string, updates: Partial<Book>) => {
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '更新に失敗しました');
      }

      const data = await res.json();
      if (data.book) {
        setBooks(prev => prev.map(b => (b.id === id ? data.book : b)));
      }
      showToast("書籍情報を更新しました");
    } catch (err: any) {
      console.error("Failed to update book:", err);
      showToast(err.message || "書籍の更新中にエラーが発生しました", "error");
      throw err;
    }
  };

  // Toggle OCR failed status directly
  const handleToggleOcrFailed = async (book: Book) => {
    const isCurrentlyFailed = Boolean(book.isOcrFailed || book.auditStatus === 'ocr_failed' || book.title.includes('OCR読み取り不可'));
    const nextFailed = !isCurrentlyFailed;
    
    await handleUpdateBook(book.id, {
      isOcrFailed: nextFailed,
      auditStatus: nextFailed ? 'ocr_failed' : 'normal',
      auditNotes: nextFailed 
        ? (book.auditNotes || '現物照合確認中（OCR読み取り不可）')
        : (book.auditNotes ? `${book.auditNotes} (照合完了)` : '現物確認完了')
    });

    showToast(nextFailed ? `「${book.title}」をOCR不可として記録しました` : `「${book.title}」を正常に更新しました`);
  };

  // Save review
  const handleSaveReview = async (bookId: string, review: BookReview) => {
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '感想の保存に失敗しました');
      }

      const data = await res.json();
      if (data.book) {
        setBooks(prev => prev.map(b => (b.id === bookId ? data.book : b)));
      }
      showToast("読書感想・レビューを保存しました");
    } catch (err: any) {
      console.error("Failed to save review:", err);
      showToast(err.message || "感想の保存中にエラーが発生しました", "error");
      throw err;
    }
  };

  // Delete book
  const handleDeleteBook = async (id: string) => {
    try {
      const res = await fetch(`/api/books/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '削除に失敗しました');
      }

      setBooks(prev => prev.filter(b => b.id !== id));
      showToast("書籍をデータベースから削除しました");
    } catch (err: any) {
      console.error("Failed to delete book:", err);
      showToast(err.message || "削除中にエラーが発生しました", "error");
    }
  };

  // Reset to initial seed sample
  const handleResetSample = async () => {
    if (!window.confirm("初期サンプル蔵書点検データにリセットしますか？現在の登録内容は初期データに置き換わります。")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/books/reset', { method: 'POST' });
      if (!res.ok) throw new Error('リセットに失敗しました');
      const data = await res.json();
      if (data.books) {
        setBooks(data.books);
      }
      showToast("サンプル蔵書点検データを復元しました");
    } catch (err: any) {
      console.error("Reset failed:", err);
      showToast(err.message || "リセットに失敗しました", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#3E362E] font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center space-x-2.5 text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-[#3E362E] text-[#FDFBF7] border-[#2F2923]'
              : 'bg-[#7D3834] text-white border-[#5F2B28]'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#A1B8A3]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-300" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* App Header */}
      <Header
        books={books}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenManualAdd={() => setIsManualAddOpen(true)}
        onResetSample={handleResetSample}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && books.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#5D6D5F] animate-spin" />
            <p className="text-xs text-[#786C5E] font-medium">蔵書点検データベースを読み込み中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'library' && (
              <LibraryView
                books={books}
                onSelectBook={(book) => setSelectedBookForDetail(book)}
                onOpenReviewModal={(book) => setSelectedBookForReview(book)}
                onDeleteBook={handleDeleteBook}
                onToggleOcrFailed={handleToggleOcrFailed}
                onOpenManualAdd={() => setIsManualAddOpen(true)}
                onNavigateToScan={() => setActiveTab('scan')}
                onRefreshBooks={fetchBooks}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'scan' && (
              <BookshelfScanner
                onRegisterBooks={handleRegisterBooks}
                onNavigateToLibrary={() => setActiveTab('library')}
              />
            )}

            {activeTab === 'audit' && (
              <AuditView
                books={books}
                onSelectBook={(book) => setSelectedBookForDetail(book)}
                onToggleOcrFailed={handleToggleOcrFailed}
                onNavigateToScan={() => setActiveTab('scan')}
              />
            )}

            {activeTab === 'reviews' && (
              <ReviewsView
                books={books}
                onOpenReviewModal={(book) => setSelectedBookForReview(book)}
                onSelectBook={(book) => setSelectedBookForDetail(book)}
              />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceView
                books={books}
                onRefreshBooks={fetchBooks}
                onNavigateToTab={setActiveTab}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {selectedBookForDetail && (
        <BookDetailModal
          book={selectedBookForDetail}
          isOpen={true}
          onClose={() => setSelectedBookForDetail(null)}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
          onOpenReviewModal={(book) => {
            setSelectedBookForDetail(null);
            setSelectedBookForReview(book);
          }}
        />
      )}

      {selectedBookForReview && (
        <ReviewModal
          book={selectedBookForReview}
          isOpen={true}
          onClose={() => setSelectedBookForReview(null)}
          onSaveReview={handleSaveReview}
        />
      )}

      {isManualAddOpen && (
        <AddBookModal
          isOpen={true}
          onClose={() => setIsManualAddOpen(false)}
          onAddBook={async (bookData) => {
            await handleRegisterBooks([bookData]);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#E8E1D7] bg-[#F7F3EE] py-5 mt-12 text-center text-xs text-[#786C5E]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-serif">© 蔵書点検アプリ — AI背表紙OCR点検・現物照合・CSV台帳エクスポート</p>
          <div className="flex items-center space-x-3 text-[11px] text-[#786C5E]">
            <span>データベース: 永続化ストレージ接続中</span>
            <span>•</span>
            <span>Gemini 3.8 Flash ビジョンOCR認識</span>
          </div>
        </div>
      </footer>
      <SpeedInsights />
    </div>
  );
}
