# CLAUDE.md — chat-yah-mobi 開発ガイド（AI/開発者向け）

yah.mobi の **AI チャットサポート**（埋め込みウィジェット＋管理画面）。
構成: React 19 + Vite 7（SPA）／ Firebase（Firestore named DB「chat」・Cloud Functions v2 codebase「chat」・Auth・静的 Hosting）。
GitHub: `kazuyoshi228/chat-yah-mobi-v0.2`。

🚨 **Firebase プロジェクト `yah-mobile-v1-3ed24` は販売サイト yah.mobi と共有**。以下のガードレールが最優先。

---

## 🚨 ガードレール（販売サイトを壊さない・最重要）

1. **触ってよいのは chat 側だけ**: `functions/`（codebase `chat`）・named DB「chat」・client コード。
2. **`(default)` DB は read のみ**（Functions が顧客データを uid で参照）。**write / delete / ルール変更・デプロイは絶対にしない**。
3. **yah.mobi の関数（codebase `default`）・ルール・データには一切触れない**。chat→販売への呼び出しもゼロ（境界なし）。
4. **素の `firebase deploy` は禁止**（yah.mobi の関数を巻き込む）。必ずスコープ付き:
   - Hosting: `pnpm deploy:hosting`（= `firebase deploy --only hosting:chat-yah-mobi-v2`）
   - Functions: `pnpm deploy:functions`（= `--only functions:chat`）
   - Rules/Indexes: `pnpm deploy:rules`（= `--only firestore:chat`）
5. **本番反映（デプロイ・DB作成・データ移行・コンソール操作）はユーザーが実行**。AI はコード＋手順書まで。
6. **`firestore.chat.rules` / `functions/src/*` はユーザーの許可なく変更しない**（変更は提案→承認→実施）。
7. シークレットは扱わない・貼らない・コミットしない。chat は Stripe/OMAX 鍵・Gmail 送信権限を**持たない**。

## ブランチ運用

- 開発は **`dev`** にコミット。`main` へ直接コミットしない。リリース時のみ `dev`→`main`。
- コミットは日本語＋種別 prefix（`feat`/`fix`/`chore` 等）、末尾に `Co-Authored-By: Claude ...`。

---

## アーキテクチャ（BaaS-first・ミニマル）

- **訪問者** `/widget-chat`: 匿名 Auth（一般=RAG のみ）→ chat DB 書込 → `onVisitorMessageCreated`（Gemini 2.5 Flash + Firestore Vector RAG）→ chat DB → `onSnapshot` 表示。
- **個別対応**（購入/eSIM）: ログイン時のみ。トリガーが **`(default)` の `orders`/`esim_links`/`users` を `userId==uid` で read-only 参照**（同期・コピーなし）。
- **管理** `/admin/*`: Google ログイン（`@yah.mobi`/`@bonfire.co.jp` ドメイン制限）→ chat DB 読取。中核6画面のみ（KPI/チャット一覧/RAG/クイック返信/フィードバック/フローツリー）。
- **Functions（codebase `chat`・4関数）**: `onVisitorMessageCreated` / `onSessionEnded` / `onRagDocumentWritten` / `dataRetentionPurge`（すべて chat DB にバインド）。
- **AI（Vertex AI・ADC＝サービスアカウント認証・外部APIキー無し）**: Gemini 2.5 Flash ＋ text-embedding-004（768次元）。`functions/src/utils/ai.ts` は `@google/genai` の vertexai モード。**前提: プロジェクトで Vertex AI API 有効化＋Functions 実行 SA に `roles/aiplatform.user`**。
- **入口保護**: App Check（reCAPTCHA Enterprise・サイトキー未設定なら無効）＋訪問者ごと日次レート制限（`chat_rate_limits`・100/日）。
- **履行系（返金・QR・決済）は販売側**。QR はウィジェットから `https://yah.mobi/mypage` へ案内するのみ。
- Express/tRPC/Socket.io/SQL/S3/Turnstile/Upstash は**撤去済み**（復活させない）。

## Firestore（named DB「chat」）

- コレクション: `chat_sessions`（＋サブ `chat_messages`）／`chat_surveys`／`chat_flow_nodes`／`chat_quick_replies`／`chat_rag_documents`（Vector768）／`chat_hospitality_guidelines`／`chat_agent_logs`／`chat_rate_limits`（Fn 専用）。
- ルール: `firestore.chat.rules`（create は `hasOnly`＋型/値検証。未定義コレクションは default deny）。
- client の接続は `getFirestore(app, "chat")` 固定（`client/src/lib/firebase.ts`）。

## ビルド / 開発

- **Node 22**（`~/node22/bin`）・**pnpm**（corepack 署名エラー時は `~/node-lts/bin/pnpm --config.package-manager-strict=false`）。
- `functions/` は **npm 管理の別プロジェクト**（依存は `functions/` 内で `npm install`、ビルド `npm run build`）。
- dev: `pnpm dev`（vite）／ build: `pnpm build`（出力 `dist/public`）。
- 型チェック: `pnpm check`（tsc --noEmit）／ テスト: `pnpm test`（vitest）。
- コミット前に `pnpm check`＋`pnpm build`＋`npm --prefix functions run build` を通す。

## 環境変数（`.env`・gitignore）

`VITE_FIREBASE_*`（公開値）／`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`（公開・未設定なら App Check 無効）／`VITE_FRONTEND_FORGE_API_URL`・`VITE_FRONTEND_FORGE_API_KEY`（Maps）。

## 要確認（TODO）

- `(default)`/`orders`・`esim_links` の表示用フィールド実キー（planName/status/期限/データ量）→ `onVisitorMessageCreated.ts` の `buildCustomerContext` を実データで調整。
- named DB「chat」への移行手順は `docs/ops_console_migration.md`（ユーザーがコンソール/CLI で実施）。
