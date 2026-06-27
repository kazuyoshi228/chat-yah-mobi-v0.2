/**
 * SSoT — Single Source of Truth
 * システム全体の設定・ルール・定数を一覧管理するページ。
 * コードを変更した際はここも必ず更新すること。
 *
 * 旧 Improvements.tsx / HistoricalDocs.tsx の内容はここに統合済み。
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/DashboardLayout";
import { Bot, Languages, Check, BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// ─── SSoT Data ──────────────────────────────────────────────────────────────

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
    note: "フォーム誘導前に必ずユーザーに伝える。全箇所で統一済み",
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
  {
    category: "Response Time",
    key: "SLA: Operator response (business hours)",
    value: "1 hour",
    location: "WidgetChat.tsx escalation banner",
    note: "営業時間内（1時間以内）。時間外は翠日までに対応。バナーに表示済み",
    status: "active",
  },
  {
    category: "Response Time",
    key: "SLA: Form submission response",
    value: "3 business days",
    location: "ai.ts (system prompt) / ChatRoom.tsx / WidgetChat.tsx",
    note: "フォーム話導バナーに表示。全箇所で統一",
    status: "active",
  },

  // ── AI モデル・設定 ─────────────────────────────────────────────────────────
  {
    category: "AI Model",
    key: "Primary LLM",
    value: "claude-opus-4-8 (Anthropic direct API)",
    location: "ai.ts fetch('https://api.anthropic.com/v1/messages')",
    note: "ANTHROPIC_API_KEY設定時はAnthropicを直接呼び出し。未設定時はManus Forge API経由でclaude-opus-4-7にフォールバック",
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
  {
    category: "AI Model",
    key: "Target resolution rate",
    value: "≥ 90%",
    location: "AIChatbot.tsx / AdminTesting.tsx",
    note: "LLM-as-Judge評価で30/30達成済み",
    status: "active",
  },

  // ── セキュリティ ────────────────────────────────────────────────────────────
  {
    category: "Security",
    key: "Rate limit (session)",
    value: "50 messages / session",
    location: "server/routers/chat.ts sessionLimiter",
    note: "セッションあたりメッセージ数上限。超過時はフォーム誘導",
    status: "active",
  },
  {
    category: "Security",
    key: "Rate limit (message)",
    value: "5 messages / 30s",
    location: "server/rateLimit.ts messageLimiter",
    note: "連続送信防止。Upstash Redis使用",
    status: "active",
  },
  {
    category: "Security",
    key: "Rate limit (IP)",
    value: "100 requests / 10min",
    location: "server/rateLimit.ts ipLimiter",
    note: "IPベースのグローバルレート制限",
    status: "active",
  },
  {
    category: "Security",
    key: "Daily AI cost limit",
    value: "$50 / day",
    location: "server/rateLimit.ts dailyAiCostLimiter",
    note: "超過時はオーナーに通知＋新規AI応答を一時停止",
    status: "active",
  },
  {
    category: "Security",
    key: "Input sanitization",
    value: "XSS filter + spam detection + nonsense detection",
    location: "server/sanitize.ts",
    note: "全メッセージに適用。検出時はブロック＋エラー返却",
    status: "active",
  },
  {
    category: "Security",
    key: "Message length limit",
    value: "2000 characters",
    location: "server/routers/chat.ts sendMessage",
    note: "フロントエンド・バックエンド両方で検証",
    status: "active",
  },
  {
    category: "Security",
    key: "HTTP headers",
    value: "Helmet.js defaults",
    location: "server/_core/index.ts",
    note: "CSP, X-Frame-Options, HSTS等のセキュリティヘッダー",
    status: "active",
  },
  {
    category: "Security",
    key: "CAPTCHA (Turnstile)",
    value: "Cloudflare Turnstile — Invisible mode",
    location: "WidgetChat.tsx / ChatStart.tsx / server/turnstile.ts",
    note: "セッション開始時にサーバーサイド検証。Site Key: VITE_TURNSTILE_SITE_KEY。フロントエンド統合済み",
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
    note: "stripePaymentIntentId と email は必須",
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

  // ── QR再送 ──────────────────────────────────────────────────────────────────
  {
    category: "QR Resend",
    key: "QR resend endpoint",
    value: "trpc.chat.checkQrResend (publicProcedure)",
    location: "server/routers/chat.ts",
    note: "email入力でqrCodeUrlを検索し、Resend経由で再送",
    status: "active",
  },
  {
    category: "QR Resend",
    key: "Rate limit (QR resend)",
    value: "3 requests / 1h per email",
    location: "server/rateLimit.ts qrResendLimiter",
    note: "メール爆撃防止",
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
    note: "Stripe / Resend / OMAX / DB の疏通確認。障害時は AI プロンプトに注入",
    status: "active",
  },

  // ── LLM品質監視 ──────────────────────────────────────────────────────────────────────
  {
    category: "LLM Quality",
    key: "LLM-as-Judge weekly evaluation",
    value: "毎週月曜 09:00 JST (Heartbeat)",
    location: "server/llmJudgeJob.ts / server/_core/index.ts /api/scheduled/llm-judge",
    note: "6シナリオを自動評価。結果をtest_run_logsに保存しオーナーに通知。task_uid: WPZMDuW2xG7FNtTfiWQQLz",
    status: "active",
  },
  {
    category: "LLM Quality",
    key: "LLM-as-Judge test cases",
    value: "6 cases: refund-ja, refund-en, esim-setup-ja, esim-setup-en, form-redirect-ja, language-ko",
    location: "server/llmJudgeJob.ts JUDGE_CASES",
    note: "返金ポリシー・設定手順・フォーム話導・多言語をカバー。合格基準: キーワード包含 + 禁止語句なし + 最低文字数",
    status: "active",
  },
];

const CATEGORIES = ROWS.map((r) => r.category).filter((v, i, a) => a.indexOf(v) === i);

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  deprecated: { label: "Deprecated", className: "bg-red-100 text-red-700 border-red-200" },
};

// ─── AI Model Comparison (from Improvements.tsx) ────────────────────────────

const AI_MODELS = [
  { name: "Claude Opus 4.8", quality: "★★★★★", cost: "~12円", ratio: "x2.2", status: "使用中", cls: "bg-emerald-100 text-emerald-700" },
  { name: "Claude Sonnet 4.6", quality: "★★★★★", cost: "~7円", ratio: "x1.3", status: "フォールバック", cls: "bg-blue-100 text-blue-700" },
  { name: "GPT-4o", quality: "★★★★☆", cost: "~5.5円", ratio: "x1.0", status: "旧モデル", cls: "bg-gray-100 text-gray-500" },
  { name: "Gemini 3.1 Pro", quality: "★★★★☆", cost: "~2.8円", ratio: "x0.5", status: "候補", cls: "bg-gray-100 text-gray-600" },
  { name: "GPT-5-mini", quality: "★★★☆☆", cost: "~0.9円", ratio: "x0.2", status: "候補", cls: "bg-gray-100 text-gray-600" },
];

// ─── RAG Translation Status (from Improvements.tsx) ─────────────────────────

const RAG_TRANSLATIONS = [
  { lang: "英語 (EN)", count: "28件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
  { lang: "中国語 (ZH)", count: "28件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
  { lang: "韓国語 (KO)", count: "28件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
  { lang: "タイ語 (TH)", count: "18件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
  { lang: "ベトナム語 (VI)", count: "16件", quality: "AI翻訳", status: "完了", cls: "bg-emerald-100 text-emerald-700" },
  { lang: "EN/ZH/KO ネイティブ校正", count: "全件", quality: "ネイティブ校正", status: "要対応", cls: "bg-amber-100 text-amber-700" },
];

// ─── Improvement Card Component ─────────────────────────────────────────────

type CardData = { nextDate: string; lastDate: string; notes: string };

function ImprovementCard({
  cardKey,
  title,
  icon: Icon,
  iconColor,
  children,
  initialData,
}: {
  cardKey: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children?: React.ReactNode;
  initialData?: { nextDate: Date | null; lastDate: Date | null; notes: string | null };
}) {
  const [form, setForm] = useState<CardData>({ nextDate: "", lastDate: "", notes: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        nextDate: initialData.nextDate ? new Date(initialData.nextDate).toISOString().slice(0, 10) : "",
        lastDate: initialData.lastDate ? new Date(initialData.lastDate).toISOString().slice(0, 10) : "",
        notes: initialData.notes ?? "",
      });
    }
  }, [initialData]);

  const update = trpc.improvements.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("保存しました");
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">次回実施予定日</Label>
            <Input
              type="date"
              value={form.nextDate}
              onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">前回実施日</Label>
            <Input
              type="date"
              value={form.lastDate}
              onChange={(e) => setForm((f) => ({ ...f, lastDate: e.target.value }))}
              className="text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">メモ</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="任意メモ"
            className="text-sm"
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={update.isPending || saved}
          onClick={() =>
            update.mutate({
              cardKey,
              nextDate: form.nextDate || null,
              lastDate: form.lastDate || null,
              notes: form.notes || null,
            })
          }
        >
          {saved ? <><Check className="w-3.5 h-3.5 mr-1" />保存済み</> : update.isPending ? "保存中..." : "保存"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SSoT() {
  const { data: cards } = trpc.improvements.getAll.useQuery();
  const getCard = (key: string) => cards?.find((c) => c.cardKey === key);

  return (
    <DashboardLayout title="SSoT">
      <div className="p-6 space-y-8 max-w-6xl">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Single Source of Truth</h1>
          <p className="text-sm text-gray-500 mt-1">
            システム全体の設定・ルール・定数の一覧。コードを変更した際はここも必ず更新してください。
          </p>
        </div>

        {/* ── System Config Tables ── */}
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
                            <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
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

        {/* ── Improvement Tracking (from Improvements.tsx) ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Periodic Improvements
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* AI Model Card */}
            <ImprovementCard
              cardKey="ai_model"
              title="AIモデルの選択"
              icon={Bot}
              iconColor="text-indigo-500"
              initialData={getCard("ai_model")}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">モデル</th>
                      <th className="text-center py-2 px-2 font-medium">品質</th>
                      <th className="text-center py-2 px-2 font-medium">コスト/回</th>
                      <th className="text-center py-2 px-2 font-medium">状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AI_MODELS.map((m) => (
                      <tr key={m.name} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{m.name}</td>
                        <td className="py-2 px-2 text-center text-xs">{m.quality}</td>
                        <td className="py-2 px-2 text-center">{m.cost}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.cls}`}>{m.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ImprovementCard>

            {/* RAG Translation Card */}
            <ImprovementCard
              cardKey="rag_translation"
              title="RAGドキュメントの外部翻訳"
              icon={Languages}
              iconColor="text-teal-500"
              initialData={getCard("rag_translation")}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">言語</th>
                      <th className="text-center py-2 px-2 font-medium">件数</th>
                      <th className="text-center py-2 px-2 font-medium">品質</th>
                      <th className="text-center py-2 px-2 font-medium">状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RAG_TRANSLATIONS.map((r) => (
                      <tr key={r.lang} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{r.lang}</td>
                        <td className="py-2 px-2 text-center">{r.count}</td>
                        <td className="py-2 px-2 text-center text-muted-foreground">{r.quality}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.cls}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                現在128件のRAGドキュメントはAI翻訳済み。EN/ZH/KOはネイティブ校正を推奨。
              </p>
            </ImprovementCard>
          </div>
        </section>

        {/* ── Reference Documents (from HistoricalDocs.tsx) ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Reference Documents
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800">SIMロック歴史資料 & eSIM対応端末リスト</p>
                  <p className="text-xs text-gray-500">
                    6カ国のSIMロック規制の歴史、全メーカーのeSIM対応状況、接続トラブル原因一覧。
                    RAGドキュメントとして登録済みのため、AIチャットボットが自動参照します。
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    ソース: docs/sim-lock-history-and-device-compatibility.md (RAG登録済み)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer note */}
        <p className="text-xs text-gray-400">
          最終更新: 2026-06-27 — 変更時は対応するコードファイルと同時にこのページを更新してください。
        </p>
      </div>
    </DashboardLayout>
  );
}
