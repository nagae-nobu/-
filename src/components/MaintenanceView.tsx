import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wrench, 
  Trash2, 
  Edit3, 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Check, 
  X, 
  RefreshCw, 
  Layers, 
  ArrowRight, 
  FileUp, 
  Database,
  Filter,
  Eye,
  Sliders,
  Sparkles,
  Info,
  Users
} from 'lucide-react';
import { Book, ReadingStatus, AuditStatus, DataAuditLog, DataChangeItem, UserAccount } from '../types';
import { exportBooksToCSV } from '../utils/csvExport';
import { analyzeCsvDiff, ParsedCsvDiff } from '../utils/csvImport';
import { UserManagementView } from './UserManagementView';

interface MaintenanceViewProps {
  books: Book[];
  onRefreshBooks: () => Promise<void>;
  onNavigateToTab: (tab: 'library' | 'scan' | 'audit' | 'reviews') => void;
  users: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
  currentUser: UserAccount;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  books,
  onRefreshBooks,
  onNavigateToTab,
  users,
  onUpdateUsers,
  currentUser
}) => {
  // Main sub-tabs within Maintenance
  const [subTab, setSubTab] = useState<'bulk' | 'csv' | 'logs' | 'users'>('bulk');

  // --- SUB-TAB 1: BULK MANAGEMENT STATE ---
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shelfFilter, setShelfFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Bulk update modal state
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState<boolean>(false);
  const [bulkShelf, setBulkShelf] = useState<string>('');
  const [bulkGenre, setBulkGenre] = useState<string>('');
  const [bulkReadingStatus, setBulkReadingStatus] = useState<string>('');
  const [bulkAuditStatus, setBulkAuditStatus] = useState<string>('');
  const [bulkPublisher, setBulkPublisher] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);

  // Bulk manual register modal state
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState<boolean>(false);
  const [bulkAddText, setBulkAddText] = useState<string>('');
  const [bulkAddShelf, setBulkAddShelf] = useState<string>('第1書架 A-1棚');
  const [bulkAddGenre, setBulkAddGenre] = useState<string>('一般');
  const [isBulkAdding, setIsBulkAdding] = useState<boolean>(false);

  // --- SUB-TAB 2: CSV IMPORT / EXPORT STATE ---
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [csvDiff, setCsvDiff] = useState<ParsedCsvDiff | null>(null);
  const [isAnalyzingCsv, setIsAnalyzingCsv] = useState<boolean>(false);
  const [isImportingCsv, setIsImportingCsv] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SUB-TAB 3: DATA AUDIT LOGS STATE ---
  const [logs, setLogs] = useState<DataAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logFilterAction, setLogFilterAction] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  // Extract distinct shelf locations
  const availableShelves = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => {
      if (b.shelfLocation) set.add(b.shelfLocation);
    });
    return Array.from(set);
  }, [books]);

  // Filtered books for bulk table
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = searchQuery === '' || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.isbn && book.isbn.includes(searchQuery)) ||
        (book.publisher && book.publisher.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesShelf = shelfFilter === 'all' || (book.shelfLocation || '未分類') === shelfFilter;

      const isFailed = book.isOcrFailed || book.title.includes('OCR読み取り不可');
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'ocr_failed' && isFailed) ||
        (statusFilter === 'normal' && !isFailed);

      return matchesSearch && matchesShelf && matchesStatus;
    });
  }, [books, searchQuery, shelfFilter, statusFilter]);

  // Load audit logs from server
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/data-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch data audit logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (subTab === 'logs') {
      fetchLogs();
    }
  }, [subTab]);

  // --- BULK SELECTION HANDLERS ---
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookIds(filteredBooks.map(b => b.id));
    } else {
      setSelectedBookIds([]);
    }
  };

  const handleToggleSelectBook = (id: string) => {
    setSelectedBookIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Modals for confirmation
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState<boolean>(false);
  const [deleteAllConfirmCheckbox, setDeleteAllConfirmCheckbox] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // In-app Toast message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // --- BULK DELETE HANDLERS ---
  const handleBulkDeleteClick = () => {
    if (selectedBookIds.length === 0) {
      showToast('一括削除する書籍をチェックボックスで選択してください。', 'info');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  const executeBulkDelete = async () => {
    if (selectedBookIds.length === 0) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/books/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBookIds })
      });
      if (res.ok) {
        const count = selectedBookIds.length;
        setSelectedBookIds([]);
        setIsBulkDeleteModalOpen(false);
        await onRefreshBooks();
        if (subTab === 'logs') fetchLogs();
        showToast(`${count} 冊の書籍を一括削除しました。`, 'success');
      } else {
        const data = await res.json();
        showToast(`削除に失敗しました: ${data.error || '不明なエラー'}`, 'error');
      }
    } catch (e) {
      showToast('一括削除リクエスト中に通信エラーが発生しました。', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllClick = () => {
    if (books.length === 0) {
      showToast('削除する書籍データがありません。', 'info');
      return;
    }
    setDeleteAllConfirmCheckbox(false);
    setIsDeleteAllModalOpen(true);
  };

  const executeDeleteAll = async () => {
    if (books.length === 0) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/books/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        const count = books.length;
        setSelectedBookIds([]);
        setIsDeleteAllModalOpen(false);
        await onRefreshBooks();
        if (subTab === 'logs') fetchLogs();
        showToast(`すべての蔵書データ（全 ${count} 冊）を消去しました。`, 'success');
      } else {
        showToast('全件削除処理に失敗しました。', 'error');
      }
    } catch (e) {
      showToast('全件削除処理中に通信エラーが発生しました。', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- BULK UPDATE HANDLER ---
  const handleApplyBulkUpdate = async () => {
    if (selectedBookIds.length === 0) return;

    const updates: any = {};
    if (bulkShelf.trim()) updates.shelfLocation = bulkShelf.trim();
    if (bulkGenre.trim()) updates.genre = bulkGenre.trim();
    if (bulkPublisher.trim()) updates.publisher = bulkPublisher.trim();
    if (bulkReadingStatus) {
      updates.review = { readingStatus: bulkReadingStatus };
    }
    if (bulkAuditStatus) {
      const isFailed = bulkAuditStatus === 'ocr_failed';
      updates.isOcrFailed = isFailed;
      updates.auditStatus = isFailed ? 'ocr_failed' : 'normal';
      if (!isFailed) {
        updates.auditNotes = '一括点検確認済';
      }
    }

    if (Object.keys(updates).length === 0) {
      showToast('更新する項目を少なくとも1つ指定してください。', 'error');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const res = await fetch('/api/books/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBookIds, updates })
      });
      if (res.ok) {
        const count = selectedBookIds.length;
        setIsBulkUpdateModalOpen(false);
        setBulkShelf('');
        setBulkGenre('');
        setBulkPublisher('');
        setBulkReadingStatus('');
        setBulkAuditStatus('');
        setSelectedBookIds([]);
        await onRefreshBooks();
        if (subTab === 'logs') fetchLogs();
        showToast(`${count} 冊の書籍を一括更新しました。`, 'success');
      } else {
        const data = await res.json();
        showToast(`一括更新エラー: ${data.error || '不明なエラー'}`, 'error');
      }
    } catch (e) {
      showToast('一括更新通信中にエラーが発生しました。', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // --- BULK REGISTER HANDLER (TEXT LIST) ---
  const handleApplyBulkAdd = async () => {
    const lines = bulkAddText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      showToast('登録する書籍を入力してください。', 'error');
      return;
    }

    // Parse each line: "Title" or "Title, Author" or "Title / Author"
    const newBooks = lines.map((line) => {
      let title = line;
      let author = '著者不明';

      if (line.includes('\t')) {
        const parts = line.split('\t');
        title = parts[0]?.trim() || line;
        author = parts[1]?.trim() || '著者不明';
      } else if (line.includes(',')) {
        const parts = line.split(',');
        title = parts[0]?.trim() || line;
        author = parts[1]?.trim() || '著者不明';
      } else if (line.includes(' / ')) {
        const parts = line.split(' / ');
        title = parts[0]?.trim() || line;
        author = parts[1]?.trim() || '著者不明';
      }

      return {
        title,
        author,
        shelfLocation: bulkAddShelf.trim() || '第1書架 A-1棚',
        genre: bulkAddGenre.trim() || '一般',
        isOcrFailed: false,
        auditStatus: 'normal' as AuditStatus,
        auditNotes: '一括手動登録',
        registeredVia: 'manual' as const,
        review: {
          rating: 0,
          comment: '',
          tags: ['一括登録'],
          readingStatus: 'unread' as ReadingStatus,
          updatedAt: new Date().toISOString()
        }
      };
    });

    setIsBulkAdding(true);
    try {
      const res = await fetch('/api/books/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inserts: newBooks, updates: [], source: 'bulk_create' })
      });
      if (res.ok) {
        setIsBulkAddModalOpen(false);
        setBulkAddText('');
        await onRefreshBooks();
        if (subTab === 'logs') fetchLogs();
        showToast(`${newBooks.length} 冊の書籍を一括新規登録しました。`, 'success');
      } else {
        const data = await res.json();
        showToast(`一括登録エラー: ${data.error || '不明なエラー'}`, 'error');
      }
    } catch (e) {
      showToast('一括登録処理でエラーが発生しました。', 'error');
    } finally {
      setIsBulkAdding(false);
    }
  };

  // --- CSV IMPORT HANDLERS ---
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setImportSuccessMessage(null);
    setIsAnalyzingCsv(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      try {
        const diff = analyzeCsvDiff(text, books);
        setCsvDiff(diff);
      } catch (err: any) {
        showToast('CSVファイルの解析に失敗しました: ' + err.message, 'error');
      } finally {
        setIsAnalyzingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteCsvImport = async () => {
    if (!csvDiff) return;

    if (csvDiff.toInsert.length === 0 && csvDiff.toUpdate.length === 0) {
      showToast('インポート対象の新規書籍または変更点がありません。', 'info');
      return;
    }

    setIsImportingCsv(true);
    try {
      const payload = {
        inserts: csvDiff.toInsert,
        updates: csvDiff.toUpdate.map(u => ({ id: u.bookId, updates: u.updates })),
        source: 'csv_import'
      };

      const res = await fetch('/api/books/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        const msg = `CSVインポートが完了しました！（新規登録: ${result.insertedCount}冊、更新: ${result.updatedCount}冊）`;
        setImportSuccessMessage(msg);
        showToast(msg, 'success');
        setCsvDiff(null);
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await onRefreshBooks();
        if (subTab === 'logs') fetchLogs();
      } else {
        const data = await res.json();
        showToast(`インポートに失敗しました: ${data.error || '不明なエラー'}`, 'error');
      }
    } catch (e) {
      showToast('CSVインポート通信中にエラーが発生しました。', 'error');
    } finally {
      setIsImportingCsv(false);
    }
  };

  // Clear all audit logs
  const handleClearAuditLogsClick = () => {
    if (logs.length === 0) {
      showToast('消去するログがありません。', 'info');
      return;
    }
    setIsClearLogsModalOpen(true);
  };

  const executeClearLogs = async () => {
    try {
      const res = await fetch('/api/data-logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setIsClearLogsModalOpen(false);
        showToast('データ修正ログを消去しました。', 'success');
      } else {
        showToast('ログ消去に失敗しました。', 'error');
      }
    } catch (e) {
      showToast('ログ消去中に通信エラーが発生しました。', 'error');
    }
  };

  // Export audit logs to CSV
  const handleExportLogsCSV = () => {
    if (logs.length === 0) {
      showToast('エクスポートするログがありません。', 'info');
      return;
    }

    const headers = ['日時', '操作種別', '対象タイトル', '詳細内容', '変更差分', '操作者'];
    const rows = [headers.join(',')];

    logs.forEach(l => {
      const diffText = (l.changes || []).map(c => `${c.fieldLabel}: ${c.oldValue} -> ${c.newValue}`).join('; ');
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      const dateStr = new Date(l.timestamp).toLocaleString('ja-JP');
      rows.push([
        escape(dateStr),
        escape(l.actionType),
        escape(l.targetTitle),
        escape(l.details),
        escape(diffText),
        escape(l.operator || 'ユーザー')
      ].join(','));
    });

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `データ修正ログ_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesAction = logFilterAction === 'all' || log.actionType === logFilterAction;
      const matchesSearch = logSearchQuery === '' || 
        log.targetTitle.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        (log.changes || []).some(c => c.fieldLabel.includes(logSearchQuery) || String(c.newValue).includes(logSearchQuery));
      return matchesAction && matchesSearch;
    });
  }, [logs, logFilterAction, logSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#5D6D5F] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[#3E362E] font-serif">
                データベース・データメンテナンス
              </h2>
              <span className="text-[11px] font-semibold bg-[#EDF2EE] text-[#425044] border border-[#D0DCD2] px-2 py-0.5 rounded-md">
                一括処理・CSV双方向同期
              </span>
            </div>
            <p className="text-xs text-[#786C5E] mt-0.5">
              登録書籍の一括更新・一括削除・一括新規登録、CSVエクスポート＆修正後CSVインポート更新、過去1週間の修正履歴ログの確認が行えます。
            </p>
          </div>
        </div>

        {/* Action button to return or reset */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateToTab('library')}
            className="px-3.5 py-1.5 bg-[#F7F3EE] hover:bg-[#EAE4DB] text-[#3E362E] text-xs font-semibold rounded-lg border border-[#D9C5B2] transition-colors cursor-pointer"
          >
            蔵書一覧に戻る
          </button>
        </div>
      </div>

      {/* In-app Toast Notification */}
      {toast && (
        <div 
          className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between shadow-md transition-all animate-fadeIn ${
            toast.type === 'success' 
              ? 'bg-[#EDF2EE] border-[#CCDACC] text-[#2D5A34]'
              : toast.type === 'error'
              ? 'bg-[#FDF2F2] border-[#F8B4B4] text-[#9A392F]'
              : 'bg-[#F7F3EE] border-[#D9C5B2] text-[#3E362E]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#2D5A34] shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-[#9A392F] shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-[#5D6D5F] shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Sub Tabs */}
      <div className="flex border-b border-[#E8E1D7] gap-2 overflow-x-auto pb-1 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          id="maintenance-subtab-bulk"
          onClick={() => setSubTab('bulk')}
          className={`py-2 px-3.5 sm:px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 rounded-t-lg ${
            subTab === 'bulk'
              ? 'border-[#5D6D5F] text-[#3E362E] bg-[#F7F3EE]/60'
              : 'border-transparent text-[#786C5E] hover:text-[#3E362E] hover:bg-[#FDFBF7]'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#5D6D5F]" />
          <span>データ一括管理（更新・削除・登録）</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAE4DB] text-[#3E362E]">
            {books.length}冊
          </span>
        </button>

        <button
          type="button"
          id="maintenance-subtab-csv"
          onClick={() => setSubTab('csv')}
          className={`py-2 px-3.5 sm:px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 rounded-t-lg ${
            subTab === 'csv'
              ? 'border-[#5D6D5F] text-[#3E362E] bg-[#F7F3EE]/60'
              : 'border-transparent text-[#786C5E] hover:text-[#3E362E] hover:bg-[#FDFBF7]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-[#5D6D5F]" />
          <span>CSVエクスポート ＆ インポート更新</span>
        </button>

        <button
          type="button"
          id="maintenance-subtab-logs"
          onClick={() => setSubTab('logs')}
          className={`py-2 px-3.5 sm:px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 rounded-t-lg ${
            subTab === 'logs'
              ? 'border-[#5D6D5F] text-[#3E362E] bg-[#F7F3EE]/60'
              : 'border-transparent text-[#786C5E] hover:text-[#3E362E] hover:bg-[#FDFBF7]'
          }`}
        >
          <History className="w-4 h-4 text-[#5D6D5F]" />
          <span>データ修正ログ（1週間保持）</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
            7日間
          </span>
        </button>

        <button
          type="button"
          id="maintenance-subtab-users"
          onClick={() => setSubTab('users')}
          className={`py-2 px-3.5 sm:px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer shrink-0 rounded-t-lg ${
            subTab === 'users'
              ? 'border-[#8C5D39] text-[#8C5D39] bg-[#FAF0E6]/60'
              : 'border-transparent text-[#786C5E] hover:text-[#8C5D39] hover:bg-[#FAF0E6]/30'
          }`}
        >
          <Users className="w-4 h-4 text-[#8C5D39]" />
          <span>ユーザー管理（管理者）</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#FAF0E6] text-[#8C5D39] border border-[#E8D4C0]">
            {users.length}名
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: BULK DATA MANAGEMENT (UPDATE / DELETE / REGISTER)              */}
      {/* ========================================================================= */}
      {subTab === 'bulk' && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter inputs */}
            <div className="flex flex-wrap items-center gap-2 text-xs flex-1">
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8C7355]" />
                <input
                  type="text"
                  placeholder="タイトル、著者、ISBN、出版社で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F7F3EE] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                />
              </div>

              <select
                value={shelfFilter}
                onChange={(e) => setShelfFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F7F3EE] border border-[#D9C5B2] rounded-lg text-[#3E362E]"
              >
                <option value="all">すべての本棚場所 ({books.length})</option>
                {availableShelves.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F7F3EE] border border-[#D9C5B2] rounded-lg text-[#3E362E]"
              >
                <option value="all">すべての点検状態</option>
                <option value="normal">正常認識のみ</option>
                <option value="ocr_failed">OCR読取不可のみ</option>
              </select>

              {(searchQuery || shelfFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShelfFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-2 py-1 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
                >
                  リセット
                </button>
              )}
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1.5">
              <button
                type="button"
                id="maintenance-bulk-add-btn"
                onClick={() => setIsBulkAddModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 bg-[#EDF2EE] hover:bg-[#DDE7DE] text-[#2D5A34] border border-[#BED2C1] rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>一括新規登録</span>
              </button>

              <button
                type="button"
                id="maintenance-bulk-update-btn"
                onClick={() => {
                  if (selectedBookIds.length === 0) {
                    showToast('一括更新を行う書籍をチェックボックスで選択してください。', 'info');
                    return;
                  }
                  setIsBulkUpdateModalOpen(true);
                }}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                  selectedBookIds.length > 0 
                    ? 'bg-[#5D6D5F] hover:bg-[#4B594D] text-white' 
                    : 'bg-[#F7F3EE] text-[#786C5E] border border-[#D9C5B2] hover:bg-[#EAE4DB]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                <span>一括更新 {selectedBookIds.length > 0 ? `(${selectedBookIds.length}冊)` : ''}</span>
              </button>

              <button
                type="button"
                id="maintenance-bulk-delete-btn"
                onClick={handleBulkDeleteClick}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                  selectedBookIds.length > 0
                    ? 'bg-[#FDF2F2] hover:bg-[#FDE8E8] text-[#9A392F] border border-[#F8B4B4]'
                    : 'bg-[#F7F3EE] text-[#786C5E] border border-[#E8E1D7] hover:bg-[#EAE4DB]'
                }`}
                title={selectedBookIds.length > 0 ? `選択中の ${selectedBookIds.length} 冊を一括削除` : '書籍を選択して一括削除'}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-[#9A392F]" />
                <span>一括削除 {selectedBookIds.length > 0 ? `(${selectedBookIds.length}冊)` : ''}</span>
              </button>

              <button
                type="button"
                id="maintenance-delete-all-btn"
                onClick={handleDeleteAllClick}
                className="inline-flex items-center px-3 py-1.5 bg-[#FFF5F5] hover:bg-[#FED7D7] text-[#C53030] border border-[#FEB2B2] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="全データを削除してデータベースを初期化"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-[#C53030]" />
                <span>全件削除</span>
              </button>
            </div>
          </div>

          {/* Selection indicator & helper */}
          <div className="flex items-center justify-between text-xs text-[#786C5E] px-1">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1.5 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={filteredBooks.length > 0 && selectedBookIds.length === filteredBooks.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-[#D9C5B2] text-[#5D6D5F] focus:ring-[#5D6D5F] w-4 h-4 cursor-pointer"
                />
                <span>表示中の全 {filteredBooks.length} 冊を選択</span>
              </label>
              {selectedBookIds.length > 0 && (
                <span className="font-bold text-[#3E362E] bg-[#EDF2EE] px-2 py-0.5 rounded-md border border-[#D0DCD2]">
                  {selectedBookIds.length} 冊選択中
                </span>
              )}
            </div>
            <span>※左端のチェックボックスで対象を選択し、上部の一括更新・一括削除ボタンを押してください。</span>
          </div>

          {/* Books Bulk Table */}
          <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs text-[#3E362E]">
                <thead className="bg-[#F7F3EE] text-[#786C5E] border-b border-[#E8E1D7] sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredBooks.length > 0 && selectedBookIds.length === filteredBooks.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-[#D9C5B2] text-[#5D6D5F] focus:ring-[#5D6D5F] w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-2 font-medium">書籍タイトル</th>
                    <th className="py-3 px-2 font-medium">著者名</th>
                    <th className="py-3 px-2 font-medium">本棚・配架場所</th>
                    <th className="py-3 px-2 font-medium">ジャンル</th>
                    <th className="py-3 px-2 font-medium">ISBN</th>
                    <th className="py-3 px-2 font-medium">点検状態</th>
                    <th className="py-3 px-2 font-medium">読書状況</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE9E0]">
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#A99C8E]">
                        条件に一致する書籍が見つかりませんでした。
                      </td>
                    </tr>
                  ) : (
                    filteredBooks.map((book) => {
                      const isSelected = selectedBookIds.includes(book.id);
                      const isFailed = book.isOcrFailed || book.title.includes('OCR読み取り不可');

                      return (
                        <tr
                          key={book.id}
                          className={`hover:bg-[#F9F6F0] transition-colors ${
                            isSelected ? 'bg-[#F2F6F3]' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectBook(book.id)}
                              className="rounded border-[#D9C5B2] text-[#5D6D5F] focus:ring-[#5D6D5F] w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-2 font-medium max-w-[240px]">
                            <div className="truncate" title={book.title}>
                              {book.title}
                            </div>
                            <span className="text-[10px] text-[#A99C8E] block truncate">
                              ID: {book.id}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-[#524436] max-w-[150px] truncate">
                            {book.author}
                          </td>
                          <td className="py-2.5 px-2 text-[#524436]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-[#F7F3EE] border border-[#E8E1D7]">
                              {book.shelfLocation || '未分類'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-[#786C5E]">
                            {book.genre || '-'}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[11px] text-[#786C5E]">
                            {book.isbn || '-'}
                          </td>
                          <td className="py-2.5 px-2">
                            {isFailed ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                                読取不可
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EDF2EE] text-[#334A36] border border-[#CCDACC]">
                                正常
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="text-[11px] text-[#786C5E]">
                              {book.review?.readingStatus === 'completed'
                                ? '読了'
                                : book.review?.readingStatus === 'reading'
                                ? '読書中'
                                : book.review?.readingStatus === 'tsundoku'
                                ? '積読'
                                : '未読'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: CSV EXPORT & IMPORT UPDATES                                   */}
      {/* ========================================================================= */}
      {subTab === 'csv' && (
        <div className="space-y-6">
          {/* Success Banner if import completed */}
          {importSuccessMessage && (
            <div className="p-4 bg-[#EDF2EE] border border-[#BED2C1] rounded-xl flex items-center justify-between text-xs text-[#2D5A34]">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-[#2D5A34] shrink-0" />
                <span className="font-bold">{importSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportSuccessMessage(null)}
                className="text-[#5D6D5F] hover:text-[#3E362E] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Workflow Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Export Card */}
            <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#5D6D5F] text-white flex items-center justify-center text-xs font-bold font-mono">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-[#3E362E] font-serif">
                    現在の登録データをCSVエクスポート
                  </h3>
                </div>
                <p className="text-xs text-[#786C5E] leading-relaxed">
                  現在登録されているすべての書籍データを、ID付きのUTF-8（BOM対応・Excel互換）CSVファイルとしてダウンロードします。Excelやスプレッドシートで開いてタイトル、著者、本棚、ISBN、評価などを自由に修正・加筆できます。
                </p>
              </div>

              <div className="pt-2 border-t border-[#EFE9E0] flex items-center justify-between">
                <span className="text-xs text-[#786C5E]">全 {books.length} 冊のデータ</span>
                <button
                  type="button"
                  onClick={() => exportBooksToCSV(books)}
                  className="px-4 py-2 bg-[#5D6D5F] hover:bg-[#4B594D] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-2 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>蔵書CSVをダウンロード</span>
                </button>
              </div>
            </div>

            {/* Step 2: Import Card */}
            <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#5D6D5F] text-white flex items-center justify-center text-xs font-bold font-mono">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-[#3E362E] font-serif">
                    修正したCSVをインポートして更新
                  </h3>
                </div>
                <p className="text-xs text-[#786C5E] leading-relaxed">
                  エクスポートしたCSVを編集後、ここにアップロードします。ID列をもとに既存書籍を自動で上書き更新（Update）し、IDが空または新規の行は新しい書籍として追加（Insert）します。インポート前に変更差分を確認できます。
                </p>
              </div>

              <div className="pt-2 border-t border-[#EFE9E0]">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                  id="csv-file-upload-input"
                />
                <label
                  htmlFor="csv-file-upload-input"
                  className="w-full py-2.5 px-4 bg-[#EDF2EE] hover:bg-[#DDE7DE] border border-dashed border-[#BED2C1] rounded-lg text-xs font-semibold text-[#2D5A34] flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-[#2D5A34]" />
                  <span>
                    {csvFile ? `選択中: ${csvFile.name}` : '修正後のCSVファイルを選択・アップロード'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Analyzing indicator */}
          {isAnalyzingCsv && (
            <div className="p-8 bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl flex items-center justify-center space-x-3 text-xs text-[#786C5E]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#5D6D5F]" />
              <span>CSV差分を解析中...</span>
            </div>
          )}

          {/* Diff Preview Panel */}
          {csvDiff && (
            <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EFE9E0] gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[#3E362E] font-serif flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-[#5D6D5F]" />
                    <span>CSV解析結果プレビュー（差分確認）</span>
                  </h4>
                  <p className="text-xs text-[#786C5E] mt-0.5">
                    CSVファイル内の {csvDiff.totalRows} 行を既存データベースと照合しました。
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvDiff(null);
                      setCsvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-3 py-1.5 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCsvImport}
                    disabled={isImportingCsv || (csvDiff.toInsert.length === 0 && csvDiff.toUpdate.length === 0)}
                    className="px-4 py-1.5 bg-[#5D6D5F] hover:bg-[#4B594D] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isImportingCsv ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>更新中...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>インポートを実行して更新</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#EDF2EE] border border-[#BED2C1] p-3 rounded-lg">
                  <span className="text-[#425044] block font-medium">新規追加 (Insert)</span>
                  <span className="text-xl font-bold text-[#2D5A34]">{csvDiff.toInsert.length}</span>
                  <span className="text-[10px] text-[#425044] block">冊の新規書籍を登録</span>
                </div>

                <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-lg">
                  <span className="text-[#92400E] block font-medium">上書き更新 (Update)</span>
                  <span className="text-xl font-bold text-[#B45309]">{csvDiff.toUpdate.length}</span>
                  <span className="text-[10px] text-[#92400E] block">冊の内容を修正・更新</span>
                </div>

                <div className="bg-[#F7F3EE] border border-[#E8E1D7] p-3 rounded-lg">
                  <span className="text-[#786C5E] block font-medium">変更なし (Unchanged)</span>
                  <span className="text-xl font-bold text-[#524436]">{csvDiff.unchangedCount}</span>
                  <span className="text-[10px] text-[#786C5E] block">冊は既存と同じ</span>
                </div>

                <div className="bg-[#FFF5F5] border border-[#FEB2B2] p-3 rounded-lg">
                  <span className="text-[#9A392F] block font-medium">エラー行</span>
                  <span className="text-xl font-bold text-[#C53030]">{csvDiff.errors.length}</span>
                  <span className="text-[10px] text-[#9A392F] block">行（書名空欄等）</span>
                </div>
              </div>

              {/* Updates detailed table */}
              {csvDiff.toUpdate.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-[#3E362E]">
                    【上書き更新される書籍の変更差分 ({csvDiff.toUpdate.length}件)】
                  </h5>
                  <div className="border border-[#E8E1D7] rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F3EE] text-[#786C5E] border-b border-[#E8E1D7]">
                        <tr>
                          <th className="py-2 px-3">対象書籍</th>
                          <th className="py-2 px-3">変更項目</th>
                          <th className="py-2 px-3">変更前 (元データ)</th>
                          <th className="py-2 px-3">変更後 (CSV)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE9E0] bg-white">
                        {csvDiff.toUpdate.map((item, idx) => (
                          <React.Fragment key={idx}>
                            {item.changes.map((ch, cIdx) => (
                              <tr key={cIdx} className="hover:bg-[#FDFBF7]">
                                {cIdx === 0 && (
                                  <td
                                    rowSpan={item.changes.length}
                                    className="py-2 px-3 font-medium text-[#3E362E] align-top bg-[#FAFAF8] border-r border-[#EFE9E0] max-w-[200px]"
                                  >
                                    <div className="truncate font-semibold">{item.original.title}</div>
                                    <div className="text-[10px] text-[#A99C8E]">ID: {item.bookId}</div>
                                  </td>
                                )}
                                <td className="py-1.5 px-3 text-[#5D6D5F] font-semibold">
                                  {ch.fieldLabel}
                                </td>
                                <td className="py-1.5 px-3 text-[#9A392F] line-through max-w-[180px] truncate">
                                  {String(ch.oldValue ?? '') || '(空欄)'}
                                </td>
                                <td className="py-1.5 px-3 text-[#2D5A34] font-medium max-w-[180px] truncate">
                                  {String(ch.newValue ?? '') || '(空欄)'}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Inserts list */}
              {csvDiff.toInsert.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-[#2D5A34]">
                    【新規追加される書籍 ({csvDiff.toInsert.length}件)】
                  </h5>
                  <div className="border border-[#BED2C1] bg-[#F4F8F5] rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-1 text-xs">
                    {csvDiff.toInsert.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-[#334A36]">
                        <Plus className="w-3 h-3 text-[#2D5A34] shrink-0" />
                        <span className="font-semibold">{item.title}</span>
                        <span className="text-[11px] text-[#526655]">/ {item.author}</span>
                        <span className="text-[10px] bg-white px-1.5 py-0.2 rounded border border-[#CCDACC]">
                          {item.shelfLocation || '未分類'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors list if any */}
              {csvDiff.errors.length > 0 && (
                <div className="p-3 bg-[#FFF5F5] border border-[#FEB2B2] rounded-lg text-xs text-[#C53030] space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>スキップされた行:</span>
                  </div>
                  {csvDiff.errors.map((err, idx) => (
                    <div key={idx} className="text-[11px]">
                      行 {err.row}: {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: DATA AUDIT LOGS (1-WEEK RETENTION)                            */}
      {/* ========================================================================= */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          {/* Controls and Retention notice */}
          <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-[#B45309]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-[#3E362E] block">
                  修正ログ 1週間保存ポリシー
                </span>
                <span className="text-[11px] text-[#786C5E]">
                  過去7日間のデータ変更履歴（個別編集・一括更新・CSVインポート等）を記録しています。7日以上経過したログは自動消去されます。
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="px-2.5 py-1.5 bg-[#F7F3EE] hover:bg-[#EAE4DB] text-[#3E362E] text-xs font-semibold rounded-lg border border-[#D9C5B2] flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>再読込</span>
              </button>

              <button
                type="button"
                onClick={handleExportLogsCSV}
                disabled={logs.length === 0}
                className="px-3 py-1.5 bg-[#F7F3EE] hover:bg-[#EAE4DB] text-[#3E362E] text-xs font-semibold rounded-lg border border-[#D9C5B2] flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#5D6D5F]" />
                <span>ログCSV出力</span>
              </button>

              <button
                type="button"
                onClick={handleClearAuditLogsClick}
                disabled={logs.length === 0}
                className="px-2.5 py-1.5 bg-[#FFF5F5] hover:bg-[#FED7D7] text-[#C53030] text-xs font-semibold rounded-lg border border-[#FEB2B2] disabled:opacity-40 cursor-pointer"
              >
                ログ手動消去
              </button>
            </div>
          </div>

          {/* Search & Action Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8C7355]" />
              <input
                type="text"
                placeholder="書籍名や変更内容でログを検索..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
              />
            </div>

            <select
              value={logFilterAction}
              onChange={(e) => setLogFilterAction(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg text-[#3E362E]"
            >
              <option value="all">すべての操作種別 ({logs.length})</option>
              <option value="update">個別更新</option>
              <option value="bulk_update">一括更新</option>
              <option value="csv_import">CSVインポート</option>
              <option value="create">新規登録</option>
              <option value="delete">削除</option>
              <option value="bulk_delete">一括削除</option>
              <option value="reset">初期化</option>
            </select>
          </div>

          {/* Audit Logs List */}
          <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl overflow-hidden shadow-xs divide-y divide-[#EFE9E0]">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#A99C8E]">
                該当するデータ修正ログはありません。
              </div>
            ) : (
              filteredLogs.map((log) => {
                const date = new Date(log.timestamp);
                const formattedTime = date.toLocaleString('ja-JP', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                // Compute relative time
                const diffMs = Date.now() - date.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const relativeText = diffHours < 1 ? 'たった今' : diffHours < 24 ? `${diffHours}時間前` : `${Math.floor(diffHours / 24)}日前`;

                let actionLabel = '更新';
                let badgeClass = 'bg-[#EDF2EE] text-[#334A36] border-[#BED2C1]';

                if (log.actionType === 'bulk_update') {
                  actionLabel = '一括更新';
                  badgeClass = 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
                } else if (log.actionType === 'csv_import') {
                  actionLabel = 'CSV同期';
                  badgeClass = 'bg-[#EBF5FF] text-[#1E429F] border-[#B4C6FC]';
                } else if (log.actionType === 'bulk_delete' || log.actionType === 'delete') {
                  actionLabel = '削除';
                  badgeClass = 'bg-[#FFF5F5] text-[#C53030] border-[#FEB2B2]';
                } else if (log.actionType === 'create' || log.actionType === 'bulk_create') {
                  actionLabel = '新規登録';
                  badgeClass = 'bg-[#EDF2EE] text-[#2D5A34] border-[#BED2C1]';
                } else if (log.actionType === 'reset') {
                  actionLabel = 'サンプル復元';
                  badgeClass = 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
                }

                return (
                  <div key={log.id} className="p-4 hover:bg-[#FAF7F2] transition-colors space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeClass}`}>
                          {actionLabel}
                        </span>
                        <h4 className="text-xs font-bold text-[#3E362E] font-serif">
                          {log.targetTitle}
                        </h4>
                        {log.operator && (
                          <span className="text-[10px] text-[#8C7355] bg-[#F7F3EE] px-1.5 py-0.2 rounded border border-[#E8E1D7]">
                            {log.operator}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-[#A99C8E]">
                        <span>{relativeText}</span>
                        <span>({formattedTime})</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#524436] leading-relaxed">
                      {log.details}
                    </p>

                    {/* Change pills if any */}
                    {log.changes && log.changes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {log.changes.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-[#F7F3EE] border border-[#E8E1D7] text-[#524436]"
                          >
                            <span className="font-semibold text-[#5D6D5F] mr-1">{c.fieldLabel}:</span>
                            <span className="text-[#9A392F] line-through mr-1">{String(c.oldValue ?? '')}</span>
                            <ArrowRight className="w-2.5 h-2.5 mx-0.5 text-[#A99C8E]" />
                            <span className="text-[#2D5A34] font-medium ml-1">{String(c.newValue ?? '')}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: USER ACCOUNT MANAGEMENT (ADMIN ONLY)                          */}
      {/* ========================================================================= */}
      {subTab === 'users' && (
        <UserManagementView
          users={users}
          onUpdateUsers={onUpdateUsers}
          currentUser={currentUser}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK UPDATE                                                        */}
      {/* ========================================================================= */}
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FDFBF7] border border-[#D9C5B2] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE9E0]">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#5D6D5F]" />
                <h3 className="text-sm font-bold text-[#3E362E] font-serif">
                  選択した {selectedBookIds.length} 冊の一括情報更新
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkUpdateModalOpen(false)}
                className="text-[#A99C8E] hover:text-[#3E362E] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#786C5E]">
              変更したい項目のみ入力・選択してください。空欄の項目は元のデータがそのまま保持されます。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#786C5E] mb-1">本棚・保管場所の一括変更</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="例: 第2書架 B棚、書斎..."
                    value={bulkShelf}
                    onChange={(e) => setBulkShelf(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                  />
                  {availableShelves.length > 0 && (
                    <select
                      onChange={(e) => setBulkShelf(e.target.value)}
                      className="px-2 py-1.5 bg-[#F7F3EE] border border-[#D9C5B2] rounded-lg text-xs"
                    >
                      <option value="">既存本棚から選択</option>
                      {availableShelves.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#786C5E] mb-1">ジャンルの一括変更</label>
                <input
                  type="text"
                  placeholder="例: 技術書、ビジネス、文学..."
                  value={bulkGenre}
                  onChange={(e) => setBulkGenre(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#786C5E] mb-1">読書状況の一括変更</label>
                <select
                  value={bulkReadingStatus}
                  onChange={(e) => setBulkReadingStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg"
                >
                  <option value="">変更しない（現状維持）</option>
                  <option value="unread">未読</option>
                  <option value="reading">読書中</option>
                  <option value="completed">読了</option>
                  <option value="tsundoku">積読</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#786C5E] mb-1">点検状態の一括変更</label>
                <select
                  value={bulkAuditStatus}
                  onChange={(e) => setBulkAuditStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg"
                >
                  <option value="">変更しない（現状維持）</option>
                  <option value="normal">正常認識（点検済として確定）</option>
                  <option value="ocr_failed">OCR読取不可（要現物確認としてマーク）</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#786C5E] mb-1">出版社の一括変更</label>
                <input
                  type="text"
                  placeholder="出版社名..."
                  value={bulkPublisher}
                  onChange={(e) => setBulkPublisher(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE9E0] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsBulkUpdateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApplyBulkUpdate}
                disabled={isBulkUpdating}
                className="px-4 py-1.5 bg-[#5D6D5F] hover:bg-[#4B594D] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {isBulkUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>更新中...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>一括更新を実行</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK MANUAL REGISTER (TEXT LIST)                                   */}
      {/* ========================================================================= */}
      {isBulkAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FDFBF7] border border-[#D9C5B2] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE9E0]">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#5D6D5F]" />
                <h3 className="text-sm font-bold text-[#3E362E] font-serif">
                  書籍の一括新規登録
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkAddModalOpen(false)}
                className="text-[#A99C8E] hover:text-[#3E362E] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#786C5E]">
              1行に1冊ずつ入力してください。「タイトル, 著者名」または「タイトル」のみの入力に対応しています。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#786C5E] mb-1">書籍リスト（改行区切り）</label>
                <textarea
                  rows={6}
                  placeholder={`例:\nノルウェイの森, 村上春樹\n人間失格, 太宰治\n沈黙のWebマーケティング, 松尾茂起`}
                  value={bulkAddText}
                  onChange={(e) => setBulkAddText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D9C5B2] rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#5D6D5F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#786C5E] mb-1">配架本棚</label>
                  <input
                    type="text"
                    value={bulkAddShelf}
                    onChange={(e) => setBulkAddShelf(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#786C5E] mb-1">ジャンル</label>
                  <input
                    type="text"
                    value={bulkAddGenre}
                    onChange={(e) => setBulkAddGenre(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#D9C5B2] rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE9E0] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsBulkAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApplyBulkAdd}
                disabled={isBulkAdding || !bulkAddText.trim()}
                className="px-4 py-1.5 bg-[#5D6D5F] hover:bg-[#4D5C4F] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {isBulkAdding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>登録中...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>一括登録を実行</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK DELETE CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FDFBF7] border border-[#F8B4B4] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5D5D5]">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#FDF2F2] flex items-center justify-center text-[#C53030]">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#3E362E] font-serif">
                  選択した書籍の一括削除
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-[#A99C8E] hover:text-[#3E362E] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FFF5F5] border border-[#FEB2B2] rounded-xl text-xs text-[#9B2C2C] space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-[#C53030]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>選択された {selectedBookIds.length} 冊を完全に削除します</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                この操作は取り消せません。データベースから完全に消去されます。必要な場合は事前に「CSVエクスポート」を行ってください。
              </p>
            </div>

            {/* Preview of items to be deleted */}
            <div className="space-y-1 text-xs">
              <span className="text-[11px] font-semibold text-[#786C5E]">削除対象プレビュー:</span>
              <div className="max-h-36 overflow-y-auto space-y-1 bg-white border border-[#E8E1D7] rounded-lg p-2">
                {books
                  .filter(b => selectedBookIds.includes(b.id))
                  .slice(0, 5)
                  .map(b => (
                    <div key={b.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0 text-[11px]">
                      <span className="font-medium text-[#3E362E] truncate max-w-[240px]">{b.title}</span>
                      <span className="text-[#8C7355] shrink-0">{b.shelfLocation || '未分類'}</span>
                    </div>
                  ))}
                {selectedBookIds.length > 5 && (
                  <div className="text-[11px] text-[#8C7355] text-center pt-1 font-medium">
                    他 {selectedBookIds.length - 5} 冊の書籍
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE9E0] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-[#C53030] hover:bg-[#9B2C2C] text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>削除中...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{selectedBookIds.length} 冊を一括削除する</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE ALL BOOKS CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FDFBF7] border-2 border-[#FEB2B2] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#FEB2B2]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFF5F5] border border-[#FEB2B2] flex items-center justify-center text-[#C53030]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#C53030] font-serif">
                  【警告】全件削除：すべての蔵書データの消去
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="text-[#A99C8E] hover:text-[#3E362E] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#FFF5F5] border border-[#FEB2B2] rounded-xl text-xs text-[#9B2C2C] space-y-2">
              <p className="font-bold text-sm">
                登録されているすべての書籍データ（全 {books.length} 冊）を消去します。
              </p>
              <p className="leading-relaxed text-[11px]">
                この操作を実行すると、データベース内の蔵書データはすべて空になります。<br />
                ※ 過去のデータ修正ログ（7日分）は保持されます。<br />
                ※ テストや確認用データを再度投入したい場合は、ヘッダーの「サンプル復元」ボタンからいつでも初期データを再読み込みできます。
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2 text-xs text-[#3E362E] cursor-pointer select-none bg-white p-2.5 rounded-lg border border-[#D9C5B2]">
                <input
                  type="checkbox"
                  id="confirm-delete-all-checkbox"
                  checked={deleteAllConfirmCheckbox}
                  onChange={(e) => setDeleteAllConfirmCheckbox(e.target.checked)}
                  className="rounded border-[#D9C5B2] text-[#C53030] focus:ring-[#C53030] w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-[#9B2C2C]">
                  全 {books.length} 冊の蔵書データを完全に消去することを了解しました
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-[#EFE9E0] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={executeDeleteAll}
                disabled={!deleteAllConfirmCheckbox || isDeleting}
                className="px-5 py-2 bg-[#C53030] hover:bg-[#9B2C2C] text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>消去処理中...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>全蔵書データを完全に消去する</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEAR AUDIT LOGS CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {isClearLogsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#FDFBF7] border border-[#D9C5B2] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE9E0]">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#5D6D5F]" />
                <h3 className="text-sm font-bold text-[#3E362E] font-serif">
                  データ修正ログの消去
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearLogsModalOpen(false)}
                className="text-[#A99C8E] hover:text-[#3E362E] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#786C5E] leading-relaxed">
              保存されている {logs.length} 件のデータ修正履歴ログを手動消去します。<br />
              <span className="text-[#3E362E] font-medium">※ 書籍データ本体は消去されません。</span>
            </p>

            <div className="pt-3 border-t border-[#EFE9E0] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsClearLogsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={executeClearLogs}
                className="px-4 py-1.5 bg-[#C53030] hover:bg-[#9B2C2C] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                ログを消去する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
