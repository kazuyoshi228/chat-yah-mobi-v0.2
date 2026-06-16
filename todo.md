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

## Phase 9: 言語切り替えボタン + KPI期間フィルター
- [x] shared/i18n.ts: 日本語・英語・中国語・スペイン語・韓国語の翻訳辞書を作成
- [x] client/src/contexts/LanguageContext.tsx: 言語コンテキストを作成
- [x] client/src/main.tsx: LanguageProviderをラップ
- [x] Home.tsx: ヘッダーに言語切り替えドロップダウンを追加
- [x] ChatStart.tsx: 言語コンテキストに対応
- [x] ChatRoom.tsx: 言語コンテキストに対応
- [x] ChatWidget.tsx: 言語コンテキストに対応
- [x] WidgetChat.tsx: 言語コンテキストに対応
- [x] AdminDashboard.tsx: KPIに期間フィルター（今日・今週・今月）を追加
- [x] server/routers/admin.ts: getKpiにperiodパラメーターを追加
- [x] server/db.ts: getKpiStatsに期間フィルターロジックを追加

## Phase 10: フォント差し替え・ナビゲーションバーデザイン統一
- [x] National2フォントをindex.cssに@font-faceで定義
- [x] bodyにNational2を適用
- [x] Home.tsxのナビゲーションバーをyah.mobiデザイン（透明背景・大文字・letter-spacing）に変更
- [x] EB Garamondの参照を全て削除しNational2に統一

## Phase 11: Operatorページのカード表示・追加機能
- [x] server/db.tsにcreateOperatorUser（名・姓・メールでユーザー作成）ヘルパーを追加
- [x] server/routers/admin.tsにcreateOperatorミューテーションを追加
- [x] AdminOperators.tsxをカード表示に変更（名・姓・メール・ID・openId・role・作成日など）
- [x] 「Add Operator」ダイアログを追加（名・姓・メールアドレス入力）
- [x] TypeScriptエラー確認・チェックポイント保存

## Phase 12: Resendメール通知
- [x] resendパッケージをインストール（v6.12.4）
- [x] ENV にRESEND_API_KEY・RESEND_FROM_EMAILを追加
- [x] server/email.ts: sendEscalationEmail・sendNewChatEmailヘルパーを作成
- [x] chat.ts requestEscalation: エスカレーション時に全オペレーターへメール送信
- [x] chat.ts startSession: AI がエスカレーション判定した場合も全オペレーターへメール送信
- [x] server/email.test.ts: Resendモックテスト3件追加（12/12通過）
- [x] TypeScriptエラー確認・チェックポイント保存

## Phase 13: Portalページ（スタッフホーム画面）
- [x] client/src/pages/Portal.tsx: /portal ルートにスタッフホーム画面を作成
- [x] Admin・Operatorそれぞれのログインボタンを配置
- [x] ログイン済みの場合はrole別に自動リダイレクト（admin→/admin、operator→/operator/chats）
- [x] App.tsxに/portalルートを追加

## Phase 14: FeedbackページとData Analysisページ
- [x] server/db.ts: listSurveys（全アンケート一覧+セッション情報）ヘルパーを追加
- [x] server/db.ts: getAnalysisData（AI/有人別・言語別・時系列チャット数）ヘルパーを追加
- [x] server/routers/admin.ts: listFeedback・getAnalysis クエリを追加
- [x] client/src/pages/admin/AdminFeedback.tsx: アンケート自由記述一覧ページを作成
- [x] client/src/pages/admin/AdminDataAnalysis.tsx: Data Analysisページを作成（グラフ・カテゴリ分析）
- [x] DashboardLayout.tsx: Feedback・Data Analysisをサイドバーメニューに追加
- [x] App.tsx: /admin/feedback・/admin/data-analysisルートを追加

## Phase 15: Google OAuth実装
- [x] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET をシークレットに設定
- [x] server/_core/env.ts に googleClientId / googleClientSecret を追加
- [x] server/db.ts に getUserByEmail ヘルパーを追加
- [x] server/_core/googleOAuth.ts を作成（/api/auth/google・/api/auth/google/callback）
- [x] server/_core/index.ts に registerGoogleOAuthRoutes を追加
- [x] Portal.tsx をGoogle OAuthログインボタンに更新（Googleアイコン付き）
- [x] DashboardLayout.tsx の Sign In ボタンを /portal へリダイレクトに変更
- [x] useAuth.ts のデフォルトリダイレクト先を /portal に変更
- [x] テスト 15/15 通過

## Phase 16: yah.mobile ロゴを全ページタイトルに追加
- [x] /manus-storage/yah-mobile-logo_ec15ef66.svg をアップロード済み
- [x] DashboardLayout.tsx: サイドバーヘッダーにロゴを追加（展開時・折りたたみ時）
- [x] AdminDashboard.tsx: h1「Dashboard」左にロゴを追加
- [x] AdminOperators.tsx: h1「Operator Management」左にロゴを追加
- [x] AdminQuickReplies.tsx: h1「Quick Replies」左にロゴを追加
- [x] AdminRag.tsx: h1「RAG Documents」左にロゴを追加
- [x] AdminFeedback.tsx: h1「Feedback」左にロゴを追加
- [x] AdminDataAnalysis.tsx: h1「Data Analysis」左にロゴを追加
- [x] OperatorChats.tsx: h1「Chat List」左にロゴを追加
- [x] TypeScript: 0エラー確認

## Phase 17: AdminチャットリストとDetail閲覧機能
- [x] client/src/pages/admin/AdminChatList.tsx: Admin用チャットリストページを新規作成
- [x] client/src/pages/admin/AdminChatDetail.tsx: Admin用チャット詳細（読み取り専用＋Force End）を新規作成
- [x] DashboardLayout.tsx: DEFAULT_ADMIN_ITEMSに「Chat List」(/admin/chats)を追加
- [x] App.tsx: /admin/chats・/admin/chats/:idルートを追加
- [x] TypeScript: 0エラー確認

## Phase 19: Admin対応時のoperatorId保存修正
- [x] server/routers/admin.ts: endChatでoperatorIdが未設定の場合ctx.user.idを設定するよう修正
- [x] client/src/pages/admin/AdminChatDetail.tsx: Force EndをoperatorのendSessionからadmin.endChatに変更
- [x] client/src/pages/admin/AdminChatDetail.tsx: getSessionDetailをadmin.getChatDetailに変更
- [x] client/src/pages/admin/AdminChatDetail.tsx: generateSummaryをadmin.refreshChatSummaryに変更
- [x] client/src/pages/admin/AdminChatList.tsx: operator.listSessionsをadmin.listChatsに変更
- [x] TypeScript: 0エラー確認

## Phase 20: Operator対応中のAI自動返信停止バグ修正
- [x] server/routers/chat.ts: sendMessageのAI返信条件を `status=active && operatorId` から `status=active || operatorId` に変更
- [x] Operator assignedまたはstatus=activeのどちらか一方でもAI返信を停止するよう修正
- [x] TypeScript: 0エラー確認

## Phase 21: AI言語自動検出修正
- [x] server/routers/ai.ts: detectLanguageFromMessage()関数を追加（日本語/英語/中国語/スペイン語/韓国語を文字コードで検出）
- [x] server/routers/ai.ts: generateAIResponseでメッセージ内容から言語を自動検出し、DBのlanguageフィールドを更新
- [x] server/routers/ai.ts: 検出言語でescalation判定も行うよう修正
- [x] TypeScript: 0エラー確認

## Phase 22: Admin sendChatMessage時のAI自動返信停止修正
- [x] server/routers/admin.ts: sendChatMessageでメッセージ送信時にstatus=activeとoperatorId=ctx.user.idを自動設定
- [x] Adminがメッセージを送るだけでAssignなしでもAIが止まるよう修正
- [x] TypeScript: 0エラー確認

## Phase 23: モバイルウィジェットのスクロール修正
- [x] WidgetChat.tsx: ScrollAreaをネイティブdiv+overflow-y-auto+overscroll-containに変更
- [x] WidgetChat.tsx: 外側コンテナのoverflow-hiddenを削除、touchAction: pan-yを追加
- [x] WidgetChat.tsx: -webkit-overflow-scrolling: touchを追加（iOS Safari対応）
- [x] widget.js: iframeとwrapにtouch-action: pan-yを追加
- [x] TypeScript: 0エラー確認
