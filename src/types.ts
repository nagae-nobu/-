export type ReadingStatus = 'unread' | 'reading' | 'completed' | 'tsundoku';
export type AuditStatus = 'normal' | 'ocr_failed';

export interface BookReview {
  rating: number; // 1 to 5, 0 if unrated
  comment: string;
  quotes?: string;
  tags: string[];
  readingStatus: ReadingStatus;
  completedDate?: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  publishedYear?: string;
  isbn?: string; // 10 or 13 digit ISBN
  genre: string;
  shelfLocation?: string; // e.g. "第1書架 A棚", "書斎上段"
  spineColor?: string; // e.g. "#3b82f6", "#ef4444", or color name
  summary?: string;
  review: BookReview;
  isOcrFailed?: boolean; // True if OCR could not recognize title/text on spine
  auditStatus?: AuditStatus; // 'normal' | 'ocr_failed'
  auditNotes?: string; // Note regarding physical book or audit status
  registeredVia?: 'scan' | 'manual';
  scanSourceImage?: string; // small thumbnail or reference
  createdAt: string;
  updatedAt: string;
  lending?: any; // Kept as optional for backward compatibility
}

export interface DetectedBook {
  tempId: string;
  title: string;
  author: string;
  publisher?: string;
  publishedYear?: string;
  isbn?: string;
  genre: string;
  description?: string;
  spineColor?: string;
  confidence: '高' | '中' | '低';
  box2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 normalized coordinates
  selected: boolean;
  isOcrFailed?: boolean; // Marked as OCR failure
}

export interface ShelfAuditSummary {
  shelfLocation: string;
  totalCount: number;
  normalCount: number;
  ocrFailedCount: number;
  successRate: number;
}

export interface CorrectionLog {
  id: string;
  bookId?: string;
  originalTitle: string; // Title before correction / OCR raw title
  correctedTitle: string; // Corrected title by user
  originalAuthor?: string;
  correctedAuthor?: string;
  publisher?: string;
  isbn?: string;
  shelfLocation?: string;
  source?: 'scan_edit' | 'detail_edit' | 'api_lookup';
  createdAt: string;
}

export interface BookLookupResult {
  title: string;
  author: string;
  publisher?: string;
  publishedYear?: string;
  isbn?: string;
  genre?: string;
  description?: string;
  coverThumbnail?: string;
  source: 'google_books' | 'openbd' | 'both';
}

export interface DataChangeItem {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
}

export interface DataAuditLog {
  id: string;
  timestamp: string; // ISO 8601 string
  actionType: 'create' | 'update' | 'delete' | 'bulk_create' | 'bulk_update' | 'bulk_delete' | 'csv_import' | 'reset';
  targetTitle: string;
  targetBookId?: string;
  details: string;
  changes?: DataChangeItem[];
  operator?: string;
}

export type IsbnMatchStatus = 'idle' | 'searching' | 'exact_matched' | 'candidates_found' | 'not_found' | 'error';

export interface BookIsbnLookupItem {
  bookId: string;
  originalTitle: string;
  originalAuthor: string;
  currentIsbn: string;
  publisher?: string;
  publishedYear?: string;
  shelfLocation?: string;
  status: IsbnMatchStatus;
  matchedIsbn?: string;
  matchedTitle?: string;
  matchedAuthor?: string;
  matchedPublisher?: string;
  matchedPublishedYear?: string;
  candidates: BookLookupResult[];
  selectedCandidateIndex: number; // -1 if not selected, 0..n for candidate
  selectedIsbn: string; // The ISBN to apply
  applyTitle?: string;
  applyAuthor?: string;
  applyPublisher?: string;
  applyPublishedYear?: string;
  selectedForUpdate: boolean;
  errorMessage?: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'registrar';

export interface UserAccount {
  id: string; // 'admin' | 'user1' | 'user2' | 'user3' | custom
  username: string;
  displayName: string;
  role: UserRole;
  roleLabel: string;
  description: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}



