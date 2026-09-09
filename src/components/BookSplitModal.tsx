import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Scissors,
  Sparkles,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  SplitSquareVertical,
  Sliders,
  AlertTriangle,
  BookOpen,
  Info,
  Maximize2
} from 'lucide-react';
import { DetectedBook } from '../types';

interface BookSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: DetectedBook | null;
  bookIndex: number; // 0-indexed, so bookIndex + 1 is #8 etc.
  shelfImage: string | null;
  onApplySplit: (originalTempId: string, book1: DetectedBook, book2: DetectedBook) => void;
}

export const BookSplitModal: React.FC<BookSplitModalProps> = ({
  isOpen,
  onClose,
  book,
  bookIndex,
  shelfImage,
  onApplySplit
}) => {
  // Split ratio: percentage from left edge (15% to 85%, default 50%)
  const [splitPercent, setSplitPercent] = useState<number>(50);

  // Outer crop boundary adjustment [ymin, xmin, ymax, xmax] in 0-1000 normalized space
  const [cropBox, setCropBox] = useState<[number, number, number, number]>([150, 400, 850, 600]);

  // Book 1 (Left / 1冊目) Form state
  const [title1, setTitle1] = useState<string>('');
  const [author1, setAuthor1] = useState<string>('');
  const [publisher1, setPublisher1] = useState<string>('');
  const [isbn1, setIsbn1] = useState<string>('');
  const [color1, setColor1] = useState<string>('#3b82f6');
  const [isFailed1, setIsFailed1] = useState<boolean>(false);

  // Book 2 (Right / 2冊目) Form state
  const [title2, setTitle2] = useState<string>('');
  const [author2, setAuthor2] = useState<string>('');
  const [publisher2, setPublisher2] = useState<string>('');
  const [isbn2, setIsbn2] = useState<string>('');
  const [color2, setColor2] = useState<string>('#10b981');
  const [isFailed2, setIsFailed2] = useState<boolean>(false);

  // AI OCR status
  const [isAiOcrLoading, setIsAiOcrLoading] = useState<boolean>(false);
  const [aiOcrSuccessMsg, setAiOcrSuccessMsg] = useState<string | null>(null);
  const [aiOcrErrorMsg, setAiOcrErrorMsg] = useState<string | null>(null);

  // Canvas refs for visual rendering
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const [isDraggingDivider, setIsDraggingDivider] = useState<boolean>(false);

  // Initialize state when book changes
  useEffect(() => {
    if (!book || !isOpen) return;

    // Determine initial crop boundary from book's box2d or sensible default
    const initialBox = (book.box2d && book.box2d.length === 4)
      ? [...book.box2d] as [number, number, number, number]
      : [150, 400, 850, 600] as [number, number, number, number];
    setCropBox(initialBox);
    setSplitPercent(50);
    setAiOcrSuccessMsg(null);
    setAiOcrErrorMsg(null);

    const origTitle = book.title || '';
    const origAuthor = book.author || '';
    const origPublisher = book.publisher || '';
    const origColor = book.spineColor || '#5D6D5F';
    const isOriginalFailed = Boolean(book.isOcrFailed || origTitle.includes('OCR読み取り不可'));

    // Intelligent title splitting guess
    let t1 = origTitle;
    let t2 = origTitle;

    if (isOriginalFailed) {
      t1 = 'OCR読み取り不可 (1冊目)';
      t2 = 'OCR読み取り不可 (2冊目)';
      setIsFailed1(true);
      setIsFailed2(true);
    } else {
      setIsFailed1(false);
      setIsFailed2(false);

      if (origTitle.includes('上・下') || origTitle.includes('上下')) {
        const base = origTitle.replace(/[上下・]/g, '').trim();
        t1 = `${base} 上巻`;
        t2 = `${base} 下巻`;
      } else if (origTitle.includes('1・2') || origTitle.includes('1, 2') || origTitle.includes('1/2')) {
        const base = origTitle.replace(/[12・,\/]/g, '').trim();
        t1 = `${base} 第1巻`;
        t2 = `${base} 第2巻`;
      } else if (origTitle.includes('前・後') || origTitle.includes('前後')) {
        const base = origTitle.replace(/[前後・]/g, '').trim();
        t1 = `${base} 前編`;
        t2 = `${base} 後編`;
      } else if (/(\s|第|\()1(\)|巻)?$/.test(origTitle)) {
        t1 = origTitle;
        t2 = origTitle.replace(/1(\)|巻)?$/, '2$1');
      } else {
        // Default: 1st volume and 2nd volume or separate books
        t1 = `${origTitle} (1)`;
        t2 = `${origTitle} (2)`;
      }
    }

    setTitle1(t1);
    setAuthor1(origAuthor === '著者不明' ? '' : origAuthor);
    setPublisher1(origPublisher);
    setIsbn1(book.isbn || '');
    setColor1(origColor);

    setTitle2(t2);
    setAuthor2(origAuthor === '著者不明' ? '' : origAuthor);
    setPublisher2(origPublisher);
    setIsbn2('');
    setColor2(origColor);
  }, [book, isOpen]);

  // Load shelf image into an HTMLImageElement
  useEffect(() => {
    if (!shelfImage || !isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      renderCroppedSpines();
    };
    img.src = shelfImage;
  }, [shelfImage, isOpen]);

  // Re-render canvases whenever cropBox or splitPercent changes
  const renderCroppedSpines = useCallback(() => {
    const img = imageObjRef.current;
    if (!img) return;

    const [ymin, xmin, ymax, xmax] = cropBox;
    const natW = img.naturalWidth || 800;
    const natH = img.naturalHeight || 600;

    const srcX = Math.max(0, Math.min(natW, (xmin / 1000) * natW));
    const srcY = Math.max(0, Math.min(natH, (ymin / 1000) * natH));
    const srcW = Math.max(10, Math.min(natW - srcX, ((xmax - xmin) / 1000) * natW));
    const srcH = Math.max(10, Math.min(natH - srcY, ((ymax - ymin) / 1000) * natH));

    // 1. Render Main Interactive Split View
    const mainCanvas = mainCanvasRef.current;
    if (mainCanvas) {
      const displayW = 360;
      const displayH = 260;
      mainCanvas.width = displayW;
      mainCanvas.height = displayH;
      const ctx = mainCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, displayW, displayH);

        // Draw cropped spine section centered & scaled to fit display
        const scale = Math.min(displayW / srcW, displayH / srcH);
        const destW = srcW * scale;
        const destH = srcH * scale;
        const destX = (displayW - destW) / 2;
        const destY = (displayH - destH) / 2;

        // Draw image slice
        ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);

        // Split line X position on canvas
        const splitXCanvas = destX + destW * (splitPercent / 100);

        // Left Book Tint (Soft Blue)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
        ctx.fillRect(destX, destY, destW * (splitPercent / 100), destH);

        // Right Book Tint (Soft Emerald)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
        ctx.fillRect(splitXCanvas, destY, destW * (1 - splitPercent / 100), destH);

        // Draw Vertical Divider Line
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.moveTo(splitXCanvas, destY);
        ctx.lineTo(splitXCanvas, destY + destH);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.moveTo(splitXCanvas, destY);
        ctx.lineTo(splitXCanvas, destY + destH);
        ctx.stroke();
        ctx.restore();

        // Draw Handle Badge at center of divider
        const handleY = destY + destH / 2;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(splitXCanvas, handleY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon arrows inside handle
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↔', splitXCanvas, handleY);
      }
    }

    // 2. Render Left Book (Book 1) Cropped Slice
    const leftCanvas = leftPreviewCanvasRef.current;
    if (leftCanvas) {
      const leftW = Math.max(1, srcW * (splitPercent / 100));
      leftCanvas.width = 120;
      leftCanvas.height = 180;
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 120, 180);
        ctx.drawImage(img, srcX, srcY, leftW, srcH, 0, 0, 120, 180);
      }
    }

    // 3. Render Right Book (Book 2) Cropped Slice
    const rightCanvas = rightPreviewCanvasRef.current;
    if (rightCanvas) {
      const rightSrcX = srcX + srcW * (splitPercent / 100);
      const rightW = Math.max(1, srcW * (1 - splitPercent / 100));
      rightCanvas.width = 120;
      rightCanvas.height = 180;
      const ctx = rightCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 120, 180);
        ctx.drawImage(img, rightSrcX, srcY, rightW, srcH, 0, 0, 120, 180);
      }
    }
  }, [cropBox, splitPercent]);

  useEffect(() => {
    renderCroppedSpines();
  }, [renderCroppedSpines]);

  // Handle clicking / dragging on main canvas to position divider
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDraggingDivider(true);
    updateSplitFromMouse(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingDivider) return;
    updateSplitFromMouse(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingDivider(false);
  };

  const updateSplitFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;

    const [ymin, xmin, ymax, xmax] = cropBox;
    const natW = img.naturalWidth || 800;
    const natH = img.naturalHeight || 600;
    const srcW = Math.max(10, ((xmax - xmin) / 1000) * natW);
    const srcH = Math.max(10, ((ymax - ymin) / 1000) * natH);

    const displayW = canvas.width;
    const displayH = canvas.height;
    const scale = Math.min(displayW / srcW, displayH / srcH);
    const destW = srcW * scale;
    const destX = (displayW - destW) / 2;

    const relativeX = clientX - destX;
    const ratio = Math.max(0.15, Math.min(0.85, relativeX / destW));
    setSplitPercent(Math.round(ratio * 100));
  };

  // Fine-tuning outer boundary adjustments
  const adjustBoundary = (side: 'left' | 'right' | 'top' | 'bottom', delta: number) => {
    setCropBox(prev => {
      const [ymin, xmin, ymax, xmax] = prev;
      if (side === 'left') {
        const nextXmin = Math.max(0, Math.min(xmax - 20, xmin + delta));
        return [ymin, nextXmin, ymax, xmax];
      }
      if (side === 'right') {
        const nextXmax = Math.min(1000, Math.max(xmin + 20, xmax + delta));
        return [ymin, xmin, ymax, nextXmax];
      }
      if (side === 'top') {
        const nextYmin = Math.max(0, Math.min(ymax - 20, ymin + delta));
        return [nextYmin, xmin, ymax, xmax];
      }
      if (side === 'bottom') {
        const nextYmax = Math.min(1000, Math.max(ymin + 20, ymax + delta));
        return [ymin, xmin, nextYmax, xmax];
      }
      return prev;
    });
  };

  // Title preset buttons helper
  const applyPreset = (preset: 'volume' | 'part' | 'same') => {
    const base = (book?.title || '書籍')
      .replace(/(\s|第|\()?[12１２前後上下巻]+(\)|巻)?/g, '')
      .replace(/OCR読み取り不可/g, '')
      .trim() || '書籍';

    if (preset === 'volume') {
      setTitle1(`${base} 上巻`);
      setTitle2(`${base} 下巻`);
    } else if (preset === 'part') {
      setTitle1(`${base} 第1巻`);
      setTitle2(`${base} 第2巻`);
    } else if (preset === 'same') {
      setTitle1(book?.title || '同一書籍');
      setTitle2(book?.title || '同一書籍 (複本)');
    }
  };

  // AI OCR on the 2 split cropped halves
  const handleAiOcrSplit = async () => {
    const leftCanvas = leftPreviewCanvasRef.current;
    const rightCanvas = rightPreviewCanvasRef.current;
    if (!leftCanvas || !rightCanvas) return;

    setIsAiOcrLoading(true);
    setAiOcrSuccessMsg(null);
    setAiOcrErrorMsg(null);

    try {
      const book1ImageBase64 = leftCanvas.toDataURL('image/jpeg', 0.95);
      const book2ImageBase64 = rightCanvas.toDataURL('image/jpeg', 0.95);

      const res = await fetch('/api/ocr-split-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book1ImageBase64,
          book2ImageBase64,
          originalTitle: book?.title || '',
          originalAuthor: book?.author || '',
          originalPublisher: book?.publisher || ''
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '分割OCR処理に失敗しました');
      }

      const data = await res.json();
      if (data.books && Array.isArray(data.books) && data.books.length >= 2) {
        const b1 = data.books[0];
        const b2 = data.books[1];

        if (b1.title && b1.title !== 'OCR読み取り不可') {
          setTitle1(b1.title);
          setIsFailed1(false);
        } else if (b1.isOcrFailed) {
          setIsFailed1(true);
        }
        if (b1.author && b1.author !== '著者不明') setAuthor1(b1.author);
        if (b1.publisher) setPublisher1(b1.publisher);
        if (b1.isbn) setIsbn1(b1.isbn);
        if (b1.spineColor) setColor1(b1.spineColor);

        if (b2.title && b2.title !== 'OCR読み取り不可') {
          setTitle2(b2.title);
          setIsFailed2(false);
        } else if (b2.isOcrFailed) {
          setIsFailed2(true);
        }
        if (b2.author && b2.author !== '著者不明') setAuthor2(b2.author);
        if (b2.publisher) setPublisher2(b2.publisher);
        if (b2.isbn) setIsbn2(b2.isbn);
        if (b2.spineColor) setColor2(b2.spineColor);

        setAiOcrSuccessMsg('AI高精度OCRにより、左右2冊の背表紙情報を個別に読み取り・自動入力しました！');
      } else {
        setAiOcrSuccessMsg('AI処理が完了しました。読み取れた内容を確認してください。');
      }
    } catch (err: any) {
      console.warn('AI split OCR failed:', err);
      setAiOcrErrorMsg(err.message || 'AI解析に失敗しました。手動でタイトル等を入力して反映できます。');
    } finally {
      setIsAiOcrLoading(false);
    }
  };

  // Submit and reflect to scan results
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;

    const [ymin, xmin, ymax, xmax] = cropBox;
    const splitX = Math.round(xmin + (xmax - xmin) * (splitPercent / 100));

    const finalTitle1 = isFailed1 ? 'OCR読み取り不可' : (title1.trim() || 'タイトル未設定');
    const finalTitle2 = isFailed2 ? 'OCR読み取り不可' : (title2.trim() || 'タイトル未設定');

    const book1: DetectedBook = {
      ...book,
      tempId: `split-${Date.now()}-1`,
      title: finalTitle1,
      author: author1.trim() || '著者不明',
      publisher: publisher1.trim(),
      isbn: isbn1.trim(),
      spineColor: color1 || book.spineColor,
      box2d: [ymin, xmin, ymax, splitX],
      selected: true,
      isOcrFailed: isFailed1
    };

    const book2: DetectedBook = {
      ...book,
      tempId: `split-${Date.now()}-2`,
      title: finalTitle2,
      author: author2.trim() || '著者不明',
      publisher: publisher2.trim(),
      isbn: isbn2.trim(),
      spineColor: color2 || book.spineColor,
      box2d: [ymin, splitX, ymax, xmax],
      selected: true,
      isOcrFailed: isFailed2
    };

    onApplySplit(book.tempId, book1, book2);
    onClose();
  };

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#D9C5B2] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[#3E362E]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E1D7] bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#EDF2EE] text-[#5D6D5F] flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold font-serif text-[#3E362E]">
                  書籍枠の画像を調整して2冊に分割
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#5D6D5F] text-white">
                  #{bookIndex + 1}
                </span>
              </div>
              <p className="text-xs text-[#786C5E] mt-0.5">
                背表紙の境界線をドラッグまたはスライダーで調整し、1冊として誤結合された本を2冊に分割してスキャン結果に反映します。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C7D6F] hover:text-[#3E362E] hover:bg-[#F0ECE1] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Interactive Image Adjustment & Split Boundary */}
          <div className="bg-white rounded-xl border border-[#E8E1D7] p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE9E0] pb-2.5">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#5D6D5F]" />
                <h4 className="text-xs font-bold text-[#3E362E]">
                  背表紙の分割境界線の調整（画像上をクリックまたはドラッグ）
                </h4>
              </div>

              {/* AI OCR Split Button */}
              <button
                type="button"
                onClick={handleAiOcrSplit}
                disabled={isAiOcrLoading}
                className="inline-flex items-center px-3 py-1.5 bg-[#EDF2EE] hover:bg-[#DCE7DF] text-[#2D5A34] text-xs font-bold rounded-lg border border-[#C3D5C5] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isAiOcrLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5 text-[#5D6D5F]" />
                    AIで2冊を高精度OCR解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#5D6D5F]" />
                    AIでこの2冊をOCR再解析
                  </>
                )}
              </button>
            </div>

            {/* AI Status Feedback */}
            {aiOcrSuccessMsg && (
              <div className="p-2.5 bg-[#E7EFE8] border border-[#C3D5C5] rounded-lg text-xs text-[#2D5A34] flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0 text-[#2D5A34]" />
                <span>{aiOcrSuccessMsg}</span>
              </div>
            )}
            {aiOcrErrorMsg && (
              <div className="p-2.5 bg-[#FEF3C7] border border-[#FCD34D] rounded-lg text-xs text-[#92400E] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" />
                <span>{aiOcrErrorMsg}</span>
              </div>
            )}

            {/* Visual Workspace: Main Canvas + Left/Right Previews */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left Preview: Book 1 */}
              <div className="md:col-span-3 flex flex-col items-center p-2.5 bg-[#FDFBF7] rounded-xl border border-blue-200 shadow-xs">
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-blue-900">1冊目（左側）</span>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-blue-300 bg-white shadow-xs">
                  <canvas
                    ref={leftPreviewCanvasRef}
                    className="w-24 h-36 object-contain block"
                  />
                  <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                    幅 {splitPercent}%
                  </div>
                </div>
                <p className="text-[10px] text-blue-700 mt-1 font-medium truncate max-w-full text-center">
                  {title1 || 'タイトル未設定'}
                </p>
              </div>

              {/* Center: Main Interactive Canvas with Split Line */}
              <div className="md:col-span-6 flex flex-col items-center">
                <div className="relative rounded-xl overflow-hidden border-2 border-[#D9C5B2] shadow-md bg-neutral-900 cursor-ew-resize">
                  <canvas
                    ref={mainCanvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="block max-w-full h-auto select-none"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center space-x-1 pointer-events-none">
                    <span>左右をドラッグして分割線を調整</span>
                  </div>
                </div>

                {/* Range Slider & Fine adjustment */}
                <div className="w-full mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#786C5E]">
                    <span className="font-semibold text-blue-800">
                      左側: {splitPercent}%
                    </span>
                    <span className="font-bold text-[#3E362E]">
                      分割位置: {splitPercent}%
                    </span>
                    <span className="font-semibold text-emerald-800">
                      右側: {100 - splitPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={85}
                    step={1}
                    value={splitPercent}
                    onChange={(e) => setSplitPercent(Number(e.target.value))}
                    className="w-full h-2 bg-[#E8E1D7] rounded-lg appearance-none cursor-pointer accent-[#5D6D5F]"
                  />

                  {/* Quick Preset Ratios */}
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <span className="text-[10px] text-[#786C5E]">目安:</span>
                    {[35, 45, 50, 55, 65].map(ratio => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setSplitPercent(ratio)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          splitPercent === ratio
                            ? 'bg-[#5D6D5F] text-white border-[#5D6D5F]'
                            : 'bg-white text-[#786C5E] border-[#D9C5B2] hover:bg-[#F7F3EE]'
                        }`}
                      >
                        {ratio}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Preview: Book 2 */}
              <div className="md:col-span-3 flex flex-col items-center p-2.5 bg-[#FDFBF7] rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-900">2冊目（右側）</span>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-emerald-300 bg-white shadow-xs">
                  <canvas
                    ref={rightPreviewCanvasRef}
                    className="w-24 h-36 object-contain block"
                  />
                  <div className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                    幅 {100 - splitPercent}%
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1 font-medium truncate max-w-full text-center">
                  {title2 || 'タイトル未設定'}
                </p>
              </div>
            </div>

            {/* Boundary Fine-tuning controls (expand/contract box) */}
            <div className="pt-2 border-t border-[#EFE9E0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#786C5E]">
              <span className="text-[11px] font-medium flex items-center">
                <Maximize2 className="w-3.5 h-3.5 mr-1 text-[#8C7D6F]" />
                背表紙切り出し枠の微調整:
              </span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-[#F7F3EE] px-2 py-1 rounded-lg border border-[#E8E1D7]">
                  <span className="text-[10px]">左端:</span>
                  <button
                    type="button"
                    onClick={() => adjustBoundary('left', -10)}
                    className="w-5 h-5 bg-white border border-[#D9C5B2] rounded flex items-center justify-center hover:bg-[#EDF2EE] cursor-pointer"
                    title="左に広げる"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustBoundary('left', 10)}
                    className="w-5 h-5 bg-white border border-[#D9C5B2] rounded flex items-center justify-center hover:bg-[#EDF2EE] cursor-pointer"
                    title="右に狭める"
                  >
                    →
                  </button>
                </div>
                <div className="flex items-center space-x-1 bg-[#F7F3EE] px-2 py-1 rounded-lg border border-[#E8E1D7]">
                  <span className="text-[10px]">右端:</span>
                  <button
                    type="button"
                    onClick={() => adjustBoundary('right', -10)}
                    className="w-5 h-5 bg-white border border-[#D9C5B2] rounded flex items-center justify-center hover:bg-[#EDF2EE] cursor-pointer"
                    title="左に狭める"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustBoundary('right', 10)}
                    className="w-5 h-5 bg-white border border-[#D9C5B2] rounded flex items-center justify-center hover:bg-[#EDF2EE] cursor-pointer"
                    title="右に広げる"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Preset Title Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F7F3EE] p-3 rounded-xl border border-[#E8E1D7]">
            <span className="text-xs font-semibold text-[#5D6D5F] flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              タイトル命名クイック適用:
            </span>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <button
                type="button"
                onClick={() => applyPreset('volume')}
                className="text-xs px-2.5 py-1 bg-white hover:bg-[#EAE4DB] border border-[#D9C5B2] rounded-lg transition-colors cursor-pointer text-[#3E362E]"
              >
                「〇〇 上巻」 / 「〇〇 下巻」
              </button>
              <button
                type="button"
                onClick={() => applyPreset('part')}
                className="text-xs px-2.5 py-1 bg-white hover:bg-[#EAE4DB] border border-[#D9C5B2] rounded-lg transition-colors cursor-pointer text-[#3E362E]"
              >
                「第1巻」 / 「第2巻」
              </button>
              <button
                type="button"
                onClick={() => applyPreset('same')}
                className="text-xs px-2.5 py-1 bg-white hover:bg-[#EAE4DB] border border-[#D9C5B2] rounded-lg transition-colors cursor-pointer text-[#3E362E]"
              >
                同一タイトルの複本 (2冊)
              </button>
            </div>
          </div>

          {/* Section 2: Two Book Information Forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Book 1 Form */}
            <div className="bg-white rounded-xl border-2 border-blue-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                    1冊目（左）
                  </span>
                  <span className="text-xs font-bold text-blue-900">
                    スキャンリスト #{bookIndex + 1}
                  </span>
                </div>
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-[#92400E]">
                  <input
                    type="checkbox"
                    checked={isFailed1}
                    onChange={(e) => setIsFailed1(e.target.checked)}
                    className="rounded text-[#D97706] focus:ring-[#D97706]"
                  />
                  <span>OCR読取不可として扱う</span>
                </label>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-[#3E362E] mb-1">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title1}
                    onChange={(e) => setTitle1(e.target.value)}
                    placeholder="例: プロジェクト・ヘイル・メアリー 上"
                    className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">著者名</label>
                    <input
                      type="text"
                      value={author1}
                      onChange={(e) => setAuthor1(e.target.value)}
                      placeholder="例: アンディ・ウィアー"
                      className="w-full px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">出版社</label>
                    <input
                      type="text"
                      value={publisher1}
                      onChange={(e) => setPublisher1(e.target.value)}
                      placeholder="例: 早川書房"
                      className="w-full px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">ISBNコード</label>
                    <input
                      type="text"
                      value={isbn1}
                      onChange={(e) => setIsbn1(e.target.value)}
                      placeholder="978-4-..."
                      className="w-full px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg font-mono text-[11px] focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">背表紙カラー</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        className="w-8 h-8 rounded border border-[#D9C5B2] cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={color1}
                        onChange={(e) => setColor1(e.target.value)}
                        className="w-full px-2 py-1 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Book 2 Form */}
            <div className="bg-white rounded-xl border-2 border-emerald-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-600 text-white">
                    2冊目（右）
                  </span>
                  <span className="text-xs font-bold text-emerald-900">
                    新規追加 #{bookIndex + 2}
                  </span>
                </div>
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-[#92400E]">
                  <input
                    type="checkbox"
                    checked={isFailed2}
                    onChange={(e) => setIsFailed2(e.target.checked)}
                    className="rounded text-[#D97706] focus:ring-[#D97706]"
                  />
                  <span>OCR読取不可として扱う</span>
                </label>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-[#3E362E] mb-1">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title2}
                    onChange={(e) => setTitle2(e.target.value)}
                    placeholder="例: プロジェクト・ヘイル・メアリー 下"
                    className="w-full px-3 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">著者名</label>
                    <input
                      type="text"
                      value={author2}
                      onChange={(e) => setAuthor2(e.target.value)}
                      placeholder="例: アンディ・ウィアー"
                      className="w-full px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">出版社</label>
                    <input
                      type="text"
                      value={publisher2}
                      onChange={(e) => setPublisher2(e.target.value)}
                      placeholder="例: 早川書房"
                      className="w-full px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">ISBNコード</label>
                    <input
                      type="text"
                      value={isbn2}
                      onChange={(e) => setIsbn2(e.target.value)}
                      placeholder="978-4-..."
                      className="w-full px-2.5 py-1.5 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg font-mono text-[11px] focus:ring-1 focus:ring-[#5D6D5F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#786C5E] mb-1">背表紙カラー</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                        className="w-8 h-8 rounded border border-[#D9C5B2] cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={color2}
                        onChange={(e) => setColor2(e.target.value)}
                        className="w-full px-2 py-1 bg-[#FDFBF7] border border-[#D9C5B2] rounded-lg font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E1D7] bg-white">
          <div className="text-xs text-[#786C5E] flex items-center space-x-2">
            <Info className="w-4 h-4 text-[#8C7D6F]" />
            <span>
              反映すると、元の「#{bookIndex + 1}」が2冊に置き換わり、スキャン結果の総冊数が +1 冊増加します。
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#786C5E] hover:text-[#3E362E] hover:bg-[#F7F3EE] rounded-lg transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-bold text-white bg-[#5D6D5F] hover:bg-[#4D5C4F] rounded-lg shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>スキャン結果に反映（2冊に分割）</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
