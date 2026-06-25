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

## Phase 24: チャット内画像送受信機能
- [x] WidgetChat.tsx: 画像選択ボタン（クリップアイコン）を入力欄に追加
- [x] WidgetChat.tsx: 画像プレビュー（送信前確認）UIを追加
- [x] WidgetChat.tsx: upload.uploadFileを使って画像をS3にアップロードし、fileUrlとしてsendMessageに渡す
- [x] WidgetChat.tsx: メッセージ一覧でfileUrlがある場合に画像を表示
- [x] OperatorChatDetail.tsx: 画像送信ボタンとプレビューUIを追加
- [x] OperatorChatDetail.tsx: メッセージ一覧でfileUrlがある場合に画像を表示
- [x] AdminChatReply.tsx: 画像送信ボタンとプレビューUIを追加
- [x] AdminChatReply.tsx: メッセージ一覧でfileUrlがある場合に画像を表示
- [x] 画像クリックで拡大表示（lightbox）を実装

## Phase 25: Admin/Operatorメッセージ重複・Visitor未配信バグ修正
- [x] AdminChatReply: new_messageハンドラーでrole=operatorのメッセージを無視（楽観的更新と重複防止）
- [x] OperatorChatDetail: 同様にrole=operatorのメッセージを無視
- [x] WidgetChat: ポーリング（3秒ごとにgetMessages）を追加してSocket.io未配信時のフォールバックを実装

## Phase A: セキュリティ緊急対応（2026-06-16）
- [x] A-1: upload.uploadFile に認証・サイズ(20MB)・MIMEタイプバリデーション追加
- [x] A-2: Socket.io join_operators に認証ミドルウェア追加
- [x] A-3: chat.getMessages に visitorId 検証を追加（情報漏洩防止）
- [x] A-4: operator.sendMessage にセッション所有権チェック追加
- [x] A-5: operator.endSession / admin.endChat に scheduleSessionDeletion 追加

## Phase B: パフォーマンス・アーキテクチャ改善（2026-06-16）
- [x] B-1: Redis Pub/Sub アダプター導入（@socket.io/redis-adapter + ioredis + Upstash Redis。ENV未設定時はin-memoryにフォールバック）
- [x] B-2: DBインデックス追加（messages.sessionId, sessions.visitorId, sessions.status, sessions.operatorId, surveys.sessionId）
- [x] B-3: Socket.io 接続中はポーリング間隔を30秒に延長（WidgetChat・OperatorChatDetail・AdminChatReply）
- [x] B-4: admin.listOperators N+1クエリ修正（getAllOperatorsWithChatCount JOIN化）
- [x] B-5: Express ボディサイズ制限を 50mb → 20mb に変更
- [x] B-6: chat.sendMessage / admin.sendChatMessage - ended セッションへの送信を拒否
- [x] B-7: admin.sendChatMessage - ended セッションへの送信を拒否（B-6と統合）

## Phase C-6.1: Admin画面ルーティング統合（2026-06-16）
- [x] AdminChatList.tsx: Socket.io接続中はポーリング間隔を30秒に延長（B-3と同様）
- [x] AdminChatList.tsx: 「Active」タブを追加してwaitingとactiveを切り替え表示できるようにする（元々実装済み）
- [x] App.tsx: /admin/active-chats ルートを /admin/chats にリダイレクト
- [x] DashboardLayout.tsx: サイドバーの重複「Chats」(/admin/active-chats)リンクを削除
- [x] AdminChats.tsxを廃止（App.tsxからimport削除・/admin/active-chatsは/admin/chatsにリダイレクト）

## Phase D-5: DBスキーマ改善（2026-06-16）
- [x] 5.1: messages テーブルに FK制約 fk_messages_session を追加（ON DELETE CASCADE）
- [x] 5.1: chat_sessions テーブルに FK制約 fk_sessions_operator を追加（ON DELETE SET NULL）
- [x] 5.2: messages テーブルに senderId カラム追加（users.id への FK）
- [x] 5.2: drizzle/schema.ts に senderId フィールドを追加
- [x] 5.2: server/routers/operator.ts・admin.ts の sendMessage で senderId を保存
- [x] 5.3: startSession にレースコンディション対策（check→create→re-checkパターンで重複セッションを防止）
- [x] 5.4: operator.endSession / admin.endChat の scheduleSessionDeletion 呼び出しを確認（A-5で実装済みを確認）

## Phase E: 画像Vision AI解析 + Admin分析ダッシュボード（2026-06-16）

- [x] image_analyses テーブルをDBに追加（sessionId, messageId, category, keywords, description, confidence）
- [x] drizzle/schema.ts に imageAnalyses テーブル定義を追加
- [x] upload.ts: アップロード後に非同期でVision AI解析を実行しDBに保存
- [x] server/db.ts: createImageAnalysis・getImageAnalyticsSummary ヘルパー追加
- [x] admin.ts: getImageAnalytics プロシージャ追加（カテゴリ別集計・キーワード頻度）
- [x] AdminDataAnalysis.tsx: 画像分析セクションを追加（カテゴリ別棒グラフ・キーワード一覧・最近の画像付きチャット）

## Phase 26: アンケート結果をOperator画面に表示（2026-06-17）
- [x] server/routers/chat.ts: submitSurvey完了後にSocket.ioでsurvey_submittedイベントを送信（session:${id}ルームとoperatorsルームへ）
- [x] OperatorChatDetail.tsx: SurveyResult型を定義
- [x] OperatorChatDetail.tsx: survey_submittedイベントをSocket.ioで受信してsurveResultステートに保存
- [x] OperatorChatDetail.tsx: アンケート結果カード（星評価・解決済み/未解決・自由コメント）をメッセージ一覧の末尾に表示
- [x] TypeScript: 0エラー確認

## Phase 27: メール通知をadmin/オペレーター別に整理（2026-06-18）
- [x] server/email.ts: sendAssignmentEmail 関数を追加（アサイン通知メール）
- [x] server/db.ts: getAllAdmins ヘルパーを追加（admin ロールのユーザー一覧）
- [x] server/db.ts: getUserById ヘルパーを追加（ID でユーザー取得）
- [x] server/routers/chat.ts: 新規チャット開始・エスカレーション時のメール通知を全オペレーター→全 admin のみに変更
- [x] server/routers/admin.ts: assignChat に sendAssignmentEmail 呼び出しを追加（operatorId 指定時のみ）
- [x] client/src/pages/operator/OperatorQuickReplies.tsx: JSX 構造エラー（余分な div）を修正
- [x] TypeScript: 0 エラー確認・チェックポイント保存

## Phase 28: 実装シンプル化リファクタリング（2026-06-18）

- [x] デッドコード削除: Home.tsx / ComponentShowcase.tsx / AdminChats.tsx
- [x] App.tsx から AdminChatDetail (/admin/chats/:id) ルートを削除し /reply に統合
- [x] ChatDetailBase 共通コンポーネント作成（OperatorChatDetail + AdminChatReply を統合）
- [x] ChatListBase 共通コンポーネント作成（OperatorChats + AdminChatList を統合）
- [x] chat.listQuickReplies を追加して operator/admin の重複エンドポイントを共通化

## Phase 29: 未読バッジ表示（admin/operator 両対応）
- [x] DBスキーマ: chat_sessions に lastMessageAt 追加、session_reads テーブル新規作成
- [x] マイグレーション実行
- [x] DB helpers: markSessionRead / getUnreadSessionIds / updateSessionLastMessageAt 追加
- [x] API: operator/admin に markRead mutation・getUnreadSessionIds query 追加
- [x] ChatListBase に未読バッジUI追加（ブルードット・カードボーダー強調）
- [x] ChatDetailBase でセッション開いた時・新メッセージ受信時に自動既読マーク
- [x] メッセージ送信時に lastMessageAt を更新（chat/operator/admin 全ルーター）
- [x] テスト 15/15 通過・チェックポイント保存

## Phase 30: Admin Chat Reply にオペレーターアサインUI追加
- [x] ChatDetailBase: admin モードにオペレーターアサインドロップダウンを追加
- [x] admin.listOperators クエリを使ってオペレーター一覧を取得
- [x] 現在のアサイン済みオペレーターを初期値として表示
- [x] アサイン変更時に admin.assignChat mutation を呼び出す
- [x] TypeScript: 0エラー確認・テスト 15/15 通過

## Phase 31: チーム成績スコアカード（Data Analysis ページ）
- [x] DB: getTeamScorecard クエリ追加（CSAT・解決率・AI解決率・FRT・エスカレーション率）
- [x] API: admin.getTeamScorecard エンドポイント追加（期間フィルター対応）
- [x] UI: Data Analysis ページにスコアカードセクション追加（総合スコア + 5指標カード）
- [x] UI: 期間フィルター（今日/今週/今月/全期間）対応
- [x] TypeScript: 0エラー確認・テスト 15/15 通過

## Phase 32: チャット一覧のリアルタイム更新（Socket.io）
- [x] サーバー側: new_session / session_assigned / session_ended / escalation_alert イベントが既に実装済みであることを確認
- [x] ChatListBase: Socket.io 受信時に一覧・未読・KPIカウントを自動リフレッシュ（既存実装を確認・補完）
- [x] ポーリング（refetchInterval）を全クエリから削除してSocket.ioのみに一本化
- [x] useEffectの依存配列を正確に設定（refetchCounts / refetchUnread 追加）
- [x] TypeScript: 0エラー確認・テスト 15/15 通過

## Phase 33: DeepL 双方向翻訳機能（2026-06-22）
- [x] DEEPL_API_KEY を環境変数に登録・env.ts に追加
- [x] server/_core/deepl.ts: translateToJapanese / translateFromJapanese ヘルパー作成（DeepL Free API）
- [x] drizzle/schema.ts: messages テーブルに translation カラム追加（text, nullable）
- [x] DBマイグレーション実行（0006_good_silver_sable.sql）
- [x] chat.ts startSession: 訪問者の初回メッセージを日本語に翻訳して translation に保存（レイヤー1）
- [x] chat.ts sendMessage: 訪問者メッセージを日本語に翻訳して translation に保存（レイヤー1）
- [x] operator.ts sendMessage: オペレーターの日本語メッセージを訪問者言語に翻訳して translation に保存（レイヤー2）
- [x] admin.ts sendChatMessage: 管理者の日本語メッセージを訪問者言語に翻訳して translation に保存（レイヤー2）
- [x] chat.ts getMessages: 訪問者向けレスポンスでオペレーターメッセージを翻訳済みテキストに差し替え
- [x] ChatDetailBase.tsx: ChatMessage 型に translation / originalContent フィールドを追加
- [x] ChatDetailBase.tsx: 訪問者メッセージバブル下に日本語訳を表示（🌐 アイコン付き）
- [x] ChatDetailBase.tsx: オペレーターメッセージバブル下に送信先言語の翻訳を表示（→ プレフィックス）
- [x] TypeScript: 0 エラー確認・テスト 15/15 通過

## Phase 34: 翻訳失敗時フォールバック表示（2026-06-22）
- [x] deepl.ts: TranslationResult 型を追加（ok: true/false + reason: quota_exceeded / api_error / no_key / network_error / skipped）
- [x] deepl.ts: translateTextWithResult / translateToJapaneseWithResult / translateFromJapaneseWithResult を追加
- [x] chat.ts: WithResult バリアントに切り替え、失敗時は「[翻訳できませんでした]」を translation に保存
- [x] operator.ts: WithResult バリアントに切り替え、quota_exceeded 時は「[翻訳上限に達しました]」を保存
- [x] admin.ts: WithResult バリアントに切り替え、同様のフォールバックラベルを保存
- [x] ChatDetailBase.tsx: 翻訳失敗ラベルを amber 色 + ⚠ アイコンで視覚的に区別表示
- [x] TypeScript: 0 エラー確認・テスト 15/15 通過

## Phase 35: OpenAI 直接 API への切り替え（2026-06-22）
- [x] OPENAI_API_KEY を環境変数に登録
- [x] env.ts に openAiApiKey を追加
- [x] llm.ts: OPENAI_API_KEY が設定されている場合は api.openai.com に直接リクエスト（フォールバック: Manus Forge）
- [x] ai.ts: getEmbedding を OpenAI 直接 API に切り替え（フォールバック: Manus Forge）
- [x] ai.ts: generateAIResponse / generateSummary のモデルを gpt-4o → gpt-4o-mini に変更（コスト削減）
- [x] server/openai.test.ts: OpenAI エンドポイントルーティングのテストを追加
- [x] TypeScript: 0 エラー確認・テスト 16/16 通過

## Phase 36: AI 返信への翻訳表示追加（2026-06-22）
- [x] chat.ts の startSession: AI 返信生成後に translateToJapaneseWithResult で日本語訳を取得し translation フィールドに保存
- [x] chat.ts の sendMessage: 同様に AI 返信の翻訳を保存し socket emit にも translation を含める
- [x] ChatDetailBase.tsx: isAI メッセージに翻訳表示ブロック（Layer 1b）を追加（青色テキスト、エラー時は amber）
- [x] TypeScript: 0 エラー確認・テスト 16/16 通過

## Phase 37: 対応言語を6言語に更新（ja/en/zh/ko/th/vi）- 初期計画（完了済み）
- [x] server/routers/chat.ts の z.enum を更新（es削除、th/vi追加）
- [x] server/routers/ai.ts の言語検出ロジックを更新（タイ語・ベトナム語の文字コード検出追加）
- [x] server/_core/deepl.ts の言語コードマッピングを更新（th/vi追加）
- [x] client/src/pages/ChatStart.tsx の言語選択 UI を更新（スペイン語削除、タイ語・ベトナム語追加）
- [x] shared/i18n.ts の翻訳辞書にタイ語・ベトナム語を追加
- [x] TypeScript: 0エラー確認・テスト通過

## Phase 37: 対応言語を6言語に更新（ja/en/zh/ko/th/vi）
- [x] shared/i18n.ts: Lang 型・LANG_OPTIONS をタイ語・ベトナム語対応に更新（スペイン語削除）
- [x] shared/i18n.ts: タイ語・ベトナム語の全翻訳辞書を追加
- [x] server/routers/chat.ts: z.enum を ja/en/zh/ko/th/vi に更新
- [x] server/routers/ai.ts: ESCALATION_KEYWORDS・LANGUAGE_NAMES・detectLanguageFromMessage・FALLBACK を更新
- [x] client/src/pages/ChatStart.tsx: LANGUAGES 定数と型を更新
- [x] client/src/contexts/LanguageContext.tsx: detectBrowserLang を更新
- [x] client/src/pages/WidgetChat.tsx: validLangs を更新
- [x] client/src/components/ChatDetailBase.tsx: LANG_LABELS を更新
- [x] client/src/components/ChatListBase.tsx: LANG_LABELS を更新
- [x] client/src/pages/admin/AdminDataAnalysis.tsx: LANG_LABEL を更新
- [x] client/src/pages/admin/AdminFeedback.tsx: LANG_LABEL を更新

## Phase 38: コードシンプル化・安定化リファクタリング（完了）
- [x] deepl.ts に toTranslationLabel() ユーティリティを追加し、chat.ts の重複パターンを置換
- [x] chatService.ts を新規作成し、admin.ts・operator.ts の sendMessage 処理を共通化
- [x] email.ts の buildEmailHtml() 共通テンプレートを作成し、3関数から利用
- [x] ai.ts の言語検出・DB 更新処理を chat.ts に移動（責務分離）
- [x] chat.test.ts の言語サポートテストを6言語（ja/en/zh/ko/th/vi）に更新
- [x] TypeScript: 0 エラー確認・テスト 16/16 通過

## Phase 39: Googleログイン済みビジター情報をチャット一覧に表示

- [x] drizzle/schema.ts: chat_sessions に isGoogleLogin (INT DEFAULT 0) カラム追加
- [x] DB マイグレーション: ALTER TABLE chat_sessions ADD COLUMN isGoogleLogin INT DEFAULT 0 実行
- [x] server/routers/chat.ts: startSession に isGoogleLogin フィールド追加、createChatSession に渡す
- [x] client/src/pages/WidgetChat.tsx: handleStart で isGoogleLogin: !!visitorEmail を送信
- [x] client/src/pages/ChatStart.tsx: handleSubmit で isGoogleLogin: false を明示
- [x] client/src/components/ChatListBase.tsx: isGoogleLogin===1 の場合に Google カラーバッジ「ログイン済み」を表示
- [x] TypeScript: 0 エラー確認・テスト 16/16 通過

## Phase 40: Admin AI Chatbot ページ追加・システムプロンプト更新

- [x] client/src/pages/admin/AIChatbot.tsx を新規作成（仕様表示・システムプロンプト編集UI）
- [x] DashboardLayout のサイドバーに AI Chatbot メニュー追加（Operators の下）
- [x] App.tsx に /admin/ai-chatbot ルートを追加
- [x] server/routers/ai.ts のシステムプロンプトを yah.mobile 専用に更新
- [x] TypeScript: 0 エラー確認
