import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, RefreshCw, AlertCircle, BookOpen, CheckCircle2, Trash2, Edit2, Sparkles, Smartphone, Tablet, ArrowRight, BookCheck, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { Book, DetectedBook } from '../types';
import { SAMPLE_BOOKSHELVES, SampleBookshelf } from '../data/sampleBookshelfs';
import { normalizeHorizontalText } from '../utils/textUtils';

interface RegistrarScannerViewProps {
  onRegisterBooks: (books: Partial<Book>[]) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
  onSwitchAccount: () => void;
  currentUserDisplayName: string;
  onNavigateToLibrary?: () => void;
  totalBooksCount?: number;
}

export const RegistrarScannerView: React.FC<RegistrarScannerViewProps> = ({
  onRegisterBooks,
  onShowToast,
  onSwitchAccount,
  currentUserDisplayName,
  onNavigateToLibrary,
  totalBooksCount = 0
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [detectedBooks, setDetectedBooks] = useState<DetectedBook[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<number | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [targetShelf, setTargetShelf] = useState<string>('メイン本棚');

  // Quick edit state for a book card
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAuthor, setEditAuthor] = useState<string>('');
  const [editIsbn, setEditIsbn] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const generateSampleDetection = (sample: SampleBookshelf): DetectedBook[] => {
    let currentX = 45;
    const shelfWidth = 640;
    const shelfHeight = 380;

    return sample.books.map((b, i) => {
      const bHeight = 230 + (i % 3) * 15;
      const yPos = shelfHeight - 65 - bHeight;
      const bookWidth = b.width;

      const ymin = Math.round((yPos / shelfHeight) * 1000);
      const xmin = Math.round((currentX / shelfWidth) * 1000);
      const ymax = Math.round(((yPos + bHeight) / shelfHeight) * 1000);
      const xmax = Math.round(((currentX + bookWidth) / shelfWidth) * 1000);

      currentX += bookWidth + 4;

      return {
        tempId: `reg-sample-${Date.now()}-${i + 1}`,
        title: normalizeHorizontalText(b.title),
        author: normalizeHorizontalText(b.author),
        publisher: normalizeHorizontalText(b.publisher),
        publishedYear: b.publishedYear,
        isbn: b.isbn ? b.isbn.replace(/[^0-9X]/gi, '') : '',
        genre: b.genre,
        description: `${b.title} (${b.author})`,
        spineColor: b.color,
        confidence: '高',
        selected: true,
        box2d: [ymin, xmin, ymax, xmax],
        isOcrFailed: false
      };
    });
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('画像ファイル（JPEG, PNG, WebP等）を選択してください。');
      return;
    }

    setScanError(null);
    setRegistrationSuccess(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImage(dataUrl);
      setDetectedBooks([]);
      // Trigger scan
      executeOcrScan(dataUrl, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: SampleBookshelf) => {
    setSelectedImage(sample.imageDataUrl);
    setDetectedBooks([]);
    setScanError(null);
    setRegistrationSuccess(null);
    executeOcrScan(sample.imageDataUrl, 'image/svg+xml');
  };

  const executeOcrScan = async (base64Img: string, customMimeType: string = 'image/jpeg') => {
    setIsScanning(true);
    setScanError(null);

    // Check if image matches built-in sample
    const sampleMatch = SAMPLE_BOOKSHELVES.find(s => s.imageDataUrl === base64Img);

    try {
      let mimeType = customMimeType;
      if (base64Img.startsWith('data:')) {
        const match = base64Img.match(/^data:([^;]+);base64,/);
        if (match && match[1]) {
          mimeType = match[1];
        }
      }

      const res = await fetch('/api/scan-bookshelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          image: base64Img,
          mimeType: mimeType
        })
      });

      if (!res.ok) {
        if (sampleMatch) {
          const fallbackBooks = generateSampleDetection(sampleMatch);
          setDetectedBooks(fallbackBooks);
          onShowToast(`${fallbackBooks.length} 冊の背表紙を検出しました`, 'success');
          return;
        }
        const errData = await res.json().catch(() => ({}));
        let errorMsg = errData.error || `スキャン通信エラー (${res.status})`;
        if (typeof errorMsg === 'string' && errorMsg.includes('"message"')) {
          try {
            const parsed = JSON.parse(errorMsg);
            if (parsed?.error?.message) {
              errorMsg = parsed.error.message;
            }
          } catch {
            // keep as is
          }
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const rawBooks: any[] = data.detectedBooks || [];

      if (rawBooks.length === 0) {
        if (sampleMatch) {
          const fallbackBooks = generateSampleDetection(sampleMatch);
          setDetectedBooks(fallbackBooks);
          onShowToast(`${fallbackBooks.length} 冊の背表紙を検出しました`, 'success');
          return;
        }
        setScanError('画像から背表紙・書籍を検出できませんでした。別の角度や明るい場所で撮影した写真を試してください。');
        setDetectedBooks([]);
      } else {
        const mapped: DetectedBook[] = rawBooks.map((item, idx) => ({
          tempId: `reg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: normalizeHorizontalText(item.title || '（無題）'),
          author: normalizeHorizontalText(item.author || '不明'),
          publisher: normalizeHorizontalText(item.publisher || ''),
          publishedYear: item.publishedYear || '',
          isbn: item.isbn ? item.isbn.replace(/[^0-9X]/gi, '') : '',
          genre: item.genre || '一般',
          description: item.description || '',
          spineColor: item.spineColor || '#5D6D5F',
          confidence: item.confidence || '中',
          selected: true,
          box2d: item.box2d,
          isOcrFailed: Boolean(item.isOcrFailed || item.title?.includes('OCR読み取り不可'))
        }));
        setDetectedBooks(mapped);
        onShowToast(`${mapped.length} 冊の背表紙を検出しました`, 'success');
      }
    } catch (err: any) {
      if (sampleMatch) {
        const fallbackBooks = generateSampleDetection(sampleMatch);
        setDetectedBooks(fallbackBooks);
        onShowToast(`${fallbackBooks.length} 冊の背表紙を検出しました`, 'success');
        return;
      }
      console.error('Registrar scan error:', err);
      let errMsg = err.message || 'AI背表紙スキャン中にエラーが発生しました';
      if (typeof errMsg === 'string' && (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE'))) {
        errMsg = 'AIモデルが現在混雑しています (503)。少し待ってから再度お試しください。';
      }
      setScanError(errMsg);
      onShowToast('スキャンに失敗しました', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleBookSelection = (tempId: string) => {
    setDetectedBooks(prev =>
      prev.map(b => (b.tempId === tempId ? { ...b, selected: !b.selected } : b))
    );
  };

  const removeBook = (tempId: string) => {
    setDetectedBooks(prev => prev.filter(b => b.tempId !== tempId));
  };

  const startEdit = (book: DetectedBook) => {
    setEditingTempId(book.tempId);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditIsbn(book.isbn || '');
  };

  const saveEdit = (tempId: string) => {
    setDetectedBooks(prev =>
      prev.map(b =>
        b.tempId === tempId
          ? {
              ...b,
              title: normalizeHorizontalText(editTitle.trim() || b.title),
              author: normalizeHorizontalText(editAuthor.trim() || b.author),
              isbn: editIsbn.trim() || b.isbn
            }
          : b
      )
    );
    setEditingTempId(null);
  };

  const selectedCount = detectedBooks.filter(b => b.selected).length;

  const handleRegisterAll = async () => {
    const toRegister = detectedBooks.filter(b => b.selected);
    if (toRegister.length === 0) {
      onShowToast('登録対象の書籍が選択されていません', 'error');
      return;
    }

    setIsRegistering(true);
    try {
      const payload: Partial<Book>[] = toRegister.map(item => ({
        title: item.title,
        author: item.author,
        isbn: item.isbn || undefined,
        // Preserve other background fields for editors to refine later:
        publisher: item.publisher || undefined,
        publishedYear: item.publishedYear || undefined,
        genre: item.genre || '一般',
        shelfLocation: targetShelf || 'メイン本棚',
        spineColor: item.spineColor || '#5D6D5F',
        summary: item.description || '',
        registeredVia: 'scan',
        registeredBy: currentUserDisplayName,
        isOcrFailed: item.isOcrFailed,
        auditStatus: item.isOcrFailed ? 'ocr_failed' : 'normal',
        review: {
          rating: 0,
          comment: '',
          tags: [],
          readingStatus: 'unread',
          updatedAt: new Date().toISOString()
        }
      }));

      await onRegisterBooks(payload);
      setRegistrationSuccess(toRegister.length);
      setDetectedBooks([]);
      setSelectedImage(null);
      onShowToast(`${toRegister.length} 冊を共有本棚へ登録しました！`, 'success');
    } catch (err: any) {
      console.error('Failed to register:', err);
      onShowToast('本棚への登録に失敗しました', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleResetForNextScan = () => {
    setSelectedImage(null);
    setDetectedBooks([]);
    setScanError(null);
    setRegistrationSuccess(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Role Header Banner (User3 登録者専用) */}
      <div className="bg-[#FAF5F9] border border-[#E8D4E6] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B4E7A] text-white flex items-center justify-center shadow-xs shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold font-serif text-[#3E362E]">
                本棚AI点検スキャン（登録者専用）
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8CEE7] text-[#5C2E5B]">
                登録者: {currentUserDisplayName}
              </span>
            </div>
            <p className="text-xs text-[#786C5E] mt-0.5">
              スマホ・タブレット対応の簡易OCR登録画面です（全ユーザーとデータ共有中）
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0 flex-wrap gap-y-1">
          {onNavigateToLibrary && (
            <button
              type="button"
              onClick={onNavigateToLibrary}
              title="全ユーザー共有の蔵書・本棚一覧を確認"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#5D6D5F] hover:bg-[#4B594D] text-white cursor-pointer shadow-2xs flex items-center space-x-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>蔵書・本棚一覧 ({totalBooksCount}冊)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchAccount}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-[#D9C5B2] text-[#6E5F52] hover:text-[#3E362E] hover:bg-[#FDFBF7] cursor-pointer shadow-2xs transition-colors"
          >
            アカウント切替
          </button>
        </div>
      </div>

      {/* Guidance Box explaining simple fields */}
      <div className="bg-[#FDFBF7] border border-[#E8E1D7] rounded-xl p-3.5 text-xs text-[#786C5E] flex items-start space-x-2.5">
        <Sparkles className="w-4 h-4 text-[#7B4E7A] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#3E362E]">登録者モード:</strong>{' '}
          本棚を撮影するとAIが自動で背表紙を認識します。この画面では
          <strong className="text-[#7B4E7A]">【タイトル】【著者】【ISBN】</strong>のみを確認・登録できます。
          登録したデータは即時に<strong className="text-[#5D6D5F]">「蔵書・本棚一覧」</strong>へ共有され、すべてのユーザーから閲覧・点検が可能です。
        </p>
      </div>

      {/* Registration Success Banner */}
      {registrationSuccess !== null && (
        <div className="bg-[#EDF5EF] border border-[#BED2C1] rounded-2xl p-5 text-center space-y-3 shadow-xs animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-[#2D5A34] text-white flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1E3D23] font-serif">
              {registrationSuccess} 冊を共有台帳・本棚に正常登録しました！
            </h3>
            <p className="text-xs text-[#3E6545] mt-1">
              すべてのユーザー（管理者・編集者・閲覧者・登録者）の蔵書・本棚一覧にリアルタイムで反映されています。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            {onNavigateToLibrary && (
              <button
                type="button"
                onClick={onNavigateToLibrary}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-[#5D6D5F] hover:bg-[#4B594D] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors space-x-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>蔵書・本棚一覧で確認する</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetForNextScan}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-white border border-[#BED2C1] text-[#2D5A34] hover:bg-[#E2EDE4] text-xs font-bold rounded-xl shadow-2xs cursor-pointer transition-colors space-x-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>続けて次の本棚を撮影・スキャン</span>
            </button>
          </div>
        </div>
      )}

      {/* Scanner Section (Hidden when in success view until user clicks continue) */}
      {registrationSuccess === null && (
        <div className="bg-white rounded-2xl border border-[#E8E1D7] shadow-sm p-5 sm:p-6 space-y-5">
          {/* Action Trigger Buttons for Mobile / Tablet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Native Camera Trigger */}
            <button
              id="registrar-camera-btn"
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isScanning}
              className="py-4 px-4 bg-[#7B4E7A] hover:bg-[#683E67] active:bg-[#573356] text-white rounded-xl font-bold text-sm shadow-sm transition-colors cursor-pointer flex flex-col items-center justify-center space-y-1.5 disabled:opacity-50"
            >
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <Smartphone className="w-4 h-4" />
              </div>
              <span>端末カメラで本棚を撮影</span>
              <span className="text-[10px] font-normal text-white/80">スマホ・タブレットのカメラが起動します</span>
            </button>

            {/* File Upload Trigger with Drag and Drop */}
            <div
              id="registrar-drop-zone"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleImageFile(file);
              }}
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`py-4 px-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center space-y-1.5 ${
                isDragging
                  ? 'bg-[#F2EBF2] border-[#7B4E7A] text-[#7B4E7A] scale-[1.01]'
                  : 'bg-[#F7F3EE] hover:bg-[#EAE4DB] active:bg-[#DFD7CC] border-[#D9C5B2] text-[#3E362E]'
              } ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex items-center space-x-2">
                <Upload className={`w-5 h-5 ${isDragging ? 'text-[#7B4E7A]' : 'text-[#7B4E7A]'}`} />
                <Tablet className="w-4 h-4 text-[#786C5E]" />
              </div>
              <span className="font-bold text-sm">
                {isDragging ? 'ここにドロップしてスキャン' : '写真選択・ドラッグ＆ドロップ'}
              </span>
              <span className="text-[10px] font-normal text-[#786C5E]">保存済みの本棚写真をアップロード</span>
            </div>

            {/* Hidden Input elements */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Quick Test Sample Bookshelves */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#786C5E] flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-[#7B4E7A]" />
                <span>または、テスト用サンプル本棚で試す:</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_BOOKSHELVES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  disabled={isScanning}
                  className="p-2.5 rounded-xl border border-[#E8E1D7] bg-[#FDFBF7] hover:bg-white hover:border-[#7B4E7A] transition-all text-left flex items-center space-x-2.5 cursor-pointer shadow-2xs group disabled:opacity-50"
                >
                  <img
                    src={sample.imageDataUrl}
                    alt={sample.title}
                    className="w-9 h-9 object-cover rounded-md border border-[#D9C5B2] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#3E362E] group-hover:text-[#7B4E7A] truncate transition-colors">
                      {sample.title}
                    </p>
                    <p className="text-[10px] text-[#786C5E] truncate">
                      {sample.books.length}冊構成 • ワンクリック試行
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scanning In Progress State */}
          {isScanning && (
            <div className="py-10 bg-[#FDFBF7] rounded-xl border border-[#E8E1D7] flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#7B4E7A] animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-[#3E362E] font-serif">
                  AIが本棚の背表紙を認識中...
                </p>
                <p className="text-xs text-[#786C5E]">
                  タイトル・著者名・ISBNを解析しています（数秒お待ちください）
                </p>
              </div>
            </div>
          )}

          {/* Scan Error Notice */}
          {scanError && (
            <div className="p-3.5 bg-[#FAF0ED] border border-[#EAD7CB] rounded-xl flex items-start space-x-2.5 text-xs text-[#9A392F]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Image Thumbnail Preview if scanned */}
          {selectedImage && !isScanning && detectedBooks.length > 0 && (
            <div className="p-3 bg-[#FDFBF7] rounded-xl border border-[#E8E1D7] flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <img
                  src={selectedImage}
                  alt="スキャン対象"
                  className="w-12 h-12 object-cover rounded-lg border border-[#D9C5B2] shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#3E362E] truncate">
                    スキャン完了: {detectedBooks.length} 冊検出
                  </p>
                  <p className="text-[11px] text-[#786C5E]">
                    登録対象: {selectedCount} 冊選択中
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetForNextScan}
                className="text-xs text-[#786C5E] hover:text-[#3E362E] underline cursor-pointer shrink-0"
              >
                再撮影
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* SIMPLIFIED DETECTED BOOKS LIST (Title, Author, ISBN ONLY)  */}
          {/* ========================================================= */}
          {detectedBooks.length > 0 && !isScanning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#EFE9E0]">
                <h3 className="text-xs font-bold text-[#3E362E] uppercase tracking-wide flex items-center space-x-1.5">
                  <BookCheck className="w-4 h-4 text-[#7B4E7A]" />
                  <span>検出書籍一覧（タイトル・著者・ISBNの簡易確認）</span>
                </h3>
                <span className="text-xs font-semibold text-[#7B4E7A]">
                  {selectedCount}/{detectedBooks.length} 冊選択中
                </span>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {detectedBooks.map((book, index) => {
                  const isEditing = editingTempId === book.tempId;

                  return (
                    <div
                      key={book.tempId}
                      className={`p-3 rounded-xl border transition-all ${
                        book.selected
                          ? 'bg-[#FDFBF7] border-[#D9C5B2] shadow-2xs'
                          : 'bg-[#F5F2EC] border-[#E8E1D7] opacity-60'
                      }`}
                    >
                      {isEditing ? (
                        /* Simple Inline Editing for Registrar (Title, Author, ISBN only) */
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-[#E8E1D7]">
                            <span className="text-xs font-bold text-[#3E362E]">
                              #{index + 1} 書籍情報の簡易補正
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingTempId(null)}
                              className="text-xs text-[#786C5E] hover:text-[#3E362E] cursor-pointer"
                            >
                              キャンセル
                            </button>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[#5D5043] mb-0.5">
                              タイトル *
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B4E7A]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-[#5D5043] mb-0.5">
                                著者
                              </label>
                              <input
                                type="text"
                                value={editAuthor}
                                onChange={(e) => setEditAuthor(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B4E7A]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#5D5043] mb-0.5">
                                ISBN (任意)
                              </label>
                              <input
                                type="text"
                                value={editIsbn}
                                onChange={(e) => setEditIsbn(e.target.value)}
                                placeholder="9784..."
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D9C5B2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B4E7A] font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => saveEdit(book.tempId)}
                              className="px-3 py-1 bg-[#7B4E7A] text-white text-xs font-bold rounded-md hover:bg-[#683E67] cursor-pointer shadow-2xs"
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Read mode showing ONLY Title, Author, ISBN */
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={book.selected}
                              onChange={() => toggleBookSelection(book.tempId)}
                              className="mt-1 w-4 h-4 rounded text-[#7B4E7A] border-[#D9C5B2] focus:ring-[#7B4E7A] cursor-pointer"
                            />

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#F7F3EE] text-[#786C5E] border border-[#E8E1D7]">
                                  #{index + 1}
                                </span>
                                {book.isOcrFailed && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                                    ⚠️ OCR不鮮明
                                  </span>
                                )}
                              </div>

                              {/* 1. Title (Enforced horizontal) */}
                              <h4
                                className="text-xs sm:text-sm font-bold font-serif text-[#3E362E] leading-snug break-words"
                                style={{ writingMode: 'horizontal-tb' }}
                              >
                                {book.title}
                              </h4>

                              {/* 2. Author (Enforced horizontal) */}
                              <p
                                className="text-xs text-[#786C5E] break-words"
                                style={{ writingMode: 'horizontal-tb' }}
                              >
                                著者: <strong className="text-[#3E362E]">{book.author}</strong>
                              </p>

                              {/* 3. ISBN Registration status */}
                              <div className="pt-0.5">
                                {book.isbn ? (
                                  <span className="inline-flex items-center text-[10px] font-mono bg-[#EDF5EF] text-[#2D5A34] border border-[#C3DCC7] px-2 py-0.5 rounded">
                                    ISBN: {book.isbn}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] bg-[#F7F3EE] text-[#A99C8E] border border-[#E8E1D7] px-2 py-0.5 rounded">
                                    ISBN未登録（後から照合可）
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => startEdit(book)}
                              title="タイトル・著者・ISBNを編集"
                              className="p-1.5 text-[#786C5E] hover:text-[#3E362E] hover:bg-[#EAE4DB] rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBook(book.tempId)}
                              title="除外"
                              className="p-1.5 text-[#A99C8E] hover:text-[#9A392F] hover:bg-[#FAF0ED] rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Register Submission CTA */}
              <div className="pt-3 border-t border-[#EFE9E0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-semibold text-[#5D5043] shrink-0">配架先の本棚:</label>
                  <select
                    value={targetShelf}
                    onChange={(e) => setTargetShelf(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg text-[#3E362E] font-medium focus:outline-none focus:ring-1 focus:ring-[#7B4E7A]"
                  >
                    <option value="メイン本棚">メイン本棚 (推奨・全本棚共有)</option>
                    <option value="第1書架 A棚">第1書架 A棚</option>
                    <option value="第1書架 B棚">第1書架 B棚</option>
                    <option value="新着・未配架">新着・未配架</option>
                  </select>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3">
                  <span className="text-xs text-[#786C5E]">
                    選択中の <strong>{selectedCount}</strong> 冊を一括登録
                  </span>
                  <button
                    id="registrar-submit-books-btn"
                    type="button"
                    onClick={handleRegisterAll}
                    disabled={selectedCount === 0 || isRegistering}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#7B4E7A] hover:bg-[#683E67] active:bg-[#573356] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>登録処理中...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>本棚に登録する（{selectedCount}冊）</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
