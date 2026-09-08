import React, { useState, useMemo } from 'react';
import { Book, AuditStatus } from '../types';
import { 
  ClipboardCheck, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  FileSpreadsheet, 
  Search, 
  Edit3, 
  ExternalLink,
  BookOpen,
  HelpCircle,
  Filter
} from 'lucide-react';
import { exportBooksToCSV, exportShelfStatsToCSV, calculateShelfAuditStats, ShelfAuditStats } from '../utils/csvExport';

interface AuditViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onUpdateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  onNavigateToScan: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  books,
  onSelectBook,
  onUpdateBook,
  onNavigateToScan
}) => {
  const [selectedShelfFilter, setSelectedShelfFilter] = useState<string>('all');
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAuthor, setEditAuthor] = useState<string>('');
  const [editIsbn, setEditIsbn] = useState<string>('');
  const [editShelf, setEditShelf] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Overall calculations
  const totalBooks = books.length;
  const ocrFailedBooks = useMemo(() => {
    return books.filter(b => b.isOcrFailed || b.auditStatus === 'ocr_failed' || b.title.includes('OCR読み取り不可'));
  }, [books]);
  const ocrFailedCount = ocrFailedBooks.length;
  const normalCount = totalBooks - ocrFailedCount;
  const normalRate = totalBooks > 0 ? Math.round((normalCount / totalBooks) * 100) : 100;

  // Shelf-by-shelf statistics
  const shelfStats = useMemo<ShelfAuditStats[]>(() => {
    return calculateShelfAuditStats(books);
  }, [books]);

  // Filtered failed books
  const displayFailedBooks = useMemo(() => {
    if (selectedShelfFilter === 'all') return ocrFailedBooks;
    return ocrFailedBooks.filter(b => (b.shelfLocation || '未設定・未分類') === selectedShelfFilter);
  }, [ocrFailedBooks, selectedShelfFilter]);

  // Handle CSV Exports
  const handleExportAllBooksCSV = () => {
    exportBooksToCSV(books);
  };

  const handleExportFailedBooksCSV = () => {
    exportBooksToCSV(ocrFailedBooks, `蔵書点検_OCR読取不可書籍リスト_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportShelfSummaryCSV = () => {
    exportShelfStatsToCSV(shelfStats);
  };

  // Start editing a failed book
  const startEditing = (book: Book) => {
    setEditingBookId(book.id);
    setEditTitle(book.title === 'OCR読み取り不可' ? '' : book.title);
    setEditAuthor(book.author === '不明' ? '' : book.author);
    setEditIsbn(book.isbn || '');
    setEditShelf(book.shelfLocation || '');
    setEditNotes(book.auditNotes || '');
  };

  const handleSaveCorrection = async (bookId: string) => {
    if (!editTitle.trim()) {
      alert('書名を入力してください（またはキャンセルしてください）');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateBook(bookId, {
        title: editTitle.trim(),
        author: editAuthor.trim() || '著者不明',
        isbn: editIsbn.trim(),
        shelfLocation: editShelf.trim() || '未分類',
        isOcrFailed: false,
        auditStatus: 'normal',
        auditNotes: editNotes.trim() ? `${editNotes.trim()} (手動補正済)` : '点検時手動補正済'
      });
      setEditingBookId(null);
    } catch (err) {
      console.error('Failed to correct book:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Card */}
      <div className="bg-white rounded-2xl border border-[#E8E1D7] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE9E0] pb-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#5D6D5F] flex items-center justify-center text-white">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#3E362E] font-serif">蔵書点検（棚卸し）レポート＆集計</h2>
                <p className="text-xs text-[#786C5E]">本棚ごとの所蔵冊数・OCR認識状況の集計およびCSVエクスポート</p>
              </div>
            </div>
          </div>

          {/* CSV Export Action Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="export-all-books-csv-btn"
              type="button"
              onClick={handleExportAllBooksCSV}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg text-white bg-[#5D6D5F] hover:bg-[#4D5C4F] active:bg-[#3E4C40] shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              全書籍CSV出力
            </button>
            <button
              id="export-shelf-stats-csv-btn"
              type="button"
              onClick={handleExportShelfSummaryCSV}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg text-[#3E362E] bg-[#F7F3EE] hover:bg-[#EAE4DB] active:bg-[#DFD7CC] border border-[#D9C5B2] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5 text-[#786C5E]" />
              本棚別集計CSV出力
            </button>
            {ocrFailedCount > 0 && (
              <button
                id="export-failed-books-csv-btn"
                type="button"
                onClick={handleExportFailedBooksCSV}
                className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#FCD34D] transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#D97706]" />
                読取不可のみCSV
              </button>
            )}
          </div>
        </div>

        {/* 4 Metric Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* Total Count */}
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E8E1D7] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#786C5E] font-medium">総点検蔵書数</p>
              <p className="text-2xl font-bold text-[#3E362E] font-serif mt-1">
                {totalBooks} <span className="text-xs font-sans font-normal text-[#786C5E]">冊</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#EFE9E0] flex items-center justify-center text-[#5D6D5F]">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Normal Read */}
          <div className="bg-[#EDF2EE] p-4 rounded-xl border border-[#D0DDD2] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#3E4E40] font-medium">OCR正常読取</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <p className="text-2xl font-bold text-[#273B2A] font-serif">
                  {normalCount} <span className="text-xs font-sans font-normal text-[#3E4E40]">冊</span>
                </p>
                <span className="text-xs font-semibold text-[#38483B] bg-[#DCE7DF] px-1.5 py-0.5 rounded">
                  {normalRate}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#DDE6DF] flex items-center justify-center text-[#334A36]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* OCR Failed Count (Highlighted) */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
            ocrFailedCount > 0 
              ? 'bg-[#FFFBEB] border-[#FCD34D]' 
              : 'bg-[#FDFBF7] border-[#E8E1D7]'
          }`}>
            <div>
              <div className="flex items-center space-x-1.5">
                <p className="text-xs text-[#92400E] font-semibold">OCR読み取り不可</p>
                <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.2 rounded font-medium">
                  要現物確認
                </span>
              </div>
              <p className="text-2xl font-bold text-[#B45309] font-serif mt-1">
                {ocrFailedCount} <span className="text-xs font-sans font-normal text-[#92400E]">冊</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Shelves Count */}
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-[#E8E1D7] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#786C5E] font-medium">登録本棚（書架）</p>
              <p className="text-2xl font-bold text-[#3E362E] font-serif mt-1">
                {shelfStats.length} <span className="text-xs font-sans font-normal text-[#786C5E]">箇所</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#EFE9E0] flex items-center justify-center text-[#786C5E]">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: 本棚別 点検集計テーブル (Shelf Audit Breakdown) */}
      <div className="bg-white rounded-2xl border border-[#E8E1D7] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE9E0] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#3E362E] font-serif flex items-center">
              <Layers className="w-4 h-4 mr-2 text-[#5D6D5F]" />
              本棚・書架別 蔵書点検集計一覧
            </h3>
            <p className="text-xs text-[#786C5E]">本棚ごとの配架冊数と「OCR読み取り不可」冊数の内訳</p>
          </div>
          <span className="text-xs font-medium text-[#786C5E] bg-[#F7F3EE] px-2.5 py-1 rounded-md border border-[#E8E1D7]">
            全 {shelfStats.length} 本棚 / 合計 {totalBooks} 冊
          </span>
        </div>

        {shelfStats.length === 0 ? (
          <p className="text-xs text-[#786C5E] py-4 text-center">本棚データがありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F3EE] text-[#6E5F52] border-b border-[#E8E1D7] font-semibold">
                  <th className="py-3 px-4">本棚名・配置場所</th>
                  <th className="py-3 px-4 text-right">総冊数</th>
                  <th className="py-3 px-4 text-right">正常読取</th>
                  <th className="py-3 px-4 text-right text-[#B45309]">OCR読み取り不可</th>
                  <th className="py-3 px-4 text-center">読取率</th>
                  <th className="py-3 px-4 text-center">進捗バー</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1] text-[#3E362E]">
                {shelfStats.map((stat) => {
                  const percentNormal = stat.totalBooks > 0 ? Math.round((stat.normalBooks / stat.totalBooks) * 100) : 100;
                  return (
                    <tr key={stat.shelfLocation} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#3E362E] font-serif flex items-center space-x-2">
                        <span>{stat.shelfLocation}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                        {stat.totalBooks} 冊
                      </td>
                      <td className="py-3 px-4 text-right text-[#2D5A34] font-medium whitespace-nowrap">
                        {stat.normalBooks} 冊
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {stat.ocrFailedBooks > 0 ? (
                          <span className="font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FCD34D]">
                            {stat.ocrFailedBooks} 冊
                          </span>
                        ) : (
                          <span className="text-[#A99C8E]">0 冊</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-semibold text-xs text-[#3E362E]">{percentNormal}%</span>
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="w-full bg-[#E8E1D7] h-2 rounded-full overflow-hidden flex">
                          <div
                            className="bg-[#5D6D5F] h-full transition-all"
                            style={{ width: `${percentNormal}%` }}
                            title={`正常読取: ${percentNormal}%`}
                          />
                          {stat.ocrFailedBooks > 0 && (
                            <div
                              className="bg-[#D97706] h-full transition-all"
                              style={{ width: `${100 - percentNormal}%` }}
                              title={`OCR不可: ${100 - percentNormal}%`}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShelfFilter(stat.shelfLocation);
                            // Scroll down to the OCR failed section
                            const el = document.getElementById('failed-books-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-[11px] font-medium text-[#5D6D5F] hover:text-[#3E4C40] bg-[#EDF2EE] hover:bg-[#DCE7DF] px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          読取不可を確認 ({stat.ocrFailedBooks})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#F7F3EE] font-bold border-t-2 border-[#D9C5B2] text-[#3E362E]">
                <tr>
                  <td className="py-3 px-4">合計（全 {shelfStats.length} 本棚）</td>
                  <td className="py-3 px-4 text-right">{totalBooks} 冊</td>
                  <td className="py-3 px-4 text-right text-[#2D5A34]">{normalCount} 冊</td>
                  <td className="py-3 px-4 text-right text-[#B45309]">{ocrFailedCount} 冊</td>
                  <td className="py-3 px-4 text-center">{normalRate}%</td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-[#E8E1D7] h-2.5 rounded-full overflow-hidden flex">
                      <div className="bg-[#5D6D5F] h-full" style={{ width: `${normalRate}%` }} />
                      <div className="bg-[#D97706] h-full" style={{ width: `${100 - normalRate}%` }} />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedShelfFilter('all')}
                      className="text-[11px] text-[#6E5F52] hover:underline"
                    >
                      全棚表示
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: 「OCR読み取り不可」書籍 現物確認・補正リスト */}
      <div id="failed-books-section" className="bg-white rounded-2xl border border-[#E8E1D7] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE9E0] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-[#3E362E] font-serif flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-[#D97706]" />
                「OCR読み取り不可」書籍リスト（要現物確認）
              </h3>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                合計 {ocrFailedCount} 冊
              </span>
            </div>
            <p className="text-xs text-[#786C5E] mt-0.5">
              日焼け・スレ・光反射・極細背表紙等でタイトルが読み取れなかった書籍です。現物確認後にタイトルを入力して正常登録に更新できます。
            </p>
          </div>

          {/* Shelf filter for failed list */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#786C5E]" />
            <select
              value={selectedShelfFilter}
              onChange={(e) => setSelectedShelfFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-[#FDFBF7] text-[#3E362E] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
            >
              <option value="all">すべての本棚 ({ocrFailedCount}冊)</option>
              {shelfStats.map(s => (
                <option key={s.shelfLocation} value={s.shelfLocation}>
                  {s.shelfLocation} ({s.ocrFailedBooks}冊不可)
                </option>
              ))}
            </select>
          </div>
        </div>

        {displayFailedBooks.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-[#FDFBF7] rounded-xl border border-dashed border-[#D9C5B2]">
            <CheckCircle2 className="w-8 h-8 text-[#5D6D5F] mx-auto" />
            <p className="text-sm font-bold text-[#3E362E]">読み取り不可の書籍はありません</p>
            <p className="text-xs text-[#786C5E]">
              {selectedShelfFilter !== 'all' ? 'この本棚の書籍はすべて正常に読み取られています。' : 'すべての書籍が正常にOCR認識・登録されています。'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayFailedBooks.map(book => {
              const isEditing = editingBookId === book.id;

              return (
                <div
                  key={book.id}
                  className="bg-[#FFFDF9] rounded-xl border border-[#FCD34D] p-4 shadow-xs space-y-3 relative hover:border-[#F59E0B] transition-colors"
                >
                  {isEditing ? (
                    /* Inline Editing Form for Correction */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#FDE68A] pb-1.5">
                        <span className="text-xs font-bold text-[#92400E] flex items-center">
                          <Edit3 className="w-3.5 h-3.5 mr-1 text-[#D97706]" />
                          現物確認 書籍情報の手動入力
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingBookId(null)}
                          className="text-xs text-[#786C5E] hover:text-[#3E362E]"
                        >
                          キャンセル
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-[#786C5E] mb-0.5">正式な書名・タイトル *</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="例: こころ、人間失格 など"
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D9C5B2] rounded focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-[#786C5E] mb-0.5">著者名</label>
                          <input
                            type="text"
                            value={editAuthor}
                            onChange={(e) => setEditAuthor(e.target.value)}
                            placeholder="例: 夏目 漱石"
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D9C5B2] rounded focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-[#786C5E] mb-0.5">ISBN (任意)</label>
                          <input
                            type="text"
                            value={editIsbn}
                            onChange={(e) => setEditIsbn(e.target.value)}
                            placeholder="978-4-..."
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D9C5B2] rounded focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-[#786C5E] mb-0.5">点検メモ</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="例: 背表紙日焼けのため目視確認"
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D9C5B2] rounded focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveCorrection(book.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#5D6D5F] hover:bg-[#4D5C4F] rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? '保存中...' : '正常登録に修正して保存'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Card */
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5">
                          <div
                            className="w-3.5 h-12 rounded-xs shrink-0 mt-0.5 shadow-xs border border-black/10"
                            style={{ backgroundColor: book.spineColor || '#78716c' }}
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                                OCR読み取り不可
                              </span>
                              <span className="text-[10px] text-[#786C5E] bg-[#F7F3EE] px-1.5 py-0.5 rounded border border-[#E8E1D7]">
                                {book.shelfLocation || '本棚未設定'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-[#3E362E] font-serif mt-1">
                              {book.title}
                            </h4>
                            <p className="text-xs text-[#786C5E]">
                              著者: {book.author || '不明'} {book.publisher ? `· ${book.publisher}` : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectBook(book)}
                          className="text-[11px] text-[#6E5F52] hover:text-[#3E362E] bg-[#F7F3EE] px-2 py-1 rounded border border-[#E8E1D7] cursor-pointer"
                        >
                          詳細
                        </button>
                      </div>

                      {/* Audit Note */}
                      <div className="bg-[#FEF9E7] p-2.5 rounded-lg border border-[#FDE68A] text-xs space-y-1">
                        <p className="text-[#92400E] font-medium">
                          📝 点検メモ: {book.auditNotes || '背表紙かすれ・反射等のため要現物確認'}
                        </p>
                        {book.summary && (
                          <p className="text-[#786C5E] text-[11px] line-clamp-2">
                            {book.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#FEE2E2]/60">
                        <span className="text-[10px] text-[#A99C8E]">
                          登録日時: {new Date(book.createdAt).toLocaleDateString('ja-JP')}
                        </span>

                        <button
                          type="button"
                          onClick={() => startEditing(book)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] rounded border border-[#FCD34D] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          現物確認してタイトル入力
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
