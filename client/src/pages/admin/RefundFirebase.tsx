/**
 * RefundFirebase — 返金管理画面（Firestore版）
 * tRPC → Firestore SDK 直接
 */
import { useState, useMemo } from "react";
import { orderBy } from "firebase/firestore";
import { useCollection, useUpdateDoc } from "@/hooks/useFirestoreAdmin";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, AlertTriangle, Clock, Zap, Mail, CreditCard, Database, Activity, ArrowRight } from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const FLOW_STEPS = [
  { icon: Activity,   label: "OMAX eSIM",  sub: "プロビジョニング",  cls: "text-indigo-500 bg-indigo-50 border-indigo-200" },
  { icon: Clock,      label: "Heartbeat",  sub: "15分ポーリング",    cls: "text-purple-500 bg-purple-50 border-purple-200" },
  { icon: Zap,        label: "OMAX API",   sub: "ステータス確認",    cls: "text-violet-500 bg-violet-50 border-violet-200" },
  { icon: Database,   label: "DB記録",     sub: "esim_incidents",   cls: "text-amber-500  bg-amber-50  border-amber-200"  },
  { icon: CreditCard, label: "Stripe返金", sub: "refunds.create()", cls: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { icon: Mail,       label: "メール通知", sub: "Resend（日英）",   cls: "text-blue-500   bg-blue-50   border-blue-200"   },
];

const ELIGIBLE = [
  {
    title: "二重課金",
    en: "Duplicate Charge",
    desc: "同一購入に対して2回以上の課金が発生した場合",
    examples: ["クレジットカードに同一金額が2件表示", "決済エラー後に再決済し両方引き落とされた"],
    action: "自動検知 → 即時返金確約メッセージ + チケット発行",
    now: "0.975", after: "0.995",
  },
  {
    title: "QRコード未発行",
    en: "QR Code Not Issued",
    desc: "支払い完了後24時間以上経過してもQRコードが届かない場合",
    examples: ["メール・迷惑メールフォルダ両方確認済みで未着", "システム障害によるeSIM発行失敗"],
    action: "自動再送 → 解決しない場合は返金確約",
    now: "0.950", after: "0.985",
  },
  {
    title: "端末非対応が判明",
    en: "Device Incompatibility",
    desc: "購入後にeSIMに対応していない端末であることが判明した場合",
    examples: ["SIMロックが解除できない端末", "eSIM非対応の旧機種"],
    action: "端末確認後 → 返金確約",
    now: "0.880", after: "0.950",
  },
  {
    title: "一度も接続できなかった（技術的不具合）",
    en: "Never Connected (Technical Fault)",
    desc: "全ての設定手順を試みたにもかかわらず一度も接続できなかった場合",
    examples: ["APN設定・データローミング・再起動を全て試みた", "サポートの指示に従ったが解決しなかった"],
    action: "調査後 → 技術的不具合が確認された場合に返金確約",
    now: "0.750", after: "0.930",
  },
];

const INELIGIBLE = [
  {
    title: "単純な未使用・気が変わった",
    desc: "技術的な問題なく、単に使用しなかった・不要になった場合",
    reason: "デジタルコンテンツの性質上、返金不可（特定商取引法第15条の3）",
  },
  {
    title: "接続設定ミス（サポートで解決可能）",
    desc: "データローミングのオフ、APN設定漏れなど、設定変更で解決できる場合",
    reason: "技術的不具合ではなく、設定サポートで解決可能",
  },
  {
    title: "有効期限切れ後の申請",
    desc: "プランの有効期限が切れた後に返金を申請した場合",
    reason: "サービスの提供は完了しているため返金不可",
  },
  {
    title: "誤プラン購入（代替案あり）",
    desc: "誤って別のプランを購入したが、代替案が提供可能な場合",
    reason: "代替案の提供で対応。返金ではなくプラン調整を優先",
  },
];

const TRIGGERS = [
  { dot: "bg-amber-400",  code: "provisioning_failed", desc: "OMAXステータスが error" },
  { dot: "bg-orange-400", code: "activation_timeout",  desc: "not_installed かつ購入から1時間経過" },
  { dot: "bg-red-400",    code: "esim_expired_early",  desc: "期待使用期間の80%未満で失効" },
];

const PROCESS_STEPS = [
  { num: "①", color: "text-indigo-500",  text: "Heartbeat (15分間隔) でeSIM状態をOMAX APIに問い合わせ" },
  { num: "②", color: "text-purple-500",  text: "異常検知 → esim_incidents テーブルに記録" },
  { num: "③", color: "text-emerald-500", text: "Stripe refunds.create() で小売価格を全額返金" },
  { num: "④", color: "text-blue-500",    text: "Resend でユーザーに返金完了メール（日英）を送信" },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:      { label: "待機中", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  processing:   { label: "処理中", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  refunded:     { label: "返金済", cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  failed:       { label: "失敗",   cls: "bg-red-50 text-red-600 border-red-200" },
  not_required: { label: "対象外", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function ScoreChip({ value }: { value: string }) {
  const n = parseFloat(value);
  const cls = n >= 0.95 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : n >= 0.85 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {value}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </p>
  );
}

function formatDatetime(d: any) {
  if (!d) return "—";
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

// Stable constraints
const purchaseConstraints = [orderBy("purchasedAt", "desc")];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RefundFirebase() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { docs: rawPurchases, loading: isLoading } = useCollection("purchases", purchaseConstraints);

  // Filter incidents from purchases (those with refundStatus or incidentType)
  const incidents = useMemo(() => {
    const all = rawPurchases.filter((p: any) => p.incidentType || p.refundStatus);
    if (statusFilter === "all") return all;
    return all.filter((p: any) => p.refundStatus === statusFilter);
  }, [rawPurchases, statusFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">返金管理 / Refund Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            自動返金フロー・対象ケース・インシデント一覧
          </p>
        </div>

        {/* Automated refund flow */}
        <section>
          <SectionLabel>自動返金フロー</SectionLabel>
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-1 min-w-max">
              {FLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center gap-1">
                    <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border w-[110px] ${step.cls}`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-semibold text-center leading-tight">{step.label}</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">{step.sub}</span>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Heartbeatジョブが15分ごとにeSIM状態を確認し、異常を検知すると自動でStripe返金とメール通知を実行します。
          </p>
        </section>

        {/* Trigger conditions + process flow */}
        <section className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">自動返金トリガー条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {TRIGGERS.map((t) => (
                <div key={t.code} className="flex items-start gap-3">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${t.dot}`} />
                  <div>
                    <code className="text-xs font-mono font-semibold">{t.code}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">処理フロー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PROCESS_STEPS.map((s) => (
                <div key={s.num} className="flex items-start gap-3">
                  <span className={`text-sm font-bold flex-shrink-0 ${s.color}`}>{s.num}</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2 leading-relaxed">
                OMAX卸値はOMAX側で自動返金。chat.yah.mobi はStripe経由の小売価格返金のみ担当。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Eligible cases */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <SectionLabel>返金対象ケース（自動対応予定）</SectionLabel>
          </div>
          <div className="space-y-3">
            {ELIGIBLE.map((c) => (
              <Card key={c.title} className="border-l-4 border-l-emerald-400">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{c.title}</span>
                        <span className="text-xs text-muted-foreground">/ {c.en}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.examples.map((ex) => (
                          <span key={ex} className="text-xs bg-muted/60 px-2 py-0.5 rounded-full border text-muted-foreground">
                            {ex}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs">
                        <span className="font-medium text-blue-600">対応フロー: </span>
                        <span className="text-muted-foreground">{c.action}</span>
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground mb-1">現在</p>
                        <ScoreChip value={c.now} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground mb-1">実装後</p>
                        <ScoreChip value={c.after} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Ineligible cases */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <SectionLabel>返金対象外ケース（現状維持）</SectionLabel>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {INELIGIBLE.map((c) => (
              <Card key={c.title} className="border-l-4 border-l-red-300">
                <CardContent className="pt-4 pb-4 space-y-2">
                  <p className="font-semibold text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  <p className="text-xs">
                    <span className="font-medium text-red-500">理由: </span>
                    <span className="text-muted-foreground">{c.reason}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Legal basis */}
        <div className="flex items-start gap-3 rounded-xl border bg-amber-50/50 border-amber-200 p-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">法的根拠：</span>
            特定商取引法第15条の3に基づき、デジタルコンテンツ（eSIM）は提供開始後の返金は原則不可。
            ただし、事業者側の技術的不具合・二重課金・未発行等のシステムエラーによる場合は例外として返金対応を行う。
          </p>
        </div>

        {/* Incidents table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>インシデント一覧</SectionLabel>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="pending">待機中</SelectItem>
                <SelectItem value="processing">処理中</SelectItem>
                <SelectItem value="refunded">返金済</SelectItem>
                <SelectItem value="failed">失敗</SelectItem>
                <SelectItem value="not_required">対象外</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              <p className="font-medium text-sm">インシデントなし</p>
              <p className="text-xs">現在、返金対象のeSIMインシデントはありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead className="min-w-[130px]">ICCID</TableHead>
                    <TableHead className="min-w-[150px]">種別</TableHead>
                    <TableHead className="min-w-[110px]">OMAXステータス</TableHead>
                    <TableHead className="text-right w-20">返金額</TableHead>
                    <TableHead className="w-20">状態</TableHead>
                    <TableHead className="min-w-[150px]">検知日時</TableHead>
                    <TableHead className="min-w-[150px]">解決日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((inc: any) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{inc.id.slice(0, 6)}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[130px] truncate" title={inc.iccid ?? ""}>
                        {inc.iccid ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono whitespace-nowrap">
                          {(inc.incidentType ?? "").replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {inc.omaxStatus ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium whitespace-nowrap">
                        {inc.refundAmountYen != null ? `¥${inc.refundAmountYen.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inc.refundStatus ?? "pending"} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDatetime(inc.detectedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDatetime(inc.resolvedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  );
}
