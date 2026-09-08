export interface SampleBookItem {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  publishedYear: string;
  genre: string;
  color: string;
  width: number;
}

export interface SampleBookshelf {
  id: string;
  title: string;
  category: string;
  description: string;
  thumbnail: string;
  imageDataUrl: string;
  expectedBooksCount: number;
  books: SampleBookItem[];
}

// Generate realistic SVG bookshelf images converted to data URL
function createBookshelfSvgDataUrl(title: string, books: SampleBookItem[]): string {
  const shelfWidth = 640;
  const shelfHeight = 380;
  
  let currentX = 45;
  let bookSpines = '';
  
  books.forEach((book, i) => {
    const bHeight = 230 + (i % 3) * 15;
    const yPos = shelfHeight - 65 - bHeight;
    const bookWidth = book.width;
    
    // Vertical text & ISBN representation
    bookSpines += `
      <g transform="translate(${currentX}, ${yPos})">
        <!-- Book Spine -->
        <rect width="${bookWidth}" height="${bHeight}" rx="3" fill="${book.color}" stroke="#1e293b" stroke-width="1.5" />
        <rect x="2" y="4" width="${bookWidth - 4}" height="6" fill="rgba(255,255,255,0.28)" rx="1" />
        <rect x="2" y="${bHeight - 12}" width="${bookWidth - 4}" height="6" fill="rgba(0,0,0,0.25)" rx="1" />
        
        <!-- Publisher Tag at top -->
        <rect x="4" y="14" width="${bookWidth - 8}" height="14" fill="rgba(255,255,255,0.15)" rx="2" />
        <text x="${bookWidth / 2}" y="24" fill="#ffffff" font-family="'Noto Sans JP', sans-serif" font-size="7" font-weight="bold" text-anchor="middle">
          ${escapeXml(book.publisher.substring(0, 5))}
        </text>

        <!-- Spine Title & Author Text -->
        <text x="${bookWidth / 2}" y="45" fill="#ffffff" font-family="'Noto Serif JP', 'Noto Sans JP', sans-serif" font-size="11" font-weight="bold" text-anchor="middle" transform="rotate(90, ${bookWidth / 2}, 45)">
          ${escapeXml(book.title)}
        </text>
        <text x="${bookWidth / 2}" y="${bHeight - 55}" fill="rgba(255,255,255,0.9)" font-family="'Noto Sans JP', sans-serif" font-size="8.5" text-anchor="middle" transform="rotate(90, ${bookWidth / 2}, ${bHeight - 55})">
          ${escapeXml(book.author)}
        </text>

        <!-- Mini Barcode & ISBN Text at bottom -->
        <rect x="5" y="${bHeight - 38}" width="${bookWidth - 10}" height="12" fill="#ffffff" rx="1" />
        <line x1="8" y1="${bHeight - 36}" x2="8" y2="${bHeight - 28}" stroke="#111827" stroke-width="1" />
        <line x1="11" y1="${bHeight - 36}" x2="11" y2="${bHeight - 28}" stroke="#111827" stroke-width="1.5" />
        <line x1="15" y1="${bHeight - 36}" x2="15" y2="${bHeight - 28}" stroke="#111827" stroke-width="1" />
        <line x1="18" y1="${bHeight - 36}" x2="18" y2="${bHeight - 28}" stroke="#111827" stroke-width="2" />
        <line x1="22" y1="${bHeight - 36}" x2="22" y2="${bHeight - 28}" stroke="#111827" stroke-width="1" />
        <line x1="26" y1="${bHeight - 36}" x2="26" y2="${bHeight - 28}" stroke="#111827" stroke-width="1.5" />
        
        <!-- Printed ISBN text -->
        <text x="${bookWidth / 2}" y="${bHeight - 16}" fill="#f8fafc" font-family="monospace" font-size="6.5" font-weight="bold" text-anchor="middle">
          ${escapeXml(book.isbn.replace(/[^0-9X-]/gi, ''))}
        </text>
      </g>
    `;
    currentX += bookWidth + 4;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${shelfWidth} ${shelfHeight}" width="100%" height="100%">
    <defs>
      <linearGradient id="woodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#78350f" />
        <stop offset="50%" stop-color="#92400e" />
        <stop offset="100%" stop-color="#451a03" />
      </linearGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FDFBF7" />
        <stop offset="100%" stop-color="#EFE9E0" />
      </linearGradient>
    </defs>
    <!-- Background Wall -->
    <rect width="${shelfWidth}" height="${shelfHeight}" fill="url(#bgGrad)" />
    
    <!-- Shelf Back Panel -->
    <rect x="20" y="20" width="${shelfWidth - 40}" height="${shelfHeight - 40}" fill="#F7F3EE" stroke="#D9C5B2" stroke-width="2" rx="4" />
    
    <!-- Shelf Top Shadow -->
    <rect x="30" y="30" width="${shelfWidth - 60}" height="10" fill="rgba(0,0,0,0.04)" />
    
    <!-- Shelf Wood Plank Bottom -->
    <rect x="20" y="${shelfHeight - 65}" width="${shelfWidth - 40}" height="35" fill="url(#woodGrad)" stroke="#451a03" stroke-width="1.5" rx="2" />
    <rect x="20" y="${shelfHeight - 30}" width="${shelfWidth - 40}" height="8" fill="#451a03" opacity="0.6" />
    
    <!-- Title Label on Shelf -->
    <text x="${shelfWidth / 2}" y="${shelfHeight - 43}" fill="#fef3c7" font-family="'Noto Serif JP', sans-serif" font-size="13" font-weight="bold" text-anchor="middle" letter-spacing="1">
      ◆ ${escapeXml(title)} ◆
    </text>

    <!-- Books on Shelf -->
    ${bookSpines}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const TECH_BOOKS: SampleBookItem[] = [
  { title: "リーダブルコード", author: "Dustin Boswell", publisher: "オライリー", isbn: "978-4-87311-565-8", publishedYear: "2012", genre: "技術書", color: "#d97706", width: 44 },
  { title: "プロを目指す人のためのTypeScript", author: "鈴木 孝明", publisher: "技術評論社", isbn: "978-4-29712-747-3", publishedYear: "2022", genre: "技術書", color: "#2563eb", width: 48 },
  { title: "クリーンアーキテクチャ", author: "Robert C. Martin", publisher: "ドワンゴ", isbn: "978-4-04893-065-9", publishedYear: "2018", genre: "技術書", color: "#059669", width: 52 },
  { title: "Docker&Kubernetes 実践コンテナ開発入門", author: "山田 剛史", publisher: "マイナビ出版", isbn: "978-4-83997-393-3", publishedYear: "2020", genre: "技術書", color: "#0284c7", width: 46 },
  { title: "Python実践データ分析100本ノック", author: "下山 輝昌", publisher: "秀和システム", isbn: "978-4-79805-875-7", publishedYear: "2019", genre: "技術書", color: "#4f46e5", width: 50 },
  { title: "達人プログラマー 職人から名匠へ", author: "Andrew Hunt", publisher: "オーム社", isbn: "978-4-27422-629-8", publishedYear: "2020", genre: "技術書", color: "#dc2626", width: 42 },
  { title: "SQL第2版 ゼロからはじめるデータベース操作", author: "ミック", publisher: "翔泳社", isbn: "978-4-79814-445-0", publishedYear: "2016", genre: "技術書", color: "#7c3aed", width: 46 }
];

const BUSINESS_BOOKS: SampleBookItem[] = [
  { title: "嫌われる勇気", author: "岸見 一郎", publisher: "ダイヤモンド社", isbn: "978-4-47802-581-9", publishedYear: "2013", genre: "ビジネス", color: "#3b82f6", width: 45 },
  { title: "エッセンシャル思考 最少の時間で成果を最大にする", author: "グレッグ・マキューン", publisher: "かんき出版", isbn: "978-4-76127-043-8", publishedYear: "2014", genre: "ビジネス", color: "#1e293b", width: 48 },
  { title: "FACTFULNESS(ファクトフルネス)", author: "ハンス・ロスリング", publisher: "日経BP", isbn: "978-4-82228-960-7", publishedYear: "2019", genre: "ビジネス", color: "#db2777", width: 52 },
  { title: "イシューからはじめよ 知的生産の「シンプルな本質」", author: "安宅 和人", publisher: "英治出版", isbn: "978-4-86276-085-2", publishedYear: "2010", genre: "ビジネス", color: "#ea580c", width: 46 },
  { title: "シン・ニホン AI×データ時代の日本の再生戦略", author: "安宅 和人", publisher: "NewsPicks", isbn: "978-4-91006-304-1", publishedYear: "2020", genre: "ビジネス", color: "#0d9488", width: 50 },
  { title: "ゼロ・トゥ・ワン 君は宇宙を動かせるか", author: "ピーター・ティール", publisher: "NHK出版", isbn: "978-4-14081-658-5", publishedYear: "2014", genre: "ビジネス", color: "#6366f1", width: 44 }
];

const NOVEL_BOOKS: SampleBookItem[] = [
  { title: "プロジェクト・ヘイル・メアリー 上", author: "アンディ・ウィアー", publisher: "早川書房", isbn: "978-4-15012-344-5", publishedYear: "2021", genre: "文学・小説", color: "#059669", width: 42 },
  { title: "プロジェクト・ヘイル・メアリー 下", author: "アンディ・ウィアー", publisher: "早川書房", isbn: "978-4-15012-345-2", publishedYear: "2021", genre: "文学・小説", color: "#10b981", width: 42 },
  { title: "白夜行", author: "東野 圭吾", publisher: "集英社文庫", isbn: "978-4-08747-439-8", publishedYear: "2002", genre: "文学・小説", color: "#334155", width: 46 },
  { title: "容疑者Xの献身", author: "東野 圭吾", publisher: "文春文庫", isbn: "978-4-16715-805-7", publishedYear: "2008", genre: "文学・小説", color: "#475569", width: 44 },
  { title: "かがみの孤城", author: "辻村 深月", publisher: "ポプラ社", isbn: "978-4-59115-332-1", publishedYear: "2017", genre: "文学・小説", color: "#6366f1", width: 48 },
  { title: "ノルウェイの森", author: "村上 春樹", publisher: "講談社文庫", isbn: "978-4-06274-868-1", publishedYear: "2004", genre: "文学・小説", color: "#b91c1c", width: 44 },
  { title: "夜は短し歩けよ乙女", author: "森見 登美彦", publisher: "角川文庫", isbn: "978-4-04387-802-4", publishedYear: "2008", genre: "文学・小説", color: "#d97706", width: 42 }
];

export const SAMPLE_BOOKSHELVES: SampleBookshelf[] = [
  {
    id: "sample-tech",
    title: "IT・技術書＆プログラミング棚",
    category: "技術書",
    description: "プログラミング言語、Web開発、アーキテクチャ設計などの専門書が並ぶ本棚",
    expectedBooksCount: 7,
    thumbnail: "",
    books: TECH_BOOKS,
    imageDataUrl: createBookshelfSvgDataUrl("技術書・プログラミング本棚", TECH_BOOKS)
  },
  {
    id: "sample-business",
    title: "ビジネス・思考法＆ベストセラー棚",
    category: "ビジネス",
    description: "仕事術、リーダーシップ、マーケティング、思考法の話題作が並ぶ本棚",
    expectedBooksCount: 6,
    thumbnail: "",
    books: BUSINESS_BOOKS,
    imageDataUrl: createBookshelfSvgDataUrl("ビジネス・思考法本棚", BUSINESS_BOOKS)
  },
  {
    id: "sample-novels",
    title: "小説・文芸＆SFミステリー棚",
    category: "文学・小説",
    description: "国内外のベストセラー小説、ミステリー、SF小説が並ぶ本棚",
    expectedBooksCount: 7,
    thumbnail: "",
    books: NOVEL_BOOKS,
    imageDataUrl: createBookshelfSvgDataUrl("小説・文庫・ミステリー本棚", NOVEL_BOOKS)
  }
];
