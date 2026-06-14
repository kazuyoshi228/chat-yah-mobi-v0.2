# yah.mobile Live Chat Support - TODO

## Phase 1: DB Schema & Migration
- [x] Update drizzle/schema.ts: add operator to users role enum
- [x] Add chat_sessions table (id, visitorId, visitorName, visitorEmail, status, operatorId, language, summary, createdAt, updatedAt)
- [x] Add messages table (id, sessionId, role, content, fileUrl, createdAt)
- [x] Add quick_replies table (id, title, content, createdAt)
- [x] Add rag_documents table (id, title, content, embedding JSON, createdAt)
- [x] Add surveys table (id, sessionId, rating, comment, createdAt)
- [x] Generate migration SQL via drizzle-kit
- [x] Apply migration via webdev_execute_sql

## Phase 2: Backend
- [x] Add chat DB helpers in server/db.ts
- [x] Install socket.io dependency
- [x] Add WebSocket (socket.io) to server/_core/index.ts
- [x] Create server/routers/chat.ts (session create, messages, status update)
- [x] Create server/routers/operator.ts (chat list, assign, quick replies)
- [x] Create server/routers/admin.ts (KPI, operator mgmt, RAG mgmt)
- [x] Create server/routers/ai.ts (AI auto-reply, RAG search, summary, escalation)
- [x] Integrate all routers in server/routers.ts
- [x] Add operator role middleware (operatorProcedure)
- [x] AI: GPT-4o-mini multilingual auto-reply (ja/en/zh/es/ko)
- [x] AI: RAG document search (cosine similarity)
- [x] AI: Conversation summary generation
- [x] AI: Escalation detection (negative keywords + explicit request)
- [x] File upload endpoint (S3 via storagePut)

## Phase 3: Frontend
- [x] Update index.css with brand styles (black/white, EB Garamond font)
- [x] Update client/index.html with Google Fonts
- [x] Create client/src/pages/ChatStart.tsx (visitor chat start form)
- [x] Create client/src/pages/ChatRoom.tsx (real-time chat UI with WebSocket)
- [x] Create client/src/pages/operator/OperatorChats.tsx (chat list with filters)
- [x] Create client/src/pages/operator/OperatorChatDetail.tsx (chat detail + quick replies + summary)
- [x] Create client/src/pages/admin/AdminDashboard.tsx (KPI overview)
- [x] Create client/src/pages/admin/AdminOperators.tsx (operator management)
- [x] Create client/src/pages/admin/AdminQuickReplies.tsx (quick reply management)
- [x] Create client/src/pages/admin/AdminRag.tsx (RAG document management)
- [x] Update client/src/App.tsx with all routes
- [x] Typing indicator implementation
- [x] Session restore from localStorage (visitorId)
- [x] Escalation UI (suggest operator button)

## Phase 4: Widget & Additional Features
- [x] Create ChatWidget component (floating button widget embedded in Home)
- [x] File attachment in chat (image/file upload to S3)
- [x] Post-chat satisfaction survey UI
- [x] Browser notifications for operators (new chat alert)
- [x] Owner notification via notifyOwner() on new chat

## Phase 5: Tests & Deployment
- [x] Write vitest tests for chat router (detectEscalation, session logic, language support)
- [x] Write vitest tests for auth (existing auth.logout.test.ts)
- [x] Verify all routes work in browser (TypeScript: no errors, tests: 9/9 passing, dev server: running)
- [x] Create checkpoint

## Phase 6: 外部サイト埋め込みウィジェット
- [x] server/routers/widget.ts: CORS対応のウィジェット設定エンドポイント作成（不要：iframeで対応）
- [x] client/public/widget.js: 外部サイト埋め込み用スクリプト（iframe方式）
- [x] client/src/pages/WidgetChat.tsx: iframe内で表示する独立チャットページ
- [x] server/_core/index.tsにwidgetルーターを追加（不要：iframeで対応）
- [x] server/routers.tsにwidgetルーターを統合（不要：iframeで対応）
- [x] 埋め込みコードのドキュメントをホームページに追加

## Phase 7: リスク評価レポート対応実装
- [x] rag_documentsテーブルにexpires_atカラムを追加（DBマイグレーション）
- [x] chat_sessionsテーブルにscheduled_delete_atカラムを追加（DBマイグレーション）
- [x] surveysテーブルにresolved（boolean）・free_comment（text）カラムを追加
- [x] RAGクエリで期限切れドキュメントを除外するロジックを実装
- [x] データ保持スケジュールジョブ実装（2年後アーカイブ・3年後物理削除）
- [x] 管理画面のRAGドキュメント一覧にexpires_at表示・編集機能を追加
- [x] アンケートに「解決しましたか？（はい/いいえ）」を追加
- [x] ∅3以下の場合のみ自由記述欄を表示
- [x] アンケートデータをDBに保存するスキーマ・ルーター更新

## Phase 8: 解決率KPI追加
- [x] getKpiStatsに resolvedRate / aiResolvedRate / operatorResolvedRate / resolvedCount / unresolvedCount を追加
- [x] AdminDashboard.tsxに解決率KPIカード（総合・AI・オペレーター）を追加
- [x] 進捗バー（RateBar）コンポーネントで視覚的に解決率を表示
- [x] 未解決チャット数カードを追加
