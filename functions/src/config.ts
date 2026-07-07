/**
 * 環境変数・定数定義
 *
 * 外部APIキー: ゼロ。
 * 全て GCP プロジェクト内のサービスアカウント認証。
 */

/** Gemini モデル設定 */
export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMENSION = 768;

/** RAG 設定 */
export const RAG_TOP_K = 5; // Vector Search で取得する上位件数
export const RAG_DISTANCE_THRESHOLD = 0.3; // 類似度閾値

/** チャット制限 */
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MESSAGES_PER_SESSION = 100;

/** AI コスト保護: 訪問者ごとの 1 日あたり AI 応答上限（Firestore カウンタ） */
export const DAILY_AI_LIMIT_PER_VISITOR = 50;

/** データ保持期限 */
export const RETENTION_DAYS = 365 * 2; // 2年

/** Admin メールアドレス（エスカレーション通知先） */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@yah.mobi";

/** RAG下書き承認の通知先（L1: 週次バッチが下書き生成時にメール） */
export const APPROVAL_EMAIL =
  process.env.APPROVAL_EMAIL || "kazuyoshi.yamada@bonfire.co.jp";

/** 管理画面のベースURL（メール本文のリンク用） */
export const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL || "https://chat.yah.mobi";

/** Google Sheets 仕訳帳 ID */
export const SHEETS_JOURNAL_ID = process.env.SHEETS_JOURNAL_ID || "";

/** Firebase リージョン */
export const REGION = "asia-northeast1"; // 東京

/** Vertex AI 設定（ADC＝サービスアカウント認証・外部APIキー不要） */
export const GCP_PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "yah-mobile-v1-3ed24";
export const VERTEX_LOCATION = "asia-northeast1"; // 東京（データ residency）
