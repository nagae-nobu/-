import { Book } from '../types';

/**
 * Escapes a cell value for standard CSV formatting (RFC 4180)
 */
function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '""';
  }
  const str = String(value);
  // If string contains quotes, commas, or newlines, wrap in double quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export interface ShelfAuditStats {
  shelfLocation: string;
  totalBooks: number;
  normalBooks: number;
  ocrFailedBooks: number;
  totalCount: number;
  normalCount: number;
  ocrFailedCount: number;
  successRate: number;
}

/**
 * Exports books to a UTF-8 with BOM CSV file and triggers download
 */
export function exportBooksToCSV(
  books: Book[],
  optionsOrFilename?: string | {
    filename?: string;
    shelfFilter?: string;
  }
): void {
  const options = typeof optionsOrFilename === 'string'
    ? { filename: optionsOrFilename }
    : optionsOrFilename;

  const headers = [
    'No.',
    'ID',
    '本棚・保管場所',
    '書籍タイトル',
    '著者名',
    '出版社',
    '出版年',
    'ISBNコード',
    'ジャンル',
    '背表紙色',
    '点検・OCRステータス',
    '点検備考',
    '登録種別',
    '登録・点検日時',
    '読書状況',
    '評価',
    '感想・レビュー',
    '概要・あらすじ'
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvCell).join(','));

  books.forEach((book, index) => {
    const isFailed = book.isOcrFailed || book.title.includes('OCR読み取り不可');
    const statusText = isFailed ? 'OCR読み取り不可' : '正常認識';
    const regTypeText = book.registeredVia === 'scan' ? 'AI画像認識スキャン' : '手動登録';

    const readingStatusLabel =
      book.review?.readingStatus === 'completed'
        ? '読了'
        : book.review?.readingStatus === 'reading'
        ? '読書中'
        : book.review?.readingStatus === 'tsundoku'
        ? '積読'
        : '未読';

    const formattedDate = book.createdAt
      ? new Date(book.createdAt).toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    const row = [
      index + 1,
      book.id,
      book.shelfLocation || '未分類',
      book.title,
      book.author || '不明',
      book.publisher || '',
      book.publishedYear || '',
      book.isbn || '',
      book.genre || '',
      book.spineColor || '#5D6D5F',
      statusText,
      book.auditNotes || '',
      regTypeText,
      formattedDate,
      readingStatusLabel,
      book.review?.rating || 0,
      book.review?.comment || '',
      book.summary || ''
    ];

    rows.push(row.map(escapeCsvCell).join(','));
  });

  // Prepend UTF-8 BOM so Excel opens cleanly without garbled text
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  
  const defaultFilename = options?.shelfFilter && options.shelfFilter !== 'all'
    ? `蔵書点検_${options.shelfFilter}_${dateSuffix}.csv`
    : `蔵書点検一覧台帳_${dateSuffix}.csv`;

  const finalFilename = options?.filename || defaultFilename;

  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', finalFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Calculates shelf statistics for inventory audits
 */
export function calculateShelfAuditStats(books: Book[]): ShelfAuditStats[] {
  const shelfMap = new Map<string, { total: number; normal: number; ocrFailed: number }>();

  books.forEach(b => {
    const isFailed = b.isOcrFailed || b.auditStatus === 'ocr_failed' || b.title.includes('OCR読み取り不可');
    const shelf = b.shelfLocation || '未分類本棚';
    const current = shelfMap.get(shelf) || { total: 0, normal: 0, ocrFailed: 0 };
    current.total++;
    if (isFailed) {
      current.ocrFailed++;
    } else {
      current.normal++;
    }
    shelfMap.set(shelf, current);
  });

  const shelfSummaries: ShelfAuditStats[] = Array.from(shelfMap.entries()).map(([shelfLocation, stats]) => ({
    shelfLocation,
    totalBooks: stats.total,
    normalBooks: stats.normal,
    ocrFailedBooks: stats.ocrFailed,
    totalCount: stats.total,
    normalCount: stats.normal,
    ocrFailedCount: stats.ocrFailed,
    successRate: stats.total > 0 ? Math.round((stats.normal / stats.total) * 100) : 0
  }));

  // Sort shelves by volume descending
  shelfSummaries.sort((a, b) => b.totalBooks - a.totalBooks);

  return shelfSummaries;
}

/**
 * Exports shelf audit summary statistics to CSV
 */
export function exportShelfStatsToCSV(
  stats: ShelfAuditStats[] | { shelfSummaries: ShelfAuditStats[]; totalBooks?: number; totalNormal?: number; totalOcrFailed?: number; overallSuccessRate?: number }
): void {
  const summaries: ShelfAuditStats[] = Array.isArray(stats) ? stats : (stats.shelfSummaries || []);
  const headers = ['本棚・配架場所', '総蔵書数', '正常読取数', 'OCR読み取り不可数', '認識成功率(%)'];
  const rows: string[] = [];
  rows.push(headers.map(escapeCsvCell).join(','));

  let totalBooks = 0;
  let totalNormal = 0;
  let totalOcrFailed = 0;

  summaries.forEach(s => {
    const total = s.totalBooks ?? s.totalCount ?? 0;
    const normal = s.normalBooks ?? s.normalCount ?? 0;
    const failed = s.ocrFailedBooks ?? s.ocrFailedCount ?? 0;
    totalBooks += total;
    totalNormal += normal;
    totalOcrFailed += failed;

    const row = [
      s.shelfLocation,
      total,
      normal,
      failed,
      `${s.successRate}%`
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  });

  const overallSuccessRate = totalBooks > 0 ? Math.round((totalNormal / totalBooks) * 100) : 0;

  // Total summary row
  rows.push([
    '【合計】',
    totalBooks,
    totalNormal,
    totalOcrFailed,
    `${overallSuccessRate}%`
  ].map(escapeCsvCell).join(','));

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `本棚別_点検集計レポート_${dateSuffix}.csv`;

  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

