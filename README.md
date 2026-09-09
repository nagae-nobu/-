# 本棚書籍管理アプリ (Bookshelf AI Scanner & Library Audit)

本棚の写真（スマートフォンのカメラまたはアップロード画像）から、Gemini AIが背表紙を自動検出し、タイトル・著者・出版社・ISBNを瞬時にデータ化して管理・点検できるWebアプリケーションです。

---

## 🚀 主な機能

1. **AI本棚マルチ背表紙スキャン**:
   - スマホカメラ・画像アップロードから複数の背表紙枠と書誌情報を一括解析。
   - スマホ撮影写真でもタイトルや著者名が横書きで自然に表示。
2. **背表紙の手動補正・2冊分割機能**:
   - 画像の枠を調整して1つの検出枠を左右に分割し、2冊として再OCR。
   - 不鮮明な背表紙を「OCR読み取り不可（要現物確認）」としてワンタップ記録。
3. **外部API照合・ISBN補完**:
   - Google Books API / OpenBD と照合し、書名・著者・ISBN・刊行年を自動補完。
4. **本棚ビジュアル＆蔵書点検（棚卸し）**:
   - リアルな木製本棚ビジュアルビュー（背表紙横書き/縦書き切替可能）。
   - 棚ごとの総冊数、正常読取数、OCR不可冊数を集計し、CSVエクスポート。
5. **読書ステータス・メモ管理**:
   - 未読 / 読書中 / 読了 / 積読の管理、評価（★1〜5）と感想メモの記録。

---

## 👥 他のユーザーにテストしてもらう方法

### 方法1: AI Studioの共有URLをそのまま共有する（一番かんたん）
Google AI Studio上ですでにクラウド環境（Cloud Run）にデプロイされているため、**共有用URL**をテスターに送るだけで、PCやスマートフォンのブラウザからインストール不要ですぐにテストできます。
- **共有URL**: Google AI Studio画面右上の「Share（共有）」ボタンから取得可能です。
- スマホのブラウザから開けば、そのままカメラを起動して本棚の撮影テストが可能です。

---

### 方法2: GitHubにコードを公開して共有する

#### ステップ1: AI StudioからGitHubへエクスポート
1. Google AI Studio画面の右上にある **メニュー（または歯車⚙️ / エクスポートアイコン）** をクリックします。
2. **「Export to GitHub」**（または「Download ZIP」）を選択します。
3. リポジトリ名を入力してエクスポートを実行すると、ご自身のGitHubアカウントに自動的にリポジトリが作成・プッシュされます。

#### ステップ2: テスター（他の開発者・協力者）のローカル起動手順
テスターがご自身のPCで動かす際の手順です：

```bash
# 1. リポジトリをクローン
git clone https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
cd <リポジトリ名>

# 2. 依存パッケージをインストール
npm install

# 3. 環境変数ファイル (.env) を作成
cp .env.example .env
```

`.env` ファイルを開き、Gemini APIキーを設定します（[Google AI Studio](https://aistudio.google.com/)から無料で取得可能）：
```env
GEMINI_API_KEY="AIzaSy..."
```

起動コマンドを実行します：
```bash
# 開発サーバー起動 (ポート 3000)
npm run dev
```
ブラウザで `http://localhost:3000` にアクセスするとアプリが起動します。

---

### 方法3: クラウドサービスにデプロイしてWebアプリとして常時公開する
GitHubと連携して、誰でもアクセスできる公開Webアプリにする場合：

- **Google Cloud Run**（AI Studio画面の「Deploy」からワンクリックでデプロイ可能）
- **Render / Railway / Fly.io**:
  - GitHubリポジトリを連携
  - Build Command: `npm run build`
  - Start Command: `npm start`
  - 環境変数に `GEMINI_API_KEY` を設定

---

## 🛠 技術スタック
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend**: Express (Node.js) によるセキュアなGemini APIプロキシ
- **AI / OCR**: Google Gen AI SDK (`@google/genai`, Gemini 2.5 Flash)
- **External Books APIs**: Google Books API, OpenBD (版元ドットコム)
