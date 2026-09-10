import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large payloads for high-resolution bookshelf photos
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Persistent storage path
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "books.json");
const CORRECTIONS_FILE = path.join(DATA_DIR, "corrections.json");
const AUDIT_LOGS_FILE = path.join(DATA_DIR, "audit_logs.json");

// Retention period: 7 days (1 week)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data to make the app immediately informative & interactive
const INITIAL_SEED_BOOKS = [
  {
    id: "book-seed-1",
    title: "リーダブルコード ―より良いコードを書くためのシンプルで実践的なテクニック",
    author: "Dustin Boswell, Trevor Foucher",
    publisher: "オライリー・ジャパン",
    publishedYear: "2012",
    isbn: "978-4-87311-565-8",
    genre: "技術書",
    shelfLocation: "第1書架 A-1棚",
    spineColor: "#f59e0b",
    summary: "読みやすいコードを書くための命名規則、コメント、制御フローの整理法などをわかりやすく解説した必読書。",
    isOcrFailed: false,
    auditStatus: "normal",
    auditNotes: "配架・ISBN確認済",
    review: {
      rating: 5,
      comment: "エンジニア必読のバイブル。変数の命名や早期リターンなど、チーム開発ですぐに実践できる知恵が詰まっています。",
      quotes: "コードは他の人が最短時間で理解できるように書かなければならない。",
      tags: ["エンジニア必読", "チーム開発", "設計"],
      readingStatus: "completed",
      completedDate: "2025-11-15",
      updatedAt: "2025-11-15T10:00:00.000Z"
    },
    registeredVia: "manual",
    createdAt: "2025-10-01T09:00:00.000Z",
    updatedAt: "2026-01-24T18:00:00.000Z"
  },
  {
    id: "book-seed-2",
    title: "嫌われる勇気 自己啓発の源流「アドラー」の教え",
    author: "岸見 一郎, 古賀 史健",
    publisher: "ダイヤモンド社",
    publishedYear: "2013",
    isbn: "978-4-478-02581-9",
    genre: "ビジネス・自己啓発",
    shelfLocation: "第1書架 A-2棚",
    spineColor: "#3b82f6",
    summary: "対人関係の悩みを解決するアドラー心理学を青年と哲人の対話形式で解き明かすベストセラー。",
    isOcrFailed: false,
    auditStatus: "normal",
    auditNotes: "配架良好",
    review: {
      rating: 4,
      comment: "「課題の分離」という考え方を知ってから、他人の顔色を伺いすぎずに生きられるようになった。再読したい一冊。",
      quotes: "あなたの不幸は、あなた自身が「選んだ」ものなのです。",
      tags: ["心理学", "人間関係", "思考法"],
      readingStatus: "completed",
      completedDate: "2025-12-05",
      updatedAt: "2025-12-05T14:30:00.000Z"
    },
    registeredVia: "manual",
    createdAt: "2025-11-20T11:00:00.000Z",
    updatedAt: "2026-02-15T16:00:00.000Z"
  },
  {
    id: "book-seed-3",
    title: "OCR読み取り不可（背表紙退色・印字スレ）",
    author: "不明",
    publisher: "岩波文庫",
    publishedYear: "",
    isbn: "",
    genre: "文学・小説",
    shelfLocation: "第1書架 A-2棚",
    spineColor: "#a8a29e",
    summary: "経年日焼け・スレのためOCR画像解析で書名が読み取り困難だった書籍。蔵書点検時に現物確認が必要。",
    isOcrFailed: true,
    auditStatus: "ocr_failed",
    auditNotes: "背表紙の文字がかすれて読み取り不可。現物を取り出して要タイトル再確認",
    review: {
      rating: 0,
      comment: "",
      tags: ["要現物確認", "点検対象"],
      readingStatus: "unread",
      updatedAt: "2026-02-10T10:00:00.000Z"
    },
    registeredVia: "scan",
    createdAt: "2026-02-10T10:00:00.000Z",
    updatedAt: "2026-02-10T10:00:00.000Z"
  },
  {
    id: "book-seed-4",
    title: "プロジェクト・ヘイル・メアリー (上・下)",
    author: "アンディ・ウィアー",
    publisher: "早川書房",
    publishedYear: "2021",
    isbn: "978-4-15-012344-5",
    genre: "小説・SF",
    shelfLocation: "第2書架 B-1棚",
    spineColor: "#10b981",
    summary: "地球滅亡の危機を救うため、たった一人宇宙へ旅立った科学教師の冒険を描く傑作ハードSF小説。",
    isOcrFailed: false,
    auditStatus: "normal",
    auditNotes: "配架正常・帯あり",
    review: {
      rating: 5,
      comment: "ページをめくる手が止まらない最高傑作。ロッキーとの絆に涙。SF好きなら絶対に読むべき！",
      quotes: "「人間、アメイジング！」「友情、グッド！」",
      tags: ["SF", "感動", "宇宙", "最高傑作"],
      readingStatus: "completed",
      completedDate: "2026-01-08",
      updatedAt: "2026-01-08T22:00:00.000Z"
    },
    registeredVia: "scan",
    createdAt: "2026-01-02T13:00:00.000Z",
    updatedAt: "2026-01-08T22:00:00.000Z"
  },
  {
    id: "book-seed-5",
    title: "体系的に学ぶ 安全なWebアプリケーションの作り方 第2版",
    author: "徳丸 浩",
    publisher: "SBクリエイティブ",
    publishedYear: "2018",
    isbn: "978-4-7973-9316-2",
    genre: "技術書",
    shelfLocation: "第1書架 A-1棚",
    spineColor: "#6366f1",
    summary: "通称『徳丸本』。Webセキュリティの基本から脆弱性の原理と対策を網羅した標準的教科書。",
    isOcrFailed: false,
    auditStatus: "normal",
    auditNotes: "良好",
    review: {
      rating: 5,
      comment: "セキュリティ対策の実践的なリファレンスとして手放せない。新機能開発時は必ず見返している。",
      quotes: "安全なWebアプリケーション開発のための鉄則。",
      tags: ["セキュリティ", "Web開発", "リファレンス"],
      readingStatus: "reading",
      updatedAt: "2026-02-10T12:00:00.000Z"
    },
    registeredVia: "manual",
    createdAt: "2025-09-10T15:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z"
  },
  {
    id: "book-seed-6",
    title: "FACTFULNESS(ファクトフルネス)",
    author: "ハンス・ロスリング, オーラ・ロスリング, アンナ・ロスリング・ロンランド",
    publisher: "日経BP",
    publishedYear: "2019",
    isbn: "978-4-8222-8960-7",
    genre: "ビジネス・社会",
    shelfLocation: "第2書架 B-2棚",
    spineColor: "#ec4899",
    summary: "データや事実に基づいて世界を正しく見る10の思い込み（本能）を解説した世界的ベストセラー。",
    isOcrFailed: false,
    auditStatus: "normal",
    auditNotes: "配架正常",
    review: {
      rating: 4,
      comment: "思い込みで悲観的に世界を捉えていたことに気付かされた。グラフの見せ方やファクトの大切さがわかる。",
      tags: ["教養", "データ", "ファクト"],
      readingStatus: "completed",
      completedDate: "2025-08-20",
      updatedAt: "2025-08-20T16:00:00.000Z"
    },
    registeredVia: "manual",
    createdAt: "2025-09-15T14:00:00.000Z",
    updatedAt: "2026-01-20T17:00:00.000Z"
  },
  {
    id: "book-seed-7",
    title: "OCR読み取り不可（極細背表紙・小冊子）",
    author: "不明",
    publisher: "",
    publishedYear: "",
    isbn: "",
    genre: "未分類",
    shelfLocation: "第2書架 B-2棚",
    spineColor: "#78716c",
    summary: "背表紙の幅が非常に狭く、カメラ解像度で文字抽出ができなかった書籍。冊数カウント用として保持。",
    isOcrFailed: true,
    auditStatus: "ocr_failed",
    auditNotes: "棚卸し冊数として1冊計上。手動確認を推奨",
    review: {
      rating: 0,
      comment: "",
      tags: ["点検対象", "薄型小冊子"],
      readingStatus: "unread",
      updatedAt: "2026-02-14T11:00:00.000Z"
    },
    registeredVia: "scan",
    createdAt: "2026-02-14T11:00:00.000Z",
    updatedAt: "2026-02-14T11:00:00.000Z"
  }
];

// Helper to read books
function getStoredBooks(): any[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_SEED_BOOKS, null, 2), "utf-8");
      return INITIAL_SEED_BOOKS;
    }
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(content);
    // Enrich existing seed books with isbn if missing
    let hasChanges = false;
    const enriched = parsed.map((book: any) => {
      if (!book.isbn) {
        const seedMatch = INITIAL_SEED_BOOKS.find(s => s.id === book.id || s.title === book.title);
        if (seedMatch?.isbn) {
          hasChanges = true;
          return { ...book, isbn: seedMatch.isbn };
        }
      }
      return book;
    });
    if (hasChanges) {
      saveStoredBooks(enriched);
    }
    return enriched;
  } catch (err) {
    console.error("Error reading books data file:", err);
    return INITIAL_SEED_BOOKS;
  }
}

// Helper to write books
function saveStoredBooks(books: any[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing books data file:", err);
  }
}

// Helper to read correction logs for OCR learning
function getStoredCorrections(): any[] {
  try {
    if (!fs.existsSync(CORRECTIONS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(CORRECTIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading corrections data file:", err);
    return [];
  }
}

// Helper to write correction logs
function saveStoredCorrections(corrections: any[]): void {
  try {
    fs.writeFileSync(CORRECTIONS_FILE, JSON.stringify(corrections, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing corrections data file:", err);
  }
}

// Helper to read data audit logs (1-week retention)
function getStoredAuditLogs(): any[] {
  try {
    if (!fs.existsSync(AUDIT_LOGS_FILE)) {
      const now = Date.now();
      const initialLogs = [
        {
          id: "log-seed-1",
          timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          actionType: "update",
          targetTitle: "リーダブルコード ―より良いコードを書くためのシンプルで実践的なテクニック",
          targetBookId: "book-seed-1",
          details: "読書状況を「読了」に更新し、レビュー・評価★5を追加しました。",
          changes: [
            { field: "readingStatus", fieldLabel: "読書状況", oldValue: "reading", newValue: "completed" },
            { field: "rating", fieldLabel: "評価", oldValue: 0, newValue: 5 }
          ],
          operator: "ユーザー操作"
        },
        {
          id: "log-seed-2",
          timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
          actionType: "bulk_update",
          targetTitle: "第1書架 A-1棚の書籍 (3冊)",
          details: "本棚配置を一括して「第1書架 A-1棚」に整理しました。",
          changes: [
            { field: "shelfLocation", fieldLabel: "本棚の場所", oldValue: "未定", newValue: "第1書架 A-1棚" }
          ],
          operator: "一括編集"
        },
        {
          id: "log-seed-3",
          timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          actionType: "create",
          targetTitle: "嫌われる勇気 自己啓発の源流「アドラー」の教え",
          targetBookId: "book-seed-2",
          details: "手動登録により書籍を追加しました。",
          changes: [],
          operator: "手動登録"
        }
      ];
      saveStoredAuditLogs(initialLogs);
      return initialLogs;
    }
    const raw = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
    const logs: any[] = JSON.parse(raw);
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    // Keep only logs from the past 7 days
    const validLogs = logs.filter((l: any) => new Date(l.timestamp).getTime() >= cutoff);
    if (validLogs.length !== logs.length) {
      saveStoredAuditLogs(validLogs);
    }
    return validLogs;
  } catch (err) {
    console.error("Error reading audit logs:", err);
    return [];
  }
}

// Helper to write data audit logs
function saveStoredAuditLogs(logs: any[]): void {
  try {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const validLogs = logs.filter((l: any) => new Date(l.timestamp).getTime() >= cutoff);
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(validLogs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing audit logs:", err);
  }
}

// Helper to record a new data audit log entry
function recordDataAuditLog(logItem: {
  actionType: string;
  targetTitle: string;
  targetBookId?: string;
  details: string;
  changes?: any[];
  operator?: string;
}): void {
  try {
    const current = getStoredAuditLogs();
    const newEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actionType: logItem.actionType,
      targetTitle: logItem.targetTitle,
      targetBookId: logItem.targetBookId,
      details: logItem.details,
      changes: logItem.changes || [],
      operator: logItem.operator || "ユーザー"
    };
    saveStoredAuditLogs([newEntry, ...current]);
  } catch (e) {
    console.error("Failed to record data audit log:", e);
  }
}

// Gemini AI client initialization
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// --- API ROUTES ---

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// GET all books
app.get("/api/books", (_req, res) => {
  const books = getStoredBooks();
  res.json({ books });
});

// POST register book(s)
app.post("/api/books", (req, res) => {
  try {
    const { books: newBooks, book: singleBook } = req.body;
    const current = getStoredBooks();
    const toAdd = Array.isArray(newBooks) ? newBooks : (singleBook ? [singleBook] : []);

    if (toAdd.length === 0) {
      return res.status(400).json({ error: "登録する書籍データが指定されていません" });
    }

    const now = new Date().toISOString();
    const formattedBooks = toAdd.map((item: any, idx: number) => {
      const id = item.id || `book-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        ...item,
        id,
        title: item.title || "無題の書籍",
        author: item.author || "著者不明",
        publisher: item.publisher || "",
        publishedYear: item.publishedYear || "",
        isbn: item.isbn || "",
        genre: item.genre || "一般",
        shelfLocation: item.shelfLocation || "メイン本棚",
        spineColor: item.spineColor || "#5D6D5F",
        summary: item.summary || item.description || "",
        isOcrFailed: Boolean(item.isOcrFailed),
        auditStatus: item.auditStatus || (item.isOcrFailed ? "ocr_failed" : "normal"),
        auditNotes: item.auditNotes || "",
        registeredBy: item.registeredBy || req.body.operator || "",
        review: item.review || {
          rating: 0,
          comment: "",
          tags: [],
          readingStatus: "unread",
          updatedAt: now
        },
        lending: item.lending || {
          status: "available",
          history: []
        },
        registeredVia: item.registeredVia || "scan",
        createdAt: item.createdAt || now,
        updatedAt: now
      };
    });

    const updated = [...formattedBooks, ...current];
    saveStoredBooks(updated);

    recordDataAuditLog({
      actionType: "create",
      targetTitle: formattedBooks.length === 1 ? formattedBooks[0].title : `${formattedBooks[0].title} ほか計${formattedBooks.length}冊`,
      details: `${formattedBooks.length} 冊の書籍を点検台帳・共有本棚に新規登録しました（配架先: ${formattedBooks[0].shelfLocation}）`,
      operator: req.body.operator || (formattedBooks[0].registeredBy || "ユーザー操作")
    });

    res.json({ success: true, count: formattedBooks.length, added: formattedBooks, books: updated });
  } catch (err: any) {
    console.error("Failed to add books:", err);
    res.status(500).json({ error: err.message || "書籍の登録に失敗しました" });
  }
});

// PUT update book
app.put("/api/books/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const current = getStoredBooks();
    const index = current.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "該当する書籍が見つかりませんでした" });
    }

    const now = new Date().toISOString();
    const existing = current[index];

    // Merge updates nicely
    const updatedBook = {
      ...existing,
      ...updates,
      review: {
        ...existing.review,
        ...(updates.review || {}),
        updatedAt: now
      },
      lending: {
        ...existing.lending,
        ...(updates.lending || {})
      },
      updatedAt: now
    };

    // Collect changes for audit log
    const changes: any[] = [];
    if (updates.title && updates.title !== existing.title) {
      changes.push({ field: "title", fieldLabel: "タイトル", oldValue: existing.title, newValue: updates.title });
    }
    if (updates.author && updates.author !== existing.author) {
      changes.push({ field: "author", fieldLabel: "著者名", oldValue: existing.author, newValue: updates.author });
    }
    if (updates.shelfLocation && updates.shelfLocation !== existing.shelfLocation) {
      changes.push({ field: "shelfLocation", fieldLabel: "本棚の場所", oldValue: existing.shelfLocation || "未定", newValue: updates.shelfLocation });
    }
    if (updates.genre && updates.genre !== existing.genre) {
      changes.push({ field: "genre", fieldLabel: "ジャンル", oldValue: existing.genre, newValue: updates.genre });
    }
    if (updates.isbn && updates.isbn !== existing.isbn) {
      changes.push({ field: "isbn", fieldLabel: "ISBN", oldValue: existing.isbn || "", newValue: updates.isbn });
    }
    if (updates.isOcrFailed !== undefined && updates.isOcrFailed !== existing.isOcrFailed) {
      changes.push({ field: "isOcrFailed", fieldLabel: "OCR点検状態", oldValue: existing.isOcrFailed ? "読取不可" : "正常", newValue: updates.isOcrFailed ? "読取不可" : "正常" });
    }

    current[index] = updatedBook;
    saveStoredBooks(current);

    recordDataAuditLog({
      actionType: "update",
      targetTitle: updatedBook.title,
      targetBookId: updatedBook.id,
      details: changes.length > 0 ? `${changes.map(c => c.fieldLabel).join("、")}を更新しました` : "書籍情報を更新しました",
      changes,
      operator: req.body.operator || "個別編集"
    });

    res.json({ success: true, book: updatedBook });
  } catch (err: any) {
    console.error("Failed to update book:", err);
    res.status(500).json({ error: err.message || "書籍の更新に失敗しました" });
  }
});

// DELETE single book
app.delete("/api/books/:id", (req, res) => {
  try {
    const { id } = req.params;
    const current = getStoredBooks();
    const targetBook = current.find(b => b.id === id);
    const filtered = current.filter(b => b.id !== id);

    if (filtered.length === current.length) {
      return res.status(404).json({ error: "該当する書籍が見つかりませんでした" });
    }

    saveStoredBooks(filtered);

    if (targetBook) {
      recordDataAuditLog({
        actionType: "delete",
        targetTitle: targetBook.title,
        targetBookId: targetBook.id,
        details: `書籍「${targetBook.title}」を削除しました`,
        operator: "ユーザー操作"
      });
    }

    res.json({ success: true, books: filtered });
  } catch (err: any) {
    console.error("Failed to delete book:", err);
    res.status(500).json({ error: err.message || "書籍の削除に失敗しました" });
  }
});

// POST bulk delete books
app.post("/api/books/bulk-delete", (req, res) => {
  try {
    const { ids, all } = req.body;
    const current = getStoredBooks();

    if (all) {
      const deletedCount = current.length;
      saveStoredBooks([]);
      recordDataAuditLog({
        actionType: "bulk_delete",
        targetTitle: `全蔵書データ (${deletedCount}冊)`,
        details: `すべての登録書籍データ (${deletedCount}冊) を一括削除しました`,
        operator: "一括メンテナンス"
      });
      return res.json({ success: true, deletedCount, books: [] });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "削除対象のID配列が指定されていません" });
    }

    const idSet = new Set(ids);
    const deletedBooks = current.filter(b => idSet.has(b.id));
    const remaining = current.filter(b => !idSet.has(b.id));

    saveStoredBooks(remaining);

    recordDataAuditLog({
      actionType: "bulk_delete",
      targetTitle: deletedBooks.length === 1 ? deletedBooks[0].title : `${deletedBooks.length}冊の書籍`,
      details: `${deletedBooks.length}冊の書籍を一括削除しました（例: ${deletedBooks.slice(0, 3).map(b => b.title).join("、")}${deletedBooks.length > 3 ? "…他" : ""}）`,
      operator: "一括メンテナンス"
    });

    res.json({ success: true, deletedCount: deletedBooks.length, books: remaining });
  } catch (err: any) {
    console.error("Bulk delete error:", err);
    res.status(500).json({ error: err.message || "一括削除に失敗しました" });
  }
});

// POST bulk update books
app.post("/api/books/bulk-update", (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !updates) {
      return res.status(400).json({ error: "更新対象の書籍IDと更新内容を指定してください" });
    }

    const current = getStoredBooks();
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    let updatedCount = 0;

    const modified = current.map(book => {
      if (idSet.has(book.id)) {
        updatedCount++;
        return {
          ...book,
          ...updates,
          review: {
            ...book.review,
            ...(updates.review || {}),
            updatedAt: now
          },
          updatedAt: now
        };
      }
      return book;
    });

    saveStoredBooks(modified);

    const changedFieldLabels = Object.keys(updates).map(k => {
      if (k === "shelfLocation") return "本棚の場所";
      if (k === "genre") return "ジャンル";
      if (k === "isOcrFailed") return "OCR点検状態";
      if (k === "review") return "読書状況・評価";
      return k;
    });

    recordDataAuditLog({
      actionType: "bulk_update",
      targetTitle: `${updatedCount}冊の書籍`,
      details: `${updatedCount}冊の書籍を一括更新しました（変更項目: ${changedFieldLabels.join("、")}）`,
      changes: Object.entries(updates).map(([k, v]) => ({
        field: k,
        fieldLabel: k,
        oldValue: "一括指定前",
        newValue: v
      })),
      operator: "一括メンテナンス"
    });

    res.json({ success: true, updatedCount, books: modified });
  } catch (err: any) {
    console.error("Bulk update error:", err);
    res.status(500).json({ error: err.message || "一括更新に失敗しました" });
  }
});

// POST bulk upsert (for CSV import and bulk register/update)
app.post("/api/books/bulk-upsert", (req, res) => {
  try {
    const { inserts = [], updates = [], source = "csv_import" } = req.body;
    const current = getStoredBooks();
    const now = new Date().toISOString();

    // 1. Process updates
    const updateMap = new Map<string, any>();
    updates.forEach((u: any) => {
      if (u.id || u.bookId) updateMap.set(u.id || u.bookId, u.updates);
    });

    let updatedCount = 0;
    const modified = current.map(book => {
      if (updateMap.has(book.id)) {
        updatedCount++;
        const u = updateMap.get(book.id);
        return {
          ...book,
          ...u,
          review: {
            ...book.review,
            ...(u.review || {}),
            updatedAt: now
          },
          updatedAt: now
        };
      }
      return book;
    });

    // 2. Process inserts
    const newBooks = inserts.map((item: any, idx: number) => {
      const id = item.id || `book-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        id,
        title: item.title || "無題の書籍",
        author: item.author || "著者不明",
        publisher: item.publisher || "",
        publishedYear: item.publishedYear || "",
        isbn: item.isbn || "",
        genre: item.genre || "一般",
        shelfLocation: item.shelfLocation || "未定",
        spineColor: item.spineColor || "#5D6D5F",
        summary: item.summary || "",
        isOcrFailed: item.isOcrFailed ?? false,
        auditStatus: item.auditStatus || (item.isOcrFailed ? "ocr_failed" : "normal"),
        auditNotes: item.auditNotes || "",
        review: item.review || {
          rating: 0,
          comment: "",
          tags: [],
          readingStatus: "unread",
          updatedAt: now
        },
        registeredVia: item.registeredVia || "manual",
        createdAt: item.createdAt || now,
        updatedAt: now
      };
    });

    const finalBooks = [...newBooks, ...modified];
    saveStoredBooks(finalBooks);

    recordDataAuditLog({
      actionType: source === "csv_import" ? "csv_import" : "bulk_create",
      targetTitle: `${inserts.length}冊追加 / ${updatedCount}冊更新`,
      details: source === "csv_import"
        ? `CSVインポートにより ${inserts.length}冊を新規登録、${updatedCount}冊の既存書籍を上書き更新しました`
        : `一括操作により ${inserts.length}冊を新規登録、${updatedCount}冊を更新しました`,
      operator: source === "csv_import" ? "CSVインポート" : "一括メンテナンス"
    });

    res.json({
      success: true,
      insertedCount: newBooks.length,
      updatedCount,
      books: finalBooks
    });
  } catch (err: any) {
    console.error("Bulk upsert error:", err);
    res.status(500).json({ error: err.message || "一括登録・更新に失敗しました" });
  }
});

// GET data audit logs (past 7 days)
app.get("/api/data-logs", (_req, res) => {
  try {
    const logs = getStoredAuditLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: "ログの取得に失敗しました" });
  }
});

// POST custom data audit log
app.post("/api/data-logs", (req, res) => {
  try {
    const { actionType, targetTitle, targetBookId, details, changes, operator } = req.body;
    recordDataAuditLog({
      actionType: actionType || "update",
      targetTitle: targetTitle || "書籍データ",
      targetBookId,
      details: details || "データが更新されました",
      changes,
      operator
    });
    res.json({ success: true, logs: getStoredAuditLogs() });
  } catch (err: any) {
    res.status(500).json({ error: "ログの記録に失敗しました" });
  }
});

// DELETE clear data audit logs
app.delete("/api/data-logs", (_req, res) => {
  try {
    saveStoredAuditLogs([]);
    res.json({ success: true, logs: [] });
  } catch (err: any) {
    res.status(500).json({ error: "ログの消去に失敗しました" });
  }
});

// POST reset to seed
app.post("/api/books/reset", (_req, res) => {
  try {
    saveStoredBooks(INITIAL_SEED_BOOKS);
    recordDataAuditLog({
      actionType: "reset",
      targetTitle: "データベース初期化",
      details: "初期点検サンプルデータ（4冊）にデータベースを復元しました",
      operator: "ユーザー操作"
    });
    res.json({ success: true, books: INITIAL_SEED_BOOKS });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "初期化に失敗しました" });
  }
});

// --- CORRECTION LEARNING LOGS APIS ---

// GET all correction logs
app.get("/api/corrections", (_req, res) => {
  try {
    const corrections = getStoredCorrections();
    res.json({ corrections });
  } catch (err: any) {
    console.error("Failed to get corrections:", err);
    res.status(500).json({ error: "修正履歴の取得に失敗しました" });
  }
});

// POST add a correction log
app.post("/api/corrections", (req, res) => {
  try {
    const { originalTitle, correctedTitle, originalAuthor, correctedAuthor, publisher, isbn, shelfLocation, source } = req.body;

    if (!originalTitle || !correctedTitle) {
      return res.status(400).json({ error: "修正前のタイトルと修正後のタイトルが必要です" });
    }

    // Don't record if identical
    if (originalTitle.trim() === correctedTitle.trim() && (originalAuthor || '').trim() === (correctedAuthor || '').trim()) {
      return res.json({ success: true, skipped: true });
    }

    const current = getStoredCorrections();
    const newLog = {
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      originalTitle: originalTitle.trim(),
      correctedTitle: correctedTitle.trim(),
      originalAuthor: (originalAuthor || '').trim(),
      correctedAuthor: (correctedAuthor || '').trim(),
      publisher: (publisher || '').trim(),
      isbn: (isbn || '').trim(),
      shelfLocation: (shelfLocation || '').trim(),
      source: source || 'scan_edit',
      createdAt: new Date().toISOString()
    };

    // Keep max 200 logs, newer first
    const updated = [newLog, ...current].slice(0, 200);
    saveStoredCorrections(updated);

    res.json({ success: true, log: newLog, total: updated.length });
  } catch (err: any) {
    console.error("Failed to add correction log:", err);
    res.status(500).json({ error: "修正履歴の保存に失敗しました" });
  }
});

// DELETE a correction log
app.delete("/api/corrections/:id", (req, res) => {
  try {
    const { id } = req.params;
    const current = getStoredCorrections();
    const filtered = current.filter(c => c.id !== id);
    saveStoredCorrections(filtered);
    res.json({ success: true, total: filtered.length });
  } catch (err: any) {
    console.error("Failed to delete correction log:", err);
    res.status(500).json({ error: "修正履歴の削除に失敗しました" });
  }
});

// POST clear all correction logs
app.post("/api/corrections/clear", (_req, res) => {
  try {
    saveStoredCorrections([]);
    res.json({ success: true, total: 0 });
  } catch (err: any) {
    console.error("Failed to clear corrections:", err);
    res.status(500).json({ error: "修正履歴のクリアに失敗しました" });
  }
});

// Helper: Normalize & format ISBN nicely
function formatIsbn(raw: string): string {
  if (!raw) return "";
  const clean = raw.replace(/[^0-9X]/gi, "").toUpperCase();
  if (clean.length === 13) {
    // Standard Japanese 978-4 prefix formatting
    if (clean.startsWith("9784")) {
      const rest = clean.substring(4);
      // Heuristic 978-4-XXXX-XXXX-X
      if (rest.length === 9) {
        return `978-4-${rest.substring(0, 4)}-${rest.substring(4, 8)}-${rest.substring(8)}`;
      }
    }
    return `${clean.substring(0, 3)}-${clean.substring(3, 4)}-${clean.substring(4, 8)}-${clean.substring(8, 12)}-${clean.substring(12)}`;
  } else if (clean.length === 10) {
    if (clean.startsWith("4")) {
      const rest = clean.substring(1);
      return `4-${rest.substring(0, 4)}-${rest.substring(4, 8)}-${rest.substring(8)}`;
    }
    return `${clean.substring(0, 1)}-${clean.substring(1, 5)}-${clean.substring(5, 9)}-${clean.substring(9)}`;
  }
  return raw.trim();
}

// Reusable book lookup function from OpenBD and Google Books
async function lookupBookOnline(query: string, author: string = "", isbnRaw: string = ""): Promise<{
  results: any[];
  bestMatch: any | null;
}> {
  const cleanIsbn = (isbnRaw || "").replace(/[^0-9X]/gi, "");
  const results: any[] = [];
  const seenKeys = new Set<string>();

  // Clean out placeholder strings
  const cleanTitle = (query || "").replace(/OCR読み取り不可|判読不能/g, "").trim();
  const cleanAuthor = (author || "").replace(/著者不明|不明/g, "").trim();

  // 1. If ISBN is provided or detected, query OpenBD first
  if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const openBdRes = await fetch(`https://api.openbd.jp/v1/get?isbn=${cleanIsbn}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (openBdRes.ok) {
        const openBdData = await openBdRes.json();
        if (Array.isArray(openBdData) && openBdData[0] && openBdData[0].summary) {
          const sum = openBdData[0].summary;
          const fullTitle = [sum.title, sum.volume].filter(Boolean).join(" ");
          const key = `${fullTitle}::${sum.author}`.toLowerCase();
          seenKeys.add(key);

          let publishedYear = "";
          if (sum.pubdate) {
            publishedYear = String(sum.pubdate).substring(0, 4);
          }

          results.push({
            title: fullTitle,
            author: sum.author || "著者不明",
            publisher: sum.publisher || "",
            publishedYear,
            isbn: formatIsbn(sum.isbn || cleanIsbn),
            genre: "一般",
            description: openBdData[0].onix?.CollateralDetail?.TextContent?.[0]?.Text || "",
            coverThumbnail: sum.cover || "",
            source: "openbd"
          });
        }
      }
    } catch (openBdErr) {
      // Ignored
    }
  }

let googleBooksBlockedUntil = 0;

  // 2. Query Google Books API (if available and not quota blocked)
  if (Date.now() > googleBooksBlockedUntil) {
    try {
      let queriesToTry: string[] = [];

      if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
        queriesToTry.push(`isbn:${cleanIsbn}`);
      } else {
        if (cleanTitle && cleanAuthor) {
          queriesToTry.push(`intitle:${cleanTitle}+inauthor:${cleanAuthor}`);
          queriesToTry.push(`${cleanTitle} ${cleanAuthor}`);
        } else if (cleanTitle) {
          queriesToTry.push(`intitle:${cleanTitle}`);
          queriesToTry.push(cleanTitle);
        } else if (cleanAuthor) {
          queriesToTry.push(`inauthor:${cleanAuthor}`);
        }
      }

      for (const gQuery of queriesToTry) {
        if (results.length >= 6) break;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const gRes = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gQuery)}&maxResults=6&langRestrict=ja`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (gRes.status === 429) {
            // Google Books quota exhausted, suppress for 1 hour to prevent slowing lookups down
            googleBooksBlockedUntil = Date.now() + 60 * 60 * 1000;
            break;
          }

          if (gRes.ok) {
            const gData = await gRes.json();
            if (Array.isArray(gData.items)) {
              for (const item of gData.items) {
                const vi = item.volumeInfo || {};
                const title = vi.title || "";
                const authors = Array.isArray(vi.authors) ? vi.authors.join(", ") : (vi.authors || "");
                const key = `${title}::${authors}`.toLowerCase();

                if (!title || seenKeys.has(key)) continue;
                seenKeys.add(key);

                let foundIsbn = "";
                if (Array.isArray(vi.industryIdentifiers)) {
                  const isbn13 = vi.industryIdentifiers.find((id: any) => id.type === "ISBN_13");
                  const isbn10 = vi.industryIdentifiers.find((id: any) => id.type === "ISBN_10");
                  const rawIsbn = isbn13?.identifier || isbn10?.identifier || "";
                  if (rawIsbn) {
                    foundIsbn = formatIsbn(rawIsbn);
                  }
                }

                let pubYear = "";
                if (vi.publishedDate) {
                  pubYear = String(vi.publishedDate).substring(0, 4);
                }

                let thumb = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || "";
                if (thumb && thumb.startsWith("http://")) {
                  thumb = thumb.replace("http://", "https://");
                }

                results.push({
                  title,
                  author: authors || "著者不明",
                  publisher: vi.publisher || "",
                  publishedYear: pubYear,
                  isbn: foundIsbn,
                  genre: Array.isArray(vi.categories) && vi.categories[0] ? vi.categories[0] : "一般",
                  description: vi.description || "",
                  coverThumbnail: thumb,
                  source: "google_books"
                });

                if (results.length >= 6) break;
              }
            }
          }
        } catch {
          // Timeout or abort silently
        }

        if (results.length > 0) break;
      }
    } catch {
      // Continue
    }
  }

  // 3. Query National Diet Library (NDL 国立国会図書館サーチ OpenSearch)
  // Highly accurate for Japanese publications with full ISBN coverage
  if (results.length === 0 && (cleanTitle || cleanAuthor)) {
    try {
      const ndlUrl = `https://ndlsearch.ndl.go.jp/api/opensearch?title=${encodeURIComponent(cleanTitle)}${
        cleanAuthor ? `&creator=${encodeURIComponent(cleanAuthor)}` : ''
      }&cnt=6`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const ndlRes = await fetch(ndlUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (ndlRes.ok) {
          const xml = await ndlRes.text();
          const itemBlocks = xml.split("<item>");

          for (let i = 1; i < itemBlocks.length; i++) {
            const itemXml = itemBlocks[i].split("</item>")[0];
            const tMatch = itemXml.match(/<title>([^<]+)<\/title>/);
            const cMatch = itemXml.match(/<(?:dc:creator|author)>([^<]+)<\/(?:dc:creator|author)>/);
            const pMatch = itemXml.match(/<dc:publisher>([^<]+)<\/dc:publisher>/);
            const yMatch = itemXml.match(/<(?:dcterms:issued|pubDate)>([^<]+)<\/(?:dcterms:issued|pubDate)>/);
            
            // Match ISBN from dc:identifier
            const isbnMatch = itemXml.match(/<dc:identifier[^>]*ISBN[^>]*>([^<]+)<\/dc:identifier>/i) ||
                              itemXml.match(/<dc:identifier[^>]*>(978[-0-9X]{10,15})<\/dc:identifier>/i) ||
                              itemXml.match(/<dc:identifier[^>]*>([0-9Xx\-]{10,17})<\/dc:identifier>/);

            if (tMatch) {
              const rawTitle = tMatch[1].trim();
              // Discard search engine title like "... - 国立国会図書館サーチ"
              if (rawTitle.includes("国立国会図書館サーチ")) continue;

              const candAuthor = cMatch ? cMatch[1].replace(/,.*$/, "").trim() : "著者不明";
              const candPublisher = pMatch ? pMatch[1].trim() : "";
              
              let candYear = "";
              if (yMatch) {
                const yr = yMatch[1].match(/\b(19\d\d|20\d\d)\b/);
                if (yr) candYear = yr[1];
              }

              let candIsbn = "";
              if (isbnMatch) {
                candIsbn = formatIsbn(isbnMatch[1].trim());
              }

              const key = `${rawTitle}::${candAuthor}`.toLowerCase();
              if (seenKeys.has(key)) continue;
              seenKeys.add(key);

              // Thumbnail from OpenBD if clean ISBN is available
              const cleanCandIsbn = candIsbn.replace(/[^0-9X]/gi, "");
              let coverThumb = "";
              if (cleanCandIsbn.length === 13) {
                coverThumb = `https://cover.openbd.jp/${cleanCandIsbn}.jpg`;
              }

              results.push({
                title: rawTitle,
                author: candAuthor,
                publisher: candPublisher,
                publishedYear: candYear,
                isbn: candIsbn,
                genre: "一般",
                description: "",
                coverThumbnail: coverThumb,
                source: "ndl_search"
              });

              if (results.length >= 6) break;
            }
          }
        }
      } catch (ndlFetchErr: any) {
        // Suppress AbortError cleanly if NDL public API is slow/timing out
        clearTimeout(timeoutId);
        if (ndlFetchErr?.name !== "AbortError") {
          console.log("NDL notice:", ndlFetchErr?.message || "fetch bypassed");
        }
      }
    } catch {
      // Continue to AI fallback
    }
  }

  // 4. AI bibliographic fallback via Gemini when online databases fail or time out
  if (results.length === 0 && cleanTitle) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `書籍「${cleanTitle}」${cleanAuthor ? `（著者: ${cleanAuthor}）` : ""}の正確な日本のISBN（13桁ハイフン付き）、正式タイトル、著者、出版社、出版年、および代表的な版（単行本、文庫本等）をJSON形式で返してください。
キー形式:
{
  "matchedIsbn": "978-...",
  "title": "正式タイトル",
  "author": "著者名",
  "publisher": "出版社",
  "publishedYear": "西暦4桁",
  "candidates": [
    { "title": "...", "author": "...", "publisher": "...", "publishedYear": "...", "isbn": "978-..." }
  ]
}
余分なマークダウン等は含めず、純粋なJSONのみを返してください。`;

      const aiRes = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      if (aiRes.text) {
        const parsed = JSON.parse(aiRes.text);
        if (parsed) {
          const candidatesList: any[] = Array.isArray(parsed.candidates) ? parsed.candidates : [];
          if (parsed.matchedIsbn && !candidatesList.some((c: any) => c.isbn === parsed.matchedIsbn)) {
            candidatesList.unshift({
              title: parsed.title || cleanTitle,
              author: parsed.author || cleanAuthor,
              publisher: parsed.publisher || "",
              publishedYear: parsed.publishedYear || "",
              isbn: parsed.matchedIsbn
            });
          }

          for (const cand of candidatesList) {
            const candIsbn = formatIsbn(cand.isbn || "");
            const cleanCandIsbn = candIsbn.replace(/[^0-9X]/gi, "");
            let coverThumb = "";
            if (cleanCandIsbn.length === 13) {
              coverThumb = `https://cover.openbd.jp/${cleanCandIsbn}.jpg`;
            }

            results.push({
              title: cand.title || cleanTitle,
              author: cand.author || cleanAuthor || "著者不明",
              publisher: cand.publisher || "",
              publishedYear: cand.publishedYear || "",
              isbn: candIsbn,
              genre: "一般",
              description: "",
              coverThumbnail: coverThumb,
              source: "gemini_ai"
            });

            if (results.length >= 6) break;
          }
        }
      }
    } catch {
      // AI lookup fallback failed
    }
  }

  // Determine bestMatch
  let bestMatch: any = null;
  if (results.length > 0) {
    const firstWithIsbn = results.find(r => r.isbn && r.isbn.length >= 10);
    if (firstWithIsbn) {
      const qNorm = cleanTitle.toLowerCase().replace(/[\s\-_―:：]/g, "");
      const resNorm = firstWithIsbn.title.toLowerCase().replace(/[\s\-_―:：]/g, "");
      if (qNorm && (resNorm.includes(qNorm) || qNorm.includes(resNorm))) {
        bestMatch = firstWithIsbn;
      } else if (!cleanTitle) {
        bestMatch = firstWithIsbn;
      } else {
        bestMatch = firstWithIsbn;
      }
    } else {
      bestMatch = results[0];
    }
  }

  return { results, bestMatch };
}

// --- EXTERNAL BOOK API LOOKUP (Google Books & OpenBD) ---
app.get("/api/lookup-book", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    const author = String(req.query.author || "").trim();
    const isbnRaw = String(req.query.isbn || "").trim();

    if (!query && !author && !isbnRaw) {
      return res.status(400).json({ error: "検索キーワードまたはISBNを指定してください" });
    }

    const { results, bestMatch } = await lookupBookOnline(query, author, isbnRaw);
    res.json({ success: true, count: results.length, bestMatch, results });
  } catch (err: any) {
    console.error("Book lookup failed:", err);
    res.status(500).json({ error: "書籍情報の検索に失敗しました", details: err.message });
  }
});

// POST Batch ISBN Lookup for Multiple Books
app.post("/api/books/batch-isbn-lookup", async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ error: "照合対象の書籍配列が指定されていません" });
    }

    // Limit batch size to 30 per request to prevent timeouts
    const targetBooks = books.slice(0, 30);
    const resultsList: any[] = [];

    // Process in small parallel chunks (e.g. 3 at a time)
    const CHUNK_SIZE = 3;
    for (let i = 0; i < targetBooks.length; i += CHUNK_SIZE) {
      const chunk = targetBooks.slice(i, i + CHUNK_SIZE);
      const chunkPromises = chunk.map(async (b: any) => {
        const bookId = b.id || "";
        const title = b.title || "";
        const author = b.author || "";
        const currentIsbn = b.currentIsbn || b.isbn || "";

        try {
          const lookup = await lookupBookOnline(title, author, currentIsbn);
          const candidates = lookup.results || [];
          const best = lookup.bestMatch;

          if (best && best.isbn) {
            return {
              bookId,
              originalTitle: title,
              originalAuthor: author,
              currentIsbn,
              status: "exact_matched",
              matchedIsbn: best.isbn,
              matchedTitle: best.title,
              matchedAuthor: best.author,
              matchedPublisher: best.publisher,
              matchedPublishedYear: best.publishedYear,
              candidates,
              selectedCandidateIndex: candidates.findIndex((c: any) => c.isbn === best.isbn),
              selectedIsbn: best.isbn,
              selectedForUpdate: !currentIsbn || currentIsbn !== best.isbn
            };
          } else if (candidates.length > 0) {
            // Multiple or fuzzy candidates found, let user pick the right candidate
            const firstWithIsbn = candidates.find((c: any) => c.isbn && c.isbn.length >= 10);
            return {
              bookId,
              originalTitle: title,
              originalAuthor: author,
              currentIsbn,
              status: "candidates_found",
              matchedIsbn: firstWithIsbn?.isbn || "",
              matchedTitle: firstWithIsbn?.title || "",
              matchedAuthor: firstWithIsbn?.author || "",
              matchedPublisher: firstWithIsbn?.publisher || "",
              matchedPublishedYear: firstWithIsbn?.publishedYear || "",
              candidates,
              selectedCandidateIndex: firstWithIsbn ? candidates.indexOf(firstWithIsbn) : -1,
              selectedIsbn: firstWithIsbn?.isbn || "",
              selectedForUpdate: Boolean(firstWithIsbn?.isbn && (!currentIsbn || currentIsbn !== firstWithIsbn.isbn))
            };
          } else {
            return {
              bookId,
              originalTitle: title,
              originalAuthor: author,
              currentIsbn,
              status: "not_found",
              matchedIsbn: "",
              candidates: [],
              selectedCandidateIndex: -1,
              selectedIsbn: "",
              selectedForUpdate: false
            };
          }
        } catch (e: any) {
          return {
            bookId,
            originalTitle: title,
            originalAuthor: author,
            currentIsbn,
            status: "error",
            errorMessage: e.message || "検索失敗",
            candidates: [],
            selectedCandidateIndex: -1,
            selectedIsbn: "",
            selectedForUpdate: false
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      resultsList.push(...chunkResults);
    }

    res.json({
      success: true,
      total: resultsList.length,
      exactMatchedCount: resultsList.filter(r => r.status === "exact_matched").length,
      candidatesFoundCount: resultsList.filter(r => r.status === "candidates_found").length,
      notFoundCount: resultsList.filter(r => r.status === "not_found").length,
      results: resultsList
    });
  } catch (err: any) {
    console.error("Batch ISBN lookup error:", err);
    res.status(500).json({ error: err.message || "一括ISBN照合処理に失敗しました" });
  }
});

// POST Batch Update ISBNs
app.post("/api/books/batch-update-isbn", (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "更新データが指定されていません" });
    }

    const current = getStoredBooks();
    const now = new Date().toISOString();
    const updateMap = new Map<string, any>();
    updates.forEach((u: any) => {
      if (u.bookId || u.id) {
        updateMap.set(u.bookId || u.id, u);
      }
    });

    let updatedCount = 0;
    const auditChanges: any[] = [];

    const modified = current.map(book => {
      if (updateMap.has(book.id)) {
        const u = updateMap.get(book.id);
        const oldIsbn = book.isbn || "";
        const newIsbn = u.isbn ? formatIsbn(u.isbn) : book.isbn;

        const bookUpdates: any = {
          isbn: newIsbn,
          updatedAt: now
        };

        // Optionally apply publisher, publishedYear if provided and missing
        if (u.publisher && (!book.publisher || u.applyPublisher)) {
          bookUpdates.publisher = u.publisher;
        }
        if (u.publishedYear && (!book.publishedYear || u.applyPublishedYear)) {
          bookUpdates.publishedYear = u.publishedYear;
        }
        if (u.applyTitle && u.title) {
          bookUpdates.title = u.title;
        }
        if (u.applyAuthor && u.author) {
          bookUpdates.author = u.author;
        }

        updatedCount++;
        auditChanges.push({
          field: "isbn",
          fieldLabel: `${book.title} (ISBN)`,
          oldValue: oldIsbn || "未登録",
          newValue: newIsbn
        });

        return {
          ...book,
          ...bookUpdates
        };
      }
      return book;
    });

    saveStoredBooks(modified);

    recordDataAuditLog({
      actionType: "bulk_update",
      targetTitle: `${updatedCount}冊のISBN一括修正`,
      details: `ネット検索により ${updatedCount}冊の書籍にISBN（および書誌情報）を一括反映・修正しました`,
      changes: auditChanges.slice(0, 10),
      operator: "ISBN一括照合修正"
    });

    res.json({
      success: true,
      updatedCount,
      books: modified
    });
  } catch (err: any) {
    console.error("Batch update ISBN error:", err);
    res.status(500).json({ error: err.message || "ISBN一括更新に失敗しました" });
  }
});


// Helper function to call Gemini with retry on 503/429 and fallback to alternate models
async function callGeminiWithFallback(ai: GoogleGenAI, payload: any): Promise<any> {
  // Candidate models from @google/genai guidelines:
  // 1. Primary: gemini-3.1-flash-lite (ultra-fast, highly resilient against spikes, free tier friendly)
  // 2. Secondary: gemini-flash-latest
  // 3. Tertiary: gemini-3.8-flash
  const candidateModels = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash"
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    // Try up to 2 attempts for transient errors like 503 high demand or 429
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff + jitter (e.g. 1.2s, 2s)
          const waitTime = 1000 * Math.pow(1.5, attempt) + Math.random() * 400;
          console.log(`[Gemini] Retrying model ${model} after ${Math.round(waitTime)}ms (attempt ${attempt + 1})...`);
          await new Promise(r => setTimeout(r, waitTime));
        }

        console.log(`[Gemini] Executing bookshelf OCR scan with model: ${model} (attempt ${attempt + 1})`);
        const res = await ai.models.generateContent({
          ...payload,
          model,
        });
        return res;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "");
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("overloaded");

        console.log(`[Gemini] Model ${model} attempt ${attempt + 1} unavailable (transient: ${isTransient}), trying alternate model...`);

        // If not a transient overload error, or if we exhausted attempts for this model, try next
        if (!isTransient) {
          break;
        }
      }
    }
  }

  throw lastError;
}

// POST scan bookshelf using Gemini Multimodal Vision with High-Precision OCR & Individual Detection
// Utility to normalize vertical/newline-broken text from OCR into clean single-line horizontal text
function normalizeHorizontalText(text: any): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^[`"'\s]+|[`"'\s]+$/g, '');
  // When newline sits between Japanese characters, join directly without space
  cleaned = cleaned.replace(/([一-龠ぁ-んァ-ヶ々〆ヶ])\r?\n+([一-龠ぁ-んァ-ヶ々〆ヶ])/g, '$1$2');
  // Any remaining newlines become space
  cleaned = cleaned.replace(/[\r\n]+/g, ' ');
  // Remove artificial spaces between consecutive Japanese characters (from vertical spine OCR)
  cleaned = cleaned.replace(/([一-龠ぁ-んァ-ヶ々〆ヶ])\s+([一-龠ぁ-んァ-ヶ々〆ヶ])/g, '$1$2');
  cleaned = cleaned.replace(/([一-龠ぁ-んァ-ヶ々〆ヶ])\s+([一-龠ぁ-んァ-ヶ々〆ヶ])/g, '$1$2');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  return cleaned.trim();
}

app.post("/api/scan-bookshelf", async (req, res) => {
  try {
    const rawImage = req.body.imageBase64 || req.body.image || req.body.dataUrl || req.body.imageDataUrl;

    if (!rawImage || typeof rawImage !== "string" || rawImage.trim().length === 0) {
      return res.status(400).json({ error: "本棚の画像データ(Base64)が送信されていません" });
    }

    let mimeType = req.body.mimeType;
    if (!mimeType && rawImage.startsWith("data:")) {
      const match = rawImage.match(/^data:([^;]+);base64,/);
      if (match && match[1]) {
        mimeType = match[1];
      }
    }
    mimeType = mimeType || "image/jpeg";

    // Strip data url prefix if present
    const cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, "");

    // Gracefully handle SVG data (e.g. from built-in sample bookshelves) which Gemini vision cannot parse natively
    if (mimeType === "image/svg+xml" || rawImage.includes("data:image/svg+xml")) {
      try {
        const svgContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
        // Extract books from SVG text elements
        const titleMatches = Array.from(svgContent.matchAll(/<text[^>]*rotate\(90,\s*[^)]+\)[^>]*>([^<]+)<\/text>/g)).map(m => m[1].trim());
        const authorMatches = Array.from(svgContent.matchAll(/font-size="8\.5"[^>]*>([^<]+)<\/text>/g)).map(m => m[1].trim());
        const publisherMatches = Array.from(svgContent.matchAll(/font-size="7"[^>]*>([^<]+)<\/text>/g)).map(m => m[1].trim());

        if (titleMatches.length > 0) {
          const detectedBooks = titleMatches.map((title, idx) => {
            const author = authorMatches[idx] || "著者不明";
            const publisher = publisherMatches[idx] || "";
            const total = titleMatches.length;
            const widthPer = Math.min(100, Math.floor(800 / total));
            const startX = 60 + idx * widthPer;
            return {
              tempId: `svg-det-${Date.now()}-${idx}`,
              title: normalizeHorizontalText(title),
              author: normalizeHorizontalText(author),
              publisher: normalizeHorizontalText(publisher),
              publishedYear: "2023",
              isbn: "",
              genre: "一般",
              description: `${title} (${author})`,
              spineColor: "#5D6D5F",
              confidence: "高",
              selected: true,
              isOcrFailed: false,
              box2d: [180, startX, 820, startX + widthPer - 10]
            };
          });
          return res.json({ success: true, count: detectedBooks.length, detectedBooks });
        }
      } catch (svgErr) {
        console.warn("SVG fallback parsing notice:", svgErr);
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY が設定されていません。AI StudioのSecretsまたは環境変数を確認してください。"
      });
    }

    // Load user correction history for in-context OCR learning
    const savedCorrections = getStoredCorrections();
    let correctionLearningPrompt = "";
    if (savedCorrections.length > 0) {
      const recentLearned = savedCorrections.slice(0, 15);
      correctionLearningPrompt = `\n\n【ユーザーによる過去のOCR誤読修正・学習ナレッジ（最重要）】
本ユーザーは過去のスキャンにおいて、以下のOCR誤読を手動で修正しました。同一の書籍や同一著者・類似装丁の本棚である可能性が高いため、以下の修正傾向と正解データを必ず最優先で考慮・学習し、類似する背表紙の文字認識・タイトル抽出に反映してください：
` + recentLearned.map((c, i) => `${i + 1}. [OCR検出例]: 「${c.originalTitle}」(著者: ${c.originalAuthor || '不明'}) ➡ [正しい表記]: 『${c.correctedTitle}』(正式著者: ${c.correctedAuthor || '未指定'}, 出版社: ${c.publisher || '未指定'}${c.isbn ? `, ISBN: ${c.isbn}` : ''})`).join("\n");
    }

    const promptText = `あなたはプロの図書館司書、蔵書点検監査員、およびAI画像認識・OCRエキスパートです。
提供された本棚（または並んだ本）の写真から、確認できるすべての書籍を左から右の順番に1冊ずつ漏れなく高精度にOCR解析し、個別の書籍情報として抽出してください。
蔵書点検（棚卸し）のため、棚に並んでいる冊数を正確に把握することが最も重要です。${correctionLearningPrompt}

【抽出・OCRの重要ルール】
1. 個別認識（Multiple Books Detection）: 本棚に並んでいる本を1冊ずつ分離し、重複や結合を避けてそれぞれ個別のアイテムとして抽出してください。
2. タイトル（title）: 背表紙や表紙に印字された書名を正確にOCR読み取り。サブタイトルや巻数（上・下巻、第1巻、1, 2など）も含めてください。
   【重要・横書きでの出力厳守】: 日本の書籍の背表紙が「縦書き」であっても、出力するtitleは改行コード（\\n）や1文字ごとのスペースで縦書き化せず、必ず1行の通常の「横書き文字列」（例:「吾輩は猫である」「走れメロス」のように繋がった1行の文字列）として出力してください。
3. 著者名（author）: 著者・編者・訳者名を正確に抽出。背表紙が縦書きの場合でも改行コードを含めず必ず1行の横書き文字列としてください。読み取れない場合は「著者不明」。
4. 出版社（publisher）: 出版社名やレーベル（オライリー、岩波文庫、講談社、集英社、早川書房、SBクリエイティブ、日経BPなど）が読み取れれば記載。不明なら空文字。
5. ISBNコード（isbn）:
   - 背表紙の上部・下部、バーコード付近、表紙・裏表紙、スリップなどに印字されたISBNコード（「ISBN 978-4-...」や「9784...」などの10桁または13桁のコード）を最優先でOCR読み取りしてください。
   - 画像内にISBNの印字が直接見当たらない場合でも、書名と著者・出版社から該当する既知のISBN（13桁 978-...）が確実に特定可能であればそれを補完・出力してください。特定できない場合は空文字としてください。
6. 出版年（publishedYear）: 書籍の出版年（西暦4桁、例: "2021"）。不明な場合は推定または空文字。
7. ジャンル（genre）: 書籍の内容や背表紙から推測されるジャンル（技術書, ビジネス, 文学・小説, SF・ミステリー, 人文・思想, コミック, 実用書 など）。
8. 概要（description）: その本の特徴やテーマの簡潔な要約（日本語で1〜2文）。
9. 背表紙の主色（spineColor）: 本棚上の識別用にHEXコード（例: #3b82f6, #f59e0b, #10b981, #6366f1, #ef4444, #334155 等）で表現してください。
10. 確信度（confidence）: 読み取りの鮮明さやOCR精度に応じて「高」「中」「低」で指定してください。
11. バウンディングボックス（box_2d）:
    - 画像内における各書籍の背表紙／表紙の領域を示す正規化バウンディングボックス [ymin, xmin, ymax, xmax]（0〜1000の整数）。
    - ユーザーが画像上で各書籍の位置を個別に確認・抽出・ハイライトするために使用します。必ずすべての本に正確な領域を指定してください。
12. 【蔵書点検・読み取り不可書籍の重要ルール】:
    - 背表紙は見えているが、日焼け・スレ・光の反射・ピンボケ・背表紙が極細などの理由で「タイトルの文字が判読不能・読み取れない本」は決して除外・無視せず、必ず1冊として抽出してください。
    - その場合、titleを「OCR読み取り不可」、authorを「不明」、isOcrFailedを true と設定してください。これにより蔵書点検の総冊数・棚卸し数を正確にカウントします。

できるだけ多くの本（視認可能なものすべて）を1冊ずつ漏れなく、高精度に抽出してください。`;

    const requestPayload = {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction: "本棚・書籍の画像認識を行い、蔵書点検用メタデータ（タイトル、著者、出版社、ISBN、出版年、ジャンル、概要、色、バウンディングボックス、isOcrFailed）をJSON配列で抽出するアシスタントです。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "書籍のタイトル（読み取り不能な場合は『OCR読み取り不可』）" },
              author: { type: Type.STRING, description: "著者名（不明な場合は著者不明）" },
              publisher: { type: Type.STRING, description: "出版社・レーベル名" },
              isbn: { type: Type.STRING, description: "ISBNコード（13桁または10桁、例: 978-4-XXXX-XXXX-X。不明な場合は空文字）" },
              publishedYear: { type: Type.STRING, description: "出版年（西暦4桁、例: 2021。不明な場合は空文字）" },
              genre: { type: Type.STRING, description: "書籍ジャンル" },
              description: { type: Type.STRING, description: "書籍の概要や特徴" },
              spineColor: { type: Type.STRING, description: "背表紙のHEXカラーコード" },
              confidence: { type: Type.STRING, description: "高, 中, または 低" },
              isOcrFailed: { type: Type.BOOLEAN, description: "文字不鮮明・退色・ピンボケ等でタイトル判読不能な場合は true" },
              box_2d: {
                type: Type.ARRAY,
                description: "画像内での書籍のバウンディングボックス [ymin, xmin, ymax, xmax] (0〜1000の整数)",
                items: { type: Type.INTEGER }
              }
            },
            required: ["title", "author", "genre", "confidence"],
          },
        },
      },
    };

    // Call with retry and fallback across candidate models
    const response = await callGeminiWithFallback(ai, requestPayload);

    const textOutput = response.text || "[]";
    let detectedList: any[] = [];
    try {
      detectedList = JSON.parse(textOutput);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON:", textOutput);
      return res.status(500).json({ error: "Geminiの応答をJSON解析できませんでした", raw: textOutput });
    }

    // Format with temp IDs and structured metadata for frontend selection
    const formattedDetections = detectedList.map((item, idx) => {
      // Validate box_2d
      let box2d: [number, number, number, number] | undefined = undefined;
      if (Array.isArray(item.box_2d) && item.box_2d.length === 4) {
        const [ymin, xmin, ymax, xmax] = item.box_2d;
        if (
          typeof ymin === 'number' && typeof xmin === 'number' &&
          typeof ymax === 'number' && typeof xmax === 'number'
        ) {
          box2d = [
            Math.max(0, Math.min(1000, ymin)),
            Math.max(0, Math.min(1000, xmin)),
            Math.max(0, Math.min(1000, ymax)),
            Math.max(0, Math.min(1000, xmax))
          ];
        }
      }

      const isFailed = item.isOcrFailed === true ||
        (item.title && (item.title.includes("OCR読み取り不可") || item.title.includes("読み取り不可") || item.title.includes("判読不能")));

      const cleanTitle = isFailed ? "OCR読み取り不可" : normalizeHorizontalText(item.title || "タイトル不明");
      const cleanAuthor = normalizeHorizontalText(item.author || "著者不明");
      const cleanPublisher = normalizeHorizontalText(item.publisher || "");

      return {
        tempId: `detected-${Date.now()}-${idx}`,
        title: cleanTitle,
        author: cleanAuthor,
        publisher: cleanPublisher,
        isbn: item.isbn ? String(item.isbn).trim() : "",
        publishedYear: item.publishedYear ? String(item.publishedYear).trim() : "",
        genre: item.genre || "一般",
        description: item.description || (isFailed ? "背表紙の文字がかすれ・不鮮明のためOCR読み取りができませんでした。" : ""),
        spineColor: item.spineColor || (isFailed ? "#78716c" : "#4f46e5"),
        confidence: (["高", "中", "低"].includes(item.confidence) ? item.confidence : "中") as "高" | "中" | "低",
        box2d,
        selected: true,
        isOcrFailed: isFailed
      };
    });

    res.json({
      success: true,
      count: formattedDetections.length,
      detectedBooks: formattedDetections
    });

  } catch (err: any) {
    console.error("Gemini Vision scan failed:", err);
    const rawMsg = String(err?.message || err || "");

    let status = 500;
    let userFriendlyMessage = "本棚画像の解析処理中にエラーが発生しました。";

    // Detect 503 Service Unavailable / High Demand
    if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand") || rawMsg.includes("overloaded")) {
      status = 503;
      userFriendlyMessage = "AIモデルへのアクセスが一時的に混雑しています (503)。リトライを行いましたが解決しませんでした。数秒後に再度お試しください。";
    } else if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
      status = 429;
      userFriendlyMessage = "AIリクエストの利用制限に達しました (429)。少し時間をおいてから再度お試しください。";
    } else {
      // Try to parse JSON error message if Google GenAI returned stringified JSON
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.error?.message) {
          userFriendlyMessage = `AI解析エラー: ${parsed.error.message}`;
          if (parsed?.error?.code) status = parsed.error.code;
        }
      } catch {
        if (rawMsg.length > 0 && rawMsg.length < 200) {
          userFriendlyMessage = rawMsg;
        }
      }
    }

    res.status(status).json({
      error: userFriendlyMessage,
      rawError: rawMsg,
      isTransient: status === 503 || status === 429
    });
  }
});

// POST /api/ocr-split-books
// Takes two cropped spine image base64 strings and performs high-precision OCR on both
app.post("/api/ocr-split-books", async (req, res) => {
  try {
    const {
      book1ImageBase64,
      book2ImageBase64,
      originalTitle = "",
      originalAuthor = "",
      originalPublisher = ""
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY が設定されていません。AI StudioのSecretsまたは環境変数を確認してください。"
      });
    }

    const clean1 = book1ImageBase64 ? book1ImageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "") : null;
    const clean2 = book2ImageBase64 ? book2ImageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "") : null;

    if (!clean1 && !clean2) {
      return res.status(400).json({ error: "分割画像のデータがありません" });
    }

    const parts: any[] = [];
    if (clean1) {
      parts.push({ text: "【1冊目（左側の本）の背表紙切り出し画像】:" });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: clean1,
        }
      });
    }
    if (clean2) {
      parts.push({ text: "【2冊目（右側の本）の背表紙切り出し画像】:" });
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: clean2,
        }
      });
    }

    const promptText = `本棚スキャンにおいて、本来2冊ある書籍が1冊として誤結合されて検出されたため、ユーザーが画像を2つに分割しました。
提供された2つの画像（左側の本、右側の本）の背表紙から、それぞれの書籍情報を高精度にOCR解析してください。

【元の参考情報（1冊として検出されていた際の情報）】
・元タイトル: ${originalTitle}
・元著者: ${originalAuthor}
・元出版社: ${originalPublisher}
※もし元のタイトルが「〇〇 上・下」や「〇〇 1・2」のような2分冊であったり、シリーズ本、あるいは全く別の隣り合う本である場合があります。各画像の文字を独立して正確に読んでください。

各本について以下を抽出してください：
1. title: 背表紙のタイトル（判読できない場合は「OCR読み取り不可」）
   ※【重要・横書き厳守】: 背表紙が「縦書き」の場合でも、titleおよびauthorは絶対に改行コード（\n）や文字ごとのスペースを入れず、必ず通常の「横書きの1行の文字列」（例:「吾輩は猫である」「人間失格」）として出力してください。
2. author: 著者名（不明なら「著者不明」）
3. publisher: 出版社（不明なら空文字）
4. isbn: 読み取れるISBNコード（13桁または10桁、不明なら空文字）
5. publishedYear: 出版年
6. genre: ジャンル
7. spineColor: HEXカラーコード
8. isOcrFailed: 文字が読めない場合 true

必ず [ { ...book1 }, { ...book2 } ] の2つの要素を含むJSON配列で出力してください。`;

    parts.push({ text: promptText });

    const requestPayload = {
      contents: { parts },
      config: {
        systemInstruction: "分割された2冊の書籍背表紙画像を個別にOCR解析し、それぞれの書誌情報をJSON配列で抽出するアシスタントです。日本の縦書き背表紙の文字も必ず横書きの1行文字列として出力してください。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              publisher: { type: Type.STRING },
              isbn: { type: Type.STRING },
              publishedYear: { type: Type.STRING },
              genre: { type: Type.STRING },
              spineColor: { type: Type.STRING },
              isOcrFailed: { type: Type.BOOLEAN }
            },
            required: ["title", "author"]
          }
        }
      }
    };

    const response = await callGeminiWithFallback(ai, requestPayload);
    const textOutput = response.text || "[]";
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = [];
    }

    // Sanitize and ensure horizontal text
    const cleanedBooks = Array.isArray(parsed) ? parsed.map(b => ({
      ...b,
      title: normalizeHorizontalText(b.title || ""),
      author: normalizeHorizontalText(b.author || "著者不明"),
      publisher: normalizeHorizontalText(b.publisher || "")
    })) : [];

    res.json({
      success: true,
      books: cleanedBooks
    });
  } catch (err: any) {
    console.error("Split OCR failed:", err);
    res.status(500).json({ error: err.message || "2冊の分割OCR処理に失敗しました" });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bookshelf AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
