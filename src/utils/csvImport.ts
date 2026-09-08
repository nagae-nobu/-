import { Book, ReadingStatus, AuditStatus, DataChangeItem } from '../types';

export interface ParsedCsvDiff {
  toInsert: Partial<Book>[];
  toUpdate: {
    bookId: string;
    original: Book;
    updates: Partial<Book>;
    changes: DataChangeItem[];
  }[];
  unchangedCount: number;
  totalRows: number;
  errors: { row: number; error: string }[];
}

/**
 * Standard RFC 4180 compliant CSV parser that handles multi-line cells,
 * escaped double quotes, and arbitrary CRLF/LF line breaks.
 */
export function parseCsvRows(text: string): string[][] {
  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Final cell and row if not empty
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  // Filter out completely empty rows
  return rows.filter(r => r.some(cell => cell.length > 0));
}

/**
 * Normalizes reading status labels to standard internal values
 */
function normalizeReadingStatus(val: string): ReadingStatus {
  const v = val.toLowerCase().trim();
  if (v === '読了' || v === 'completed' || v === '読了済') return 'completed';
  if (v === '読書中' || v === 'reading' || v === '読んでる') return 'reading';
  if (v === '積読' || v === 'tsundoku' || v === '積ん読') return 'tsundoku';
  return 'unread';
}

/**
 * Normalizes audit status
 */
function normalizeAuditStatus(val: string): { isOcrFailed: boolean; auditStatus: AuditStatus } {
  const v = val.trim();
  if (v.includes('不可') || v.includes('失敗') || v.includes('ocr_failed') || v.includes('要確認')) {
    return { isOcrFailed: true, auditStatus: 'ocr_failed' };
  }
  return { isOcrFailed: false, auditStatus: 'normal' };
}

/**
 * Maps header names to field keys
 */
function mapHeaderIndex(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const header = h.trim().toLowerCase();
    if (header === 'id' || header === '書籍id' || header === 'book id' || header === 'bookid') {
      map['id'] = idx;
    } else if (header.includes('タイトル') || header === '書名' || header === 'title') {
      map['title'] = idx;
    } else if (header.includes('著者') || header === 'author') {
      map['author'] = idx;
    } else if (header.includes('出版社') || header === 'publisher') {
      map['publisher'] = idx;
    } else if (header.includes('出版年') || header.includes('刊行年') || header === 'year') {
      map['publishedYear'] = idx;
    } else if (header.includes('isbn') || header.includes('コード')) {
      map['isbn'] = idx;
    } else if (header.includes('ジャンル') || header === 'genre' || header.includes('分類')) {
      map['genre'] = idx;
    } else if (header.includes('本棚') || header.includes('保管場所') || header.includes('配架') || header === 'shelf') {
      map['shelfLocation'] = idx;
    } else if (header.includes('背表紙色') || header.includes('色') || header === 'color') {
      map['spineColor'] = idx;
    } else if (header.includes('点検') && (header.includes('ステータス') || header.includes('状態'))) {
      map['auditStatus'] = idx;
    } else if (header.includes('点検備考') || header.includes('備考') || header === 'notes') {
      map['auditNotes'] = idx;
    } else if (header.includes('読書') || header.includes('ステータス')) {
      map['readingStatus'] = idx;
    } else if (header.includes('評価') || header.includes('星') || header === 'rating') {
      map['rating'] = idx;
    } else if (header.includes('感想') || header.includes('レビュー') || header === 'review') {
      map['comment'] = idx;
    } else if (header.includes('概要') || header.includes('あらすじ') || header === 'summary') {
      map['summary'] = idx;
    }
  });

  return map;
}

/**
 * Compares an imported row with an existing book to detect changes
 */
export function analyzeCsvDiff(
  csvText: string,
  existingBooks: Book[]
): ParsedCsvDiff {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return {
      toInsert: [],
      toUpdate: [],
      unchangedCount: 0,
      totalRows: 0,
      errors: [{ row: 0, error: 'CSVにデータ行が見つかりません。ヘッダーとデータ行が含まれているか確認してください。' }]
    };
  }

  const headerRow = rows[0];
  const headerMap = mapHeaderIndex(headerRow);
  const dataRows = rows.slice(1);

  const toInsert: Partial<Book>[] = [];
  const toUpdate: {
    bookId: string;
    original: Book;
    updates: Partial<Book>;
    changes: DataChangeItem[];
  }[] = [];
  const errors: { row: number; error: string }[] = [];
  let unchangedCount = 0;

  // Book lookup map by ID and by Title+Author
  const existingById = new Map<string, Book>();
  const existingByTitleAuthor = new Map<string, Book>();
  const existingByIsbn = new Map<string, Book>();

  existingBooks.forEach(b => {
    existingById.set(b.id, b);
    if (b.title && b.author) {
      existingByTitleAuthor.set(`${b.title.trim()}|${b.author.trim()}`.toLowerCase(), b);
    }
    if (b.isbn) {
      const cleanIsbn = b.isbn.replace(/[-\s]/g, '');
      if (cleanIsbn) existingByIsbn.set(cleanIsbn, b);
    }
  });

  dataRows.forEach((row, rIdx) => {
    const rowNum = rIdx + 2; // 1-indexed including header
    const getVal = (key: string): string => {
      const idx = headerMap[key];
      return idx !== undefined && idx < row.length ? row[idx].trim() : '';
    };

    const id = getVal('id');
    const title = getVal('title');
    const author = getVal('author') || '著者不明';

    if (!title) {
      errors.push({ row: rowNum, error: 'タイトルが空欄のためスキップされました' });
      return;
    }

    const publisher = getVal('publisher');
    const publishedYear = getVal('publishedYear');
    const isbn = getVal('isbn');
    const genre = getVal('genre') || '一般';
    const shelfLocation = getVal('shelfLocation') || '未分類';
    const spineColor = getVal('spineColor') || '#5D6D5F';
    const auditStatusRaw = getVal('auditStatus');
    const auditNotes = getVal('auditNotes');
    const readingStatusRaw = getVal('readingStatus');
    const ratingRaw = parseInt(getVal('rating'), 10);
    const rating = isNaN(ratingRaw) ? 0 : Math.max(0, Math.min(5, ratingRaw));
    const comment = getVal('comment');
    const summary = getVal('summary');

    const { isOcrFailed, auditStatus } = normalizeAuditStatus(auditStatusRaw);
    const readingStatus = normalizeReadingStatus(readingStatusRaw);

    // Try finding matching existing book
    let match: Book | undefined;
    if (id && existingById.has(id)) {
      match = existingById.get(id);
    } else if (isbn) {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      if (cleanIsbn && existingByIsbn.has(cleanIsbn)) {
        match = existingByIsbn.get(cleanIsbn);
      }
    }

    if (!match && title && author) {
      const key = `${title}|${author}`.toLowerCase();
      if (existingByTitleAuthor.has(key)) {
        match = existingByTitleAuthor.get(key);
      }
    }

    if (match) {
      // Check for changes
      const changes: DataChangeItem[] = [];
      const updates: Partial<Book> = {};

      if (title !== match.title) {
        changes.push({ field: 'title', fieldLabel: 'タイトル', oldValue: match.title, newValue: title });
        updates.title = title;
      }
      if (author !== match.author) {
        changes.push({ field: 'author', fieldLabel: '著者名', oldValue: match.author, newValue: author });
        updates.author = author;
      }
      if (publisher && publisher !== (match.publisher || '')) {
        changes.push({ field: 'publisher', fieldLabel: '出版社', oldValue: match.publisher || '', newValue: publisher });
        updates.publisher = publisher;
      }
      if (publishedYear && publishedYear !== (match.publishedYear || '')) {
        changes.push({ field: 'publishedYear', fieldLabel: '出版年', oldValue: match.publishedYear || '', newValue: publishedYear });
        updates.publishedYear = publishedYear;
      }
      if (isbn && isbn !== (match.isbn || '')) {
        changes.push({ field: 'isbn', fieldLabel: 'ISBNコード', oldValue: match.isbn || '', newValue: isbn });
        updates.isbn = isbn;
      }
      if (genre && genre !== match.genre) {
        changes.push({ field: 'genre', fieldLabel: 'ジャンル', oldValue: match.genre, newValue: genre });
        updates.genre = genre;
      }
      if (shelfLocation && shelfLocation !== (match.shelfLocation || '')) {
        changes.push({ field: 'shelfLocation', fieldLabel: '本棚の場所', oldValue: match.shelfLocation || '', newValue: shelfLocation });
        updates.shelfLocation = shelfLocation;
      }
      if (spineColor && spineColor !== (match.spineColor || '')) {
        changes.push({ field: 'spineColor', fieldLabel: '背表紙色', oldValue: match.spineColor || '', newValue: spineColor });
        updates.spineColor = spineColor;
      }
      if (isOcrFailed !== match.isOcrFailed) {
        changes.push({
          field: 'isOcrFailed',
          fieldLabel: 'OCR点検状態',
          oldValue: match.isOcrFailed ? 'OCR読取不可' : '正常',
          newValue: isOcrFailed ? 'OCR読取不可' : '正常'
        });
        updates.isOcrFailed = isOcrFailed;
        updates.auditStatus = auditStatus;
      }
      if (auditNotes && auditNotes !== (match.auditNotes || '')) {
        changes.push({ field: 'auditNotes', fieldLabel: '点検メモ', oldValue: match.auditNotes || '', newValue: auditNotes });
        updates.auditNotes = auditNotes;
      }
      if (summary && summary !== (match.summary || '')) {
        changes.push({ field: 'summary', fieldLabel: '概要・あらすじ', oldValue: match.summary || '', newValue: summary });
        updates.summary = summary;
      }

      // Review changes
      const currentReview = match.review || { rating: 0, comment: '', tags: [], readingStatus: 'unread', updatedAt: '' };
      let reviewUpdated = false;
      const newReview = { ...currentReview };

      if (readingStatusRaw && readingStatus !== currentReview.readingStatus) {
        changes.push({
          field: 'readingStatus',
          fieldLabel: '読書状況',
          oldValue: currentReview.readingStatus,
          newValue: readingStatus
        });
        newReview.readingStatus = readingStatus;
        reviewUpdated = true;
      }
      if (ratingRaw !== undefined && !isNaN(ratingRaw) && rating !== currentReview.rating) {
        changes.push({ field: 'rating', fieldLabel: '評価 (星)', oldValue: currentReview.rating, newValue: rating });
        newReview.rating = rating;
        reviewUpdated = true;
      }
      if (comment && comment !== currentReview.comment) {
        changes.push({ field: 'comment', fieldLabel: '感想・レビュー', oldValue: currentReview.comment, newValue: comment });
        newReview.comment = comment;
        reviewUpdated = true;
      }

      if (reviewUpdated) {
        updates.review = newReview;
      }

      if (changes.length > 0) {
        toUpdate.push({
          bookId: match.id,
          original: match,
          updates,
          changes
        });
      } else {
        unchangedCount++;
      }
    } else {
      // New book
      toInsert.push({
        title,
        author,
        publisher,
        publishedYear,
        isbn,
        genre,
        shelfLocation,
        spineColor,
        isOcrFailed,
        auditStatus,
        auditNotes,
        summary,
        registeredVia: 'manual',
        review: {
          rating,
          comment,
          tags: [],
          readingStatus,
          updatedAt: new Date().toISOString()
        }
      });
    }
  });

  return {
    toInsert,
    toUpdate,
    unchangedCount,
    totalRows: dataRows.length,
    errors
  };
}
