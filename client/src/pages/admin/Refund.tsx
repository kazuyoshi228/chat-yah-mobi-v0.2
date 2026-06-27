import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Mail,
  CreditCard,
  Database,
  Activity,
  ArrowRight,
} from "lucide-react";

// ── Status badge ──────────────────────────────────────────────────────────────
function IncidentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:      { label: "待機中",   className: "bg-slate-100 text-slate-600 border-slate-200" },
    processing:   { label: "処理中",   className: "bg-blue-50 text-blue-600 border-blue-200" },
    refunded:     { label: "返金済",   className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    failed:       { label: "失敗",     className: "bg-red-50 text-red-600 border-red-200" },
    not_required: { label: "対象外",   className: "bg-slate-50 text-slate-500 border-slate-200" },
  };
  const s = map[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>
      {s.label}
    </span>
  );
}

// ── Flow diagram ──────────────────────────────────────────────────────────────
const flowSteps = [
  { icon: Activity,   label: "OMAX eSIM",   sub: "プロビジョニング",  colorIcon: "text-indigo-500", colorBg: "bg-indigo-50",  colorBorder: "border-indigo-200" },
  { icon: Clock,      label: "Heartbeat",   sub: "15分ポーリング",    colorIcon: "text-purple-500", colorBg: "bg-purple-50",  colorBorder: "border-purple-200" },
  { icon: Zap,        label: "OMAX API",    sub: "ステータス確認",    colorIcon: "text-violet-500", colorBg: "bg-violet-50",  colorBorder: "border-violet-200" },
  { icon: Database,   label: "DB記録",      sub: "esim_incidents",   colorIcon: "text-amber-500",  colorBg: "bg-amber-50",   colorBorder: "border-amber-200" },
  { icon: CreditCard, label: "Stripe返金",  sub: "refunds.create()", colorIcon: "text-emerald-500",colorBg: "bg-emerald-50", colorBorder: "border-emerald-200" },
  { icon: Mail,       label: "メール通知",  sub: "Resend（日英）",   colorIcon: "text-blue-500",   colorBg: "bg-blue-50",    colorBorder: "border-blue-200" },
];

function FlowDiagram() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-stretch gap-0 min-w-max">
        {flowSteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-center">
              {/* Step card */}
              <div className={`flex flex-col items-center justify-center gap-2 px-5 py-4 rounded-xl border ${step.colorBg} ${step.colorBorder} w-[130px] min-h-[90px]`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${step.colorIcon}`} />
                <span className="text-xs font-semibold text-foreground text-center leading-tight">{step.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{step.sub}</span>
              </div>
              {/* Arrow */}
              {i < flowSteps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, isPercent = false }: { score: number; isPercent?: boolean }) {
  const val = isPercent ? score : score * 100;
  const cls = val >= 90
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : val >= 80
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {isPercent ? score.toFixed(1) + "%" : score.toFixed(3)}
    </span>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────
const refundEligibleCases = [
  {
    id: 1,
    title: "二重課金",
    titleEn: "Duplicate Charge",
    description: "同一購入に対して2回以上の課金が発生した場合",
    examples: ["クレジットカードに同一金額が2件表示", "決済エラー後に再決済し両方引き落とされた"],
    action: "自動検知 → 即時返金確約メッセージ + チケット発行",
    currentScore: 0.975,
    projectedScore: 0.995,
  },
  {
    id: 2,
    title: "QRコード未発行",
    titleEn: "QR Code Not Issued",
    description: "支払い完了後24時間以上経過してもQRコードが届かない場合",
    examples: ["メール・迷惑メールフォルダ両方確認済みで未着", "システム障害によるeSIM発行失敗"],
    action: "自動再送 → 解決しない場合は返金確約",
    currentScore: 0.950,
    projectedScore: 0.985,
  },
  {
    id: 3,
    title: "端末非対応が判明",
    titleEn: "Device Incompatibility",
    description: "購入後にeSIMに対応していない端末であることが判明した場合",
    examples: ["SIMロックが解除できない端末", "eSIM非対応の旧機種"],
    action: "端末確認後 → 返金確約",
    currentScore: 0.880,
    projectedScore: 0.950,
  },
  {
    id: 4,
    title: "一度も接続できなかった（技術的不具合）",
    titleEn: "Never Connected (Technical Fault)",
    description: "全ての設定手順を試みたにもかかわらず一度も接続できなかった場合",
    examples: ["APN設定・データローミング・再起動を全て試みた", "サポートの指示に従ったが解決しなかった"],
    action: "調査後 → 技術的不具合が確認された場合に返金確約",
    currentScore: 0.750,
    projectedScore: 0.930,
  },
];

const refundIneligibleCases = [
  {
    title: "単純な未使用・気が変わった",
    description: "技術的な問題なく、単に使用しなかった・不要になった場合",
    reason: "デジタルコンテンツの性質上、返金不可（特定商取引法第15条の3）",
  },
  {
    title: "接続設定ミス（サポートで解決可能）",
    description: "データローミングのオフ、APN設定漏れなど、設定変更で解決できる場合",
    reason: "技術的不具合ではなく、設定サポートで解決可能",
  },
  {
    title: "有効期限切れ後の申請",
    description: "プランの有効期限が切れた後に返金を申請した場合",
    reason: "サービスの提供は完了しているため返金不可",
  },
  {
    title: "誤プラン購入（代替案あり）",
    description: "誤って別のプランを購入したが、代替案（プラン変更等）が提供可能な場合",
    reason: "代替案の提供で対応。返金ではなくプラン調整を優先",
  },
];

const scoreData = [
  { category: "返金（REFUND）全体",      current: 0.920, projected: 0.965, change: "+0.045", isPercent: false },
  { category: "セッション解決率（返金）", current: 55.6,  projected: 92.0,  change: "+36.4pt", isPercent: true },
  { category: "全体平均スコア",           current: 0.930, projected: 0.948, change: "+0.018", isPercent: false },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function Refund() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: incidentsData, isLoading: incidentsLoading } = trpc.plans.incidents.useQuery({
    limit: 100,
    offset: 0,
    status: statusFilter as any,
  });
  const incidents = incidentsData?.items ?? [];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">返金管理 / Refund Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            自動返金対応フロー・対象ケース・AIスコア予測・インシデント一覧
          </p>
        </div>

        {/* ── Flow diagram ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              自動返金フロー
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <FlowDiagram />
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Heartbeatジョブが15分ごとにeSIM状態を確認し、異常を検知すると自動でStripe返金とメール通知を実行します。
            </p>
          </CardContent>
        </Card>

        {/* ── Score prediction ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              自動返金実装後のスコア予測
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">カテゴリ</TableHead>
                    <TableHead className="text-center w-28">現在</TableHead>
                    <TableHead className="text-center w-28">実装後（予測）</TableHead>
                    <TableHead className="text-center w-24">変化</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoreData.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell className="font-medium text-sm">{row.category}</TableCell>
                      <TableCell className="text-center">
                        <ScoreBadge score={row.current} isPercent={row.isPercent} />
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreBadge score={row.projected} isPercent={row.isPercent} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-600 font-semibold text-xs">{row.change}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Eligible cases ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <h2 className="text-base font-semibold">返金対象ケース</h2>
            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-50 text-xs font-medium">
              自動対応予定
            </Badge>
          </div>
          <div className="flex flex-col gap-3">
            {refundEligibleCases.map((c) => (
              <Card key={c.id} className="border-l-4 border-l-emerald-400">
                <CardContent className="pt-5 pb-5">
                  {/* Title row */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{c.title}</span>
                        <span className="text-xs text-muted-foreground">/ {c.titleEn}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.examples.map((ex, i) => (
                          <span key={i} className="text-xs bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full border">
                            {ex}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-start gap-1.5 text-xs">
                        <span className="font-medium text-blue-600 flex-shrink-0">対応フロー:</span>
                        <span className="text-muted-foreground">{c.action}</span>
                      </div>
                    </div>
                    {/* Score badges */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0">
                      <div className="flex sm:flex-col items-center sm:items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">現在</span>
                        <ScoreBadge score={c.currentScore} />
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">実装後</span>
                        <ScoreBadge score={c.projectedScore} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Ineligible cases ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <h2 className="text-base font-semibold">返金対象外ケース</h2>
            <Badge className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-50 text-xs font-medium">
              現状維持
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {refundIneligibleCases.map((c, i) => (
              <Card key={i} className="border-l-4 border-l-red-300">
                <CardContent className="pt-5 pb-5 space-y-2">
                  <div className="font-semibold text-sm">{c.title}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                  <div className="flex items-start gap-1.5 text-xs pt-1">
                    <span className="font-medium text-red-500 flex-shrink-0">理由:</span>
                    <span className="text-muted-foreground leading-relaxed">{c.reason}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Legal basis ── */}
        <div className="flex items-start gap-3 rounded-xl border bg-amber-50/50 border-amber-200 p-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">法的根拠：</span>
            特定商取引法第15条の3に基づき、デジタルコンテンツ（eSIM）は提供開始後の返金は原則不可。
            ただし、事業者側の技術的不具合・二重課金・未発行等のシステムエラーによる場合は例外として返金対応を行う。
            自動返金対応の実装により、例外ケースの検知・対応を迅速化し、顧客満足度とAIスコアの向上を図る。
          </p>
        </div>

        {/* ── Implementation overview ── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">自動返金実装概要</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-sm">自動返金トリガー条件</CardTitle>
              </CardHeader>
              <CardContent className="pb-5 space-y-4">
                {[
                  { color: "bg-amber-400",  label: "provisioning_failed",  desc: "OMAXステータスが error" },
                  { color: "bg-orange-400", label: "activation_timeout",   desc: "not_installed かつ購入から1時間経過" },
                  { color: "bg-red-400",    label: "esim_expired_early",   desc: "期待使用期間の80%未満で失効" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${item.color}`} />
                    <div>
                      <code className="text-xs font-mono font-semibold">{item.label}</code>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-sm">処理フロー</CardTitle>
              </CardHeader>
              <CardContent className="pb-5 space-y-4">
                {[
                  { num: "①", color: "text-indigo-500", text: "Heartbeat (15分間隔) でeSIM状態をOMAX APIに問い合わせ" },
                  { num: "②", color: "text-purple-500", text: "異常検知 → esim_incidents テーブルに記録" },
                  { num: "③", color: "text-emerald-500", text: "Stripe refunds.create() で小売価格を全額返金" },
                  { num: "④", color: "text-blue-500", text: "Resend でユーザーに返金完了メール（日英）を送信" },
                ].map((item) => (
                  <div key={item.num} className="flex items-start gap-3">
                    <span className={`text-sm font-bold flex-shrink-0 ${item.color}`}>{item.num}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                ))}
                <div className="rounded-lg bg-muted/50 border px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                  OMAX卸値はOMAX側で自動返金。chat.yah.mobi はStripe経由の小売価格返金のみ担当。
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Incidents table ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              インシデント一覧
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
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
          </CardHeader>
          <CardContent className="pb-5">
            {incidentsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="font-medium text-sm">インシデントなし</p>
                <p className="text-xs">現在、返金対象のeSIMインシデントはありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">ID</TableHead>
                      <TableHead className="min-w-[140px]">ICCID</TableHead>
                      <TableHead className="min-w-[160px]">種別</TableHead>
                      <TableHead className="min-w-[120px]">OMAXステータス</TableHead>
                      <TableHead className="text-right w-24">返金額</TableHead>
                      <TableHead className="w-24">ステータス</TableHead>
                      <TableHead className="min-w-[160px]">検知日時</TableHead>
                      <TableHead className="min-w-[160px]">解決日時</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{inc.id}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[140px] truncate" title={inc.iccid ?? ""}>
                          {inc.iccid ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono whitespace-nowrap">
                            {inc.incidentType.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{inc.omaxStatus ?? "—"}</TableCell>
                        <TableCell className="text-xs text-right font-medium whitespace-nowrap">
                          {inc.refundAmountYen != null ? `¥${inc.refundAmountYen.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell><IncidentStatusBadge status={inc.refundStatus} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {inc.detectedAt ? new Date(inc.detectedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
