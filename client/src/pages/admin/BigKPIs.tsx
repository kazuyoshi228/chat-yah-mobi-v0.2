import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Clock,
  Headphones,
  Bot,
  Users,
  MessageCircle,
  CheckCircle,
  XCircle,
  Star,
  BarChart2,
  TrendingUp,
  Activity,
  Zap,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
type Period = "all" | "today" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = {
  all: "All Time",
  today: "Today",
  week: "Last 7 Days",
  month: "This Month",
};

const LANG_LABEL: Record<string, string> = {
  ja: "日本語", en: "English", zh: "中文", ko: "한국어",
  th: "ภาษาไทย", vi: "Tiếng Việt", unknown: "Unknown",
};

const PIE_COLORS = ["#111", "#6b7280", "#d1d5db", "#f3f4f6", "#e5e7eb"];

function periodToRange(period: Period): { since?: number; until?: number } {
  const now = Date.now();
  if (period === "today") return { since: new Date().setHours(0, 0, 0, 0), until: now };
  if (period === "week") return { since: now - 7 * 24 * 60 * 60 * 1000, until: now };
  if (period === "month") return { since: now - 30 * 24 * 60 * 60 * 1000, until: now };
  return {};
}

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function RateBar({ rate, color }: { rate: number | null; color: string }) {
  if (rate === null) return <p className="text-xs text-muted-foreground mt-1">No data</p>;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{rate}%</span>
        <span className="text-xs text-muted-foreground/50">100%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

function MetricBar({ value, max = 100, color = "#111" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function StatCard({
  label, value, sub, accent, icon: Icon,
}: {
  label: string; value: string | number; sub?: string;
  accent?: "green" | "amber" | "red" | "blue";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const accentClass = accent === "green" ? "text-emerald-600" : accent === "amber" ? "text-amber-500" : accent === "red" ? "text-red-500" : accent === "blue" ? "text-blue-600" : "";
  return (
    <Card className="border shadow-none">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 mb-1">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className={`text-2xl font-semibold mt-0.5 ${accentClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Big KPI Card (top 3) ───────────────────────────────────────────────────────
function BigKpiCard({
  rank, title, value, sub, status, description, target, icon: Icon, colorClass,
}: {
  rank: number; title: string; value: string; sub?: string;
  status: "good" | "warn" | "bad" | "neutral";
  description: string; target?: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}) {
  const statusConfig = {
    good:    { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400", label: "Good" },
    warn:    { badge: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-400",   label: "Needs Attention" },
    bad:     { badge: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-400",     label: "Action Required" },
    neutral: { badge: "bg-slate-50 text-slate-600 border-slate-200",       dot: "bg-slate-300",   label: "No Data" },
  }[status];

  return (
    <Card className={`relative overflow-hidden border-2 ${status === "bad" ? "border-red-200" : status === "warn" ? "border-amber-200" : "border-transparent"}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${statusConfig.dot}`} />
      <CardContent className="pt-5 pb-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass}`}>#{rank}</span>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusConfig.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${colorClass.includes("indigo") ? "text-indigo-500" : colorClass.includes("blue") ? "text-blue-500" : "text-emerald-500"}`} />
              <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            {target && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">Target:</span> {target}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-4xl font-bold tabular-nums leading-none ${status === "good" ? "text-emerald-600" : status === "warn" ? "text-amber-500" : status === "bad" ? "text-red-500" : "text-muted-foreground"}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function BigKPIs() {
  const [period, setPeriod] = useState<Period>("all");

  const { data: kpi, isLoading: kpiLoading } = trpc.admin.getKpi.useQuery({ period });
  const { data: activeCounts, isLoading: countsLoading } = trpc.admin.getActiveCounts.useQuery(
    undefined, { refetchInterval: 15000 }
  );
  const { data: analysis, isLoading: analysisLoading } = trpc.admin.getAnalysis.useQuery({ period });
  const scoreRange = useMemo(() => periodToRange(period), [period]);
  const { data: scorecard, isLoading: scoreLoading } = trpc.admin.getTeamScorecard.useQuery(scoreRange);

  // ── Derived values ──────────────────────────────────────────────────────────
  const aiResolvedRate = kpi?.aiResolvedRate ?? null;
  const heroTarget = 99.9;
  const heroGap = aiResolvedRate !== null ? (heroTarget - aiResolvedRate).toFixed(1) : null;
  const heroColor = aiResolvedRate === null ? "neutral" : aiResolvedRate >= 99 ? "good" : aiResolvedRate >= 85 ? "warn" : "bad";

  const endedTotal = (kpi?.aiResolved ?? 0) + (kpi?.operatorResolved ?? 0);
  const aiHandledRate = endedTotal > 0 ? Math.round(((kpi?.aiResolved ?? 0) / endedTotal) * 100) : null;
  const opHandledRate = endedTotal > 0 ? Math.round(((kpi?.operatorResolved ?? 0) / endedTotal) * 100) : null;

  const totalSessions = kpi?.total ?? 0;
  const surveysAnswered = kpi?.surveyCount ?? 0;
  const surveyResponseRate = totalSessions > 0 ? Math.round((surveysAnswered / totalSessions) * 100) : null;
  const surveyStatus: "good" | "warn" | "bad" | "neutral" = surveyResponseRate === null ? "neutral" : surveyResponseRate >= 40 ? "good" : surveyResponseRate >= 20 ? "warn" : "bad";

  const formRedirectRate = kpi?.formRedirectRate ?? null;
  const formStatus: "good" | "warn" | "bad" | "neutral" = formRedirectRate === null ? "neutral" : formRedirectRate <= 5 ? "good" : formRedirectRate <= 15 ? "warn" : "bad";

  const langData = (analysis?.languageBreakdown ?? []).map((l) => ({
    name: LANG_LABEL[l.language] ?? l.language,
    count: l.count,
  }));

  const dailyData = (analysis?.dailyTrend ?? []).map((d) => ({
    date: d.date.slice(5),
    Total: (d.ai ?? 0) + (d.operator ?? 0),
  }));

  const isLoading = kpiLoading || countsLoading;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 p-6 max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Big KPIs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              最重要指標・チャット状況・詳細分析の統合ビュー
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(["all", "today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1: Big KPIs — Adminが必ず確認すべき最重要3項目
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-semibold">Big KPIs — 最重要3項目</h2>
            <span className="text-xs text-muted-foreground">Adminが毎日確認すべき指標</span>
          </div>

          {kpiLoading ? (
            <div className="grid gap-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid gap-3">
              {/* KPI #1: AI自己解決率 */}
              <BigKpiCard
                rank={1}
                title="AI Self-Resolution Rate（AI自己解決率）"
                value={aiResolvedRate !== null ? `${aiResolvedRate}%` : "—"}
                sub={heroGap !== null ? (Number(heroGap) <= 0 ? `✓ ${Math.abs(Number(heroGap))}% above target` : `${heroGap}% to target`) : undefined}
                status={heroColor}
                description="AIがオペレーター介入なしにチャットを解決した割合。サービス品質と運用コストの最重要指標。低下時はRAGドキュメントの更新・AIプロンプト改善が必要。"
                target={`${heroTarget}%`}
                icon={Bot}
                colorClass="bg-indigo-100 text-indigo-700"
              />

              {/* KPI #2: Survey Response Rate */}
              <BigKpiCard
                rank={2}
                title="Survey Response Rate（アンケート回答率）"
                value={surveyResponseRate !== null ? `${surveyResponseRate}%` : "—"}
                sub={surveysAnswered > 0 ? `${surveysAnswered} / ${totalSessions} sessions` : "No surveys yet"}
                status={surveyStatus}
                description="チャット終了後のアンケートに回答したユーザーの割合。20%未満だとKPI信頼性が低下し、AI自己解決率の精度が担保できなくなる。低下時はアンケート導線の見直しが必要。"
                target="≥ 40%"
                icon={Star}
                colorClass="bg-blue-100 text-blue-700"
              />

              {/* KPI #3: Form Redirect Rate */}
              <BigKpiCard
                rank={3}
                title="Form Redirect Rate（フォーム転送率）"
                value={formRedirectRate !== null ? `${formRedirectRate}%` : "—"}
                sub={kpi?.formRedirectedCount ? `${kpi.formRedirectedCount} sessions redirected` : "No redirects yet"}
                status={formStatus}
                description="AIがユーザーをサポートフォームに誘導した割合。高い場合はAIが問題を自己解決できていないことを示す。RAGドキュメントの充実やフロー改善で低下させることが目標。"
                target="≤ 5%"
                icon={Zap}
                colorClass="bg-emerald-100 text-emerald-700"
              />
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2: 対応必要（リアルタイム）
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold">対応必要（リアルタイム）</h2>
            <span className="text-xs text-muted-foreground">15秒ごとに自動更新</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/chats?status=waiting">
              <div className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${(activeCounts?.waiting ?? 0) > 0 ? "border-red-300 bg-red-50" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-medium text-muted-foreground">Waiting</span>
                  </div>
                  {(activeCounts?.waiting ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                {countsLoading ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <p className={`text-5xl font-bold tabular-nums ${(activeCounts?.waiting ?? 0) > 0 ? "text-red-600" : "text-muted-foreground/30"}`}>
                    {activeCounts?.waiting ?? 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">オペレーター待ち</p>
              </div>
            </Link>
            <Link href="/admin/chats?status=active">
              <div className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${(activeCounts?.active ?? 0) > 0 ? "border-blue-300 bg-blue-50" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-muted-foreground">Active</span>
                  </div>
                  {(activeCounts?.active ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                </div>
                {countsLoading ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <p className={`text-5xl font-bold tabular-nums ${(activeCounts?.active ?? 0) > 0 ? "text-blue-600" : "text-muted-foreground/30"}`}>
                    {activeCounts?.active ?? 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">対応中</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 3: Volume & Quality KPIs
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Volume & Quality</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard label="Total Chats" value={kpi?.total ?? 0} sub={PERIOD_LABELS[period]} icon={MessageCircle} />
              <StatCard
                label="CSAT Score"
                value={scorecard?.avgCsat != null ? `${scorecard.avgCsat.toFixed(1)} / 5` : "—"}
                sub={`${surveysAnswered} responses`}
                icon={Star}
                accent={scorecard?.avgCsat != null ? (scorecard.avgCsat >= 4 ? "green" : scorecard.avgCsat >= 3 ? "amber" : "red") : undefined}
              />
              <StatCard
                label="Overall Resolution Rate"
                value={kpi?.resolvedRate != null ? `${kpi.resolvedRate}%` : "—"}
                sub="survey-confirmed"
                icon={CheckCircle}
                accent={kpi?.resolvedRate != null ? (kpi.resolvedRate >= 80 ? "green" : kpi.resolvedRate >= 60 ? "amber" : "red") : undefined}
              />
              <StatCard label="AI Handled" value={kpi?.aiResolved ?? 0} sub={aiHandledRate !== null ? `${aiHandledRate}% of ended` : undefined} icon={Bot} accent="blue" />
              <StatCard label="Operator Handled" value={kpi?.operatorResolved ?? 0} sub={opHandledRate !== null ? `${opHandledRate}% of ended` : undefined} icon={Users} />
              <StatCard label="Unresolved" value={kpi?.unresolvedCount ?? 0} sub="survey-reported" icon={XCircle} accent={kpi?.unresolvedCount ? "red" : undefined} />
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 4: Quality Scorecard
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Quality Scorecard</h2>
            <span className="text-xs text-muted-foreground">Bot-first composite score</span>
          </div>
          <Card className="border shadow-none">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-muted-foreground">Composite Score (CSAT · Resolution · AI Rate · Redirect Rate)</p>
                </div>
                {scoreLoading ? (
                  <Skeleton className="h-10 w-24 rounded-lg" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-4xl font-bold tabular-nums ${(scorecard?.totalScore ?? 0) >= 80 ? "text-emerald-600" : (scorecard?.totalScore ?? 0) >= 60 ? "text-amber-500" : "text-red-500"}`}>
                      {scorecard?.totalScore ?? 0}
                    </span>
                    <span className="text-lg text-muted-foreground">/100</span>
                    <Badge variant={(scorecard?.totalScore ?? 0) >= 80 ? "default" : (scorecard?.totalScore ?? 0) >= 60 ? "secondary" : "destructive"} className="text-xs">
                      {(scorecard?.totalScore ?? 0) >= 80 ? "Good" : (scorecard?.totalScore ?? 0) >= 60 ? "Fair" : "Needs Work"}
                    </Badge>
                  </div>
                )}
              </div>
              {scoreLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground">CSAT Score</p>
                    <p className="text-xl font-semibold mt-1">
                      {scorecard?.avgCsat != null ? scorecard.avgCsat.toFixed(1) : "—"}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">/5</span>
                    </p>
                    <MetricBar value={scorecard?.avgCsat ?? 0} max={5} color="#111" />
                    <p className="text-[10px] text-muted-foreground mt-1">Weight: 35%</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground">Resolution Rate</p>
                    <p className="text-xl font-semibold mt-1">
                      {scorecard?.resolutionRate != null ? `${Math.round(scorecard.resolutionRate * 100)}%` : "—"}
                    </p>
                    <MetricBar value={(scorecard?.resolutionRate ?? 0) * 100} color="#2563eb" />
                    <p className="text-[10px] text-muted-foreground mt-1">Weight: 30%</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground">AI Handling Rate</p>
                    <p className="text-xl font-semibold mt-1">
                      {scorecard?.totalSessions && scorecard.totalSessions > 0 ? `${Math.round((scorecard.aiHandled / scorecard.totalSessions) * 100)}%` : "—"}
                    </p>
                    <MetricBar value={scorecard?.totalSessions ? (scorecard.aiHandled / scorecard.totalSessions) * 100 : 0} color="#7c3aed" />
                    <p className="text-[10px] text-muted-foreground mt-1">Weight: 25%</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground">Form Redirect Rate</p>
                    <p className="text-xl font-semibold mt-1">
                      {formRedirectRate !== null ? `${formRedirectRate}%` : "—"}
                    </p>
                    <MetricBar value={formRedirectRate !== null ? Math.max(0, 100 - formRedirectRate * 4) : 0} color="#059669" />
                    <p className="text-[10px] text-muted-foreground mt-1">Weight: 10% (lower is better)</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 5: Bot Health
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Bot Health</h2>
          </div>
          {kpiLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Avg AI Messages / Session"
                value={kpi?.avgAiMessagesPerSession != null ? kpi.avgAiMessagesPerSession : "—"}
                sub="ended sessions only"
                accent={kpi?.avgAiMessagesPerSession != null ? (kpi.avgAiMessagesPerSession >= 3 && kpi.avgAiMessagesPerSession <= 8 ? "green" : "amber") : undefined}
              />
              <StatCard
                label="Avg Session Duration"
                value={fmtMs(kpi?.avgSessionDurationMs ?? null)}
                sub="start to last message"
              />
              <StatCard
                label="AI-Only Sessions"
                value={analysis ? `${analysis.aiCount}` : "—"}
                sub={analysis && analysis.total > 0 ? `${Math.round((analysis.aiCount / analysis.total) * 100)}% of total` : undefined}
                accent="blue"
              />
              <StatCard
                label="Operator-Assisted"
                value={analysis ? `${analysis.operatorCount}` : "—"}
                sub={analysis && analysis.total > 0 ? `${Math.round((analysis.operatorCount / analysis.total) * 100)}% of total` : undefined}
                accent={analysis && analysis.total > 0 && (analysis.operatorCount / analysis.total) < 0.05 ? "green" : "amber"}
              />
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 6: Charts
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Volume */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Chat Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : dailyData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyData} margin={{ left: 0, right: 16, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Total" stroke="#111" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Language Distribution */}
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Language Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : langData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={langData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(v: number) => [`${v} chats`]} />
                    <Bar dataKey="count" fill="#111" radius={[0, 4, 4, 0]}>
                      {langData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 7: Inquiry Category Breakdown
        ══════════════════════════════════════════════════════════════════════ */}
        {(analysis?.categoryBreakdown?.length ?? 0) > 0 && (
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Inquiry Category Breakdown
                {analysis?.analyzedMessageCount ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (based on {analysis.analyzedMessageCount} visitor messages)
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis!.categoryBreakdown.map((cat, i) => {
                  const total = analysis!.categoryBreakdown.reduce((s, c) => s + c.count, 0);
                  const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                  const barColors = ["#111", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"];
                  return (
                    <div key={`${cat.category}-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <span className="text-xs text-muted-foreground">{cat.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColors[i % barColors.length] === "#e5e7eb" ? "#9ca3af" : barColors[i % barColors.length] }} />
                      </div>
                      {cat.examples.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {cat.examples.map((ex, j) => (
                            <p key={j} className="text-xs text-muted-foreground truncate pl-1 border-l-2 border-border">{ex}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
