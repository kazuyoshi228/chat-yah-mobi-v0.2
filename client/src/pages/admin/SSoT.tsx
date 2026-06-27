/**
 * SSoT — Single Source of Truth
 * システム全体の設定・ルール・定数を一覧管理するページ。
 * コードを変更した際はここも必ず更新すること。
 */
import { Badge } from "@/components/ui/badge";

interface SsoTRow {
  category: string;
  key: string;
  value: string;
  location: string;
  note?: string;
  status?: "active" | "pending" | "deprecated";
}

const ROWS: SsoTRow[] = [
  // ── 返信・対応時間 ──────────────────────────────────────────────────────────
  {
    category: "Response Time",
    key: "Support reply SLA",
    value: "3 business days",
    location: "ai.ts (system prompt) / ChatRoom.tsx / WidgetChat.tsx / ChatWidget.tsx",
    note: "フォーム誘導前に必ずユーザーに伝える。全箇所で統一済み（2026-06-27）",
    status: "active",
  },
  {
    category: "Response Time",
    key: "AI response trigger (form redirect)",
    value: "10 messages unresolved → form redirect prompt",
    location: "ai.ts shouldRedirectToForm logic",
    note: "10回以上AIが解決できない場合、フォーム誘導バナーを表示",
    status: "active",
  },
  {
    category: "Response Time",
    key: "Escalation trigger (operator)",
    value: "5 messages + escalation signal",
    location: "ai.ts escalation detection",
    note: "5回以上 + 「人と話したい」等のシグナルでオペレーターにエスカレーション",
    status: "active",
  },

  // ── AI モデル・設定 ─────────────────────────────────────────────────────────
  {
    category: "AI Model",
    key: "Primary LLM",
    value: "claude-opus-4-5 (Anthropic)",
    location: "ai.ts invokeLLM({ model: ... })",
    note: "最新の claude-opus-4-5 を使用。モデル変更時はここを更新",
    status: "active",
  },
  {
    category: "AI Model",
    key: "Supported languages",
    value: "JA / EN / ZH / KO / TH / VI",
    location: "ai.ts detectLanguageFromMessage()",
    note: "文字コードで自動検出。新言語追加時は detectLanguageFromMessage を更新",
    status: "active",
  },
  {
    category: "AI Model",
    key: "RAG similarity threshold",
    value: "0.75",
    location: "ai.ts searchRagDocuments()",
    note: "コサイン類似度 0.75 以上のドキュメントのみ参照",
    status: "active",
  },
  {
    category: "AI Model",
    key: "Max RAG documents per query",
    value: "5",
    location: "ai.ts searchRagDocuments()",
    note: "1クエリあたり最大5件のRAGドキュメントを参照",
    status: "active",
  },

  // ── Webhook ─────────────────────────────────────────────────────────────────
  {
    category: "Webhook",
    key: "purchase-created endpoint",
    value: "POST /api/webhooks/purchase-created",
    location: "server/routers/webhooks.ts",
    note: "yah.mobi/app から購入完了時に送信。HMAC-SHA256 署名検証あり",
    status: "active",
  },
  {
    category: "Webhook",
    key: "purchase-created required fields",
    value: "orderId, externalUserId, planId, amount, purchasedAt, stripePaymentIntentId, email",
    location: "server/routers/webhooks.ts (z.object schema)",
    note: "stripePaymentIntentId と email は必須（2026-06-27 に必須化）",
    status: "active",
  },
  {
    category: "Webhook",
    key: "Signature header",
    value: "X-Webhook-Signature: HMAC-SHA256(body, WEBHOOK_SECRET)",
    location: "server/routers/webhooks.ts verifyWebhookSignature()",
    note: "WEBHOOK_SECRET は yah.mobi/app と chat.yah.mobi で同じ値を設定",
    status: "active",
  },

  // ── 自動返金 ────────────────────────────────────────────────────────────────
  {
    category: "Auto Refund",
    key: "Refund check interval",
    value: "15 minutes (Heartbeat)",
    location: "server/refundJob.ts",
    note: "Heartbeat ジョブが15分ごとに OMAX API で eSIM ステータスを確認",
    status: "active",
  },
  {
    category: "Auto Refund",
    key: "Refund trigger conditions",
    value: "provisioning_failed / activation_timeout (>24h) / esim_expired_early (>7 days before plan end)",
    location: "server/refundJob.ts REFUND_TRIGGERS",
    note: "上記3条件のいずれかで Stripe 自動返金 + Resend メール通知",
    status: "active",
  },
  {
    category: "Auto Refund",
    key: "Refund notification email",
    value: "Resend → users.email (日英バイリンガル)",
    location: "server/refundJob.ts sendRefundNotification()",
    note: "返金完了後に購入者メールアドレスに自動送信",
    status: "active",
  },

  // ── データ保持 ──────────────────────────────────────────────────────────────
  {
    category: "Data Retention",
    key: "Chat session archive",
    value: "2 years after session end",
    location: "server/routers/chat.ts scheduleSessionDeletion()",
    note: "セッション終了から2年後にアーカイブ",
    status: "active",
  },
  {
    category: "Data Retention",
    key: "Chat session deletion",
    value: "3 years after session end",
    location: "server/routers/chat.ts scheduleSessionDeletion()",
    note: "セッション終了から3年後に物理削除",
    status: "active",
  },
  {
    category: "Data Retention",
    key: "RAG document expiry",
    value: "Per document (expires_at field)",
    location: "drizzle/schema.ts rag_documents.expires_at",
    note: "期限切れドキュメントは RAG 検索から自動除外",
    status: "active",
  },

  // ── ファイルアップロード ─────────────────────────────────────────────────────
  {
    category: "File Upload",
    key: "Max file size",
    value: "16 MB",
    location: "server/routers/upload.ts / WidgetChat.tsx",
    note: "画像・ファイル添付の上限。フロントエンドとバックエンドで同値を維持",
    status: "active",
  },
  {
    category: "File Upload",
    key: "Allowed MIME types",
    value: "image/jpeg, image/png, image/gif, image/webp, application/pdf",
    location: "server/routers/upload.ts ALLOWED_MIME_TYPES",
    note: "バックエンドで検証。追加時は両方更新",
    status: "active",
  },

  // ── 認証 ────────────────────────────────────────────────────────────────────
  {
    category: "Auth",
    key: "Staff login method",
    value: "Google OAuth → /portal",
    location: "server/_core/googleOAuth.ts / client/src/pages/Portal.tsx",
    note: "Admin・Operator ともに Google アカウントでログイン",
    status: "active",
  },
  {
    category: "Auth",
    key: "Visitor login method",
    value: "Google OAuth (optional) or anonymous",
    location: "WidgetChat.tsx handleGoogleLogin()",
    note: "ゲスト購入なし。ログイン済みユーザーは自動認証",
    status: "active",
  },
  {
    category: "Auth",
    key: "Session cookie expiry",
    value: "7 days",
    location: "server/_core/cookies.ts",
    note: "JWT セッションクッキーの有効期限",
    status: "active",
  },

  // ── ヘルスチェック ──────────────────────────────────────────────────────────
  {
    category: "Health Check",
    key: "System health check interval",
    value: "5 minutes (Heartbeat)",
    location: "server/healthCheckJob.ts",
    note: "Stripe / Resend / OMAX / DB の疎通確認。障害時は AI プロンプトに注入",
    status: "active",
  },
];

const CATEGORIES = ROWS.map((r) => r.category).filter((v, i, a) => a.indexOf(v) === i);

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  deprecated: { label: "Deprecated", className: "bg-red-100 text-red-700 border-red-200" },
};

export default function SSoT() {
  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Single Source of Truth</h1>
        <p className="text-sm text-gray-500 mt-1">
          システム全体の設定・ルール・定数の一覧。コードを変更した際はここも必ず更新してください。
        </p>
      </div>

      {/* Tables by category */}
      {CATEGORIES.map((category) => {
        const rows = ROWS.filter((r) => r.category === category);
        return (
          <section key={category}>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              {category}
            </h2>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-[22%]">Key</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-[22%]">Value</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-[28%]">Location</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Note</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-[80px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => {
                    const statusInfo = STATUS_BADGE[row.status ?? "active"];
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800 align-top">{row.key}</td>
                        <td className="px-4 py-3 align-top">
                          <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono break-all">
                            {row.value}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono align-top break-all">
                          {row.location}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 align-top">{row.note ?? "—"}</td>
                        <td className="px-4 py-3 align-top">
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {/* Footer note */}
      <p className="text-xs text-gray-400">
        最終更新: 2026-06-27 — 変更時は対応するコードファイルと同時にこのページを更新してください。
      </p>
    </div>
  );
}
