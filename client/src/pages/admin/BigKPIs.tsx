import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Bot, Clock, Headphones, Users, MessageCircle, CheckCircle,
  XCircle, Star, Target, Activity, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
type Period = "all" | "today" | "week" | "month";
const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "7 Days" },
  { key: "month", label: "30 Days" },
];

const LANG_LABELS: Record<string, string> = {
  ja: "日本語", en: "English", zh: "中文", ko: "한국어",
  th: "ไทย", vi: "Tiếng Việt", unknown: "Other",
};

const BAR_COLORS = ["#111", "#374151", "#6b7280", "#9ca3af", "#d1d5db"];

function periodToRange(p: Period) {
  const now = Date.now();
  if (p === "today") return { since: new Date().setHours(0, 0, 0, 0), until: now };
  if (p === "week") return { since: now - 7 * 86400000, until: now };
  if (p === "month") return { since: now - 30 * 86400000, until: now };
  return {};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(n: number | null | undefined, fallback = "—") {
  return n != null ? `${n}%` : fallback;
}

function fmtMs(ms: number | null | undefined) {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = "#111" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
      />
    </div>
  );
}

function KpiStatus({ status }: { status: "good" | "warn" | "bad" | "none" }) {
  if (status === "none") return null;
  const cfg = {
    good: { label: "Good", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    warn: { label: "Attention", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    bad: { label: "Action Required", cls: "bg-red-50 text-red-700 border-red-200" },
  }[status];
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BigKPIs() {
  const [period, setPeriod] = useState<Period>("all");
  const range = useMemo(() => periodToRange(period), [period]);

  const { data: kpi, isLoading: kpiL } = trpc.admin.getKpi.useQuery({ period });
  const { data: counts, isLoading: countsL } = trpc.admin.getActiveCounts.useQuery(undefined, { refetchInterval: 15000 });
  const { data: analysis, isLoading: analysisL } = trpc.admin.getAnalysis.useQuery({ period });
  const { data: scorecard, isLoading: scoreL } = trpc.admin.getTeamScorecard.useQuery(range);

  // Derived
  const aiRate = kpi?.aiResolvedRate ?? null;
  const totalSessions = kpi?.total ?? 0;
  const surveyCount = kpi?.surveyCount ?? 0;
  const surveyRate = totalSessions > 0 ? Math.round((surveyCount / totalSessions) * 100) : null;
  const formRate = kpi?.formRedirectRate ?? null;

  const endedTotal = (kpi?.aiResolved ?? 0) + (kpi?.operatorResolved ?? 0);
  const aiPct = endedTotal > 0 ? Math.round(((kpi?.aiResolved ?? 0) / endedTotal) * 100) : null;
  const opPct = endedTotal > 0 ? Math.round(((kpi?.operatorResolved ?? 0) / endedTotal) * 100) : null;

  const langData = (analysis?.languageBreakdown ?? []).map((l) => ({
    name: LANG_LABELS[l.language] ?? l.language, count: l.count,
  }));
  const dailyData = (analysis?.dailyTrend ?? []).map((d) => ({
    date: d.date.slice(5), total: (d.ai ?? 0) + ((d as any).admin ?? 0),
  }));

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">

        {/* Header + Period */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Big KPIs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">最重要指標・リアルタイム状況・品質スコア</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  period === p.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ SECTION 1: Big KPIs (Top 3) ═══ */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">最重要3項目</h2>
          </div>

          {kpiL ? (
            <div className="grid gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : (
            <div className="grid gap-3">
              {/* #1 AI Self-Resolution */}
              <Card className={cn("border-l-4", aiRate == null ? "border-l-slate-200" : aiRate >= 99 ? "border-l-emerald-400" : aiRate >= 85 ? "border-l-amber-400" : "border-l-red-400")}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold">#1 AI Self-Resolution Rate</span>
                        <KpiStatus status={aiRate == null ? "none" : aiRate >= 99 ? "good" : aiRate >= 85 ? "warn" : "bad"} />
                      </div>
                      <p className="text-xs text-muted-foreground">目標 99.9% — AIがオペレーター介入なしに解決した割合</p>
                    </div>
                    <span className={cn("text-3xl font-bold tabular-nums", aiRate == null ? "text-muted-foreground" : aiRate >= 99 ? "text-emerald-600" : aiRate >= 85 ? "text-amber-500" : "text-red-500")}>
                      {pct(aiRate)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* #2 Survey Response Rate */}
              <Card className={cn("border-l-4", surveyRate == null ? "border-l-slate-200" : surveyRate >= 40 ? "border-l-emerald-400" : surveyRate >= 20 ? "border-l-amber-400" : "border-l-red-400")}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold">#2 Survey Response Rate</span>
                        <KpiStatus status={surveyRate == null ? "none" : surveyRate >= 40 ? "good" : surveyRate >= 20 ? "warn" : "bad"} />
                      </div>
                      <p className="text-xs text-muted-foreground">目標 ≥40% — {surveyCount}/{totalSessions} sessions</p>
                    </div>
                    <span className={cn("text-3xl font-bold tabular-nums", surveyRate == null ? "text-muted-foreground" : surveyRate >= 40 ? "text-emerald-600" : surveyRate >= 20 ? "text-amber-500" : "text-red-500")}>
                      {pct(surveyRate)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* #3 Form Redirect Rate */}
              <Card className={cn("border-l-4", formRate == null ? "border-l-slate-200" : formRate <= 5 ? "border-l-emerald-400" : formRate <= 15 ? "border-l-amber-400" : "border-l-red-400")}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-semibold">#3 Form Redirect Rate</span>
                        <KpiStatus status={formRate == null ? "none" : formRate <= 5 ? "good" : formRate <= 15 ? "warn" : "bad"} />
                      </div>
                      <p className="text-xs text-muted-foreground">目標 ≤5% — AIが解決できずフォームに転送した割合</p>
                    </div>
                    <span className={cn("text-3xl font-bold tabular-nums", formRate == null ? "text-muted-foreground" : formRate <= 5 ? "text-emerald-600" : formRate <= 15 ? "text-amber-500" : "text-red-500")}>
                      {pct(formRate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* ═══ SECTION 2: Real-time ═══ */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">リアルタイム（15秒更新）</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/chats?status=waiting">
              <Card className={cn("cursor-pointer transition-shadow hover:shadow-md border-2", (counts?.waiting ?? 0) > 0 ? "border-red-300 bg-red-50/50" : "border-transparent")}>
                <CardContent className="py-5 px-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-medium text-muted-foreground">Waiting</span>
                    {(counts?.waiting ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  </div>
                  {countsL ? <Skeleton className="h-10 w-14" /> : (
                    <p className={cn("text-4xl font-bold tabular-nums", (counts?.waiting ?? 0) > 0 ? "text-red-600" : "text-muted-foreground/30")}>
                      {counts?.waiting ?? 0}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/chats?status=active">
              <Card className={cn("cursor-pointer transition-shadow hover:shadow-md border-2", (counts?.active ?? 0) > 0 ? "border-blue-300 bg-blue-50/50" : "border-transparent")}>
                <CardContent className="py-5 px-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-muted-foreground">Active</span>
                    {(counts?.active ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                  </div>
                  {countsL ? <Skeleton className="h-10 w-14" /> : (
                    <p className={cn("text-4xl font-bold tabular-nums", (counts?.active ?? 0) > 0 ? "text-blue-600" : "text-muted-foreground/30")}>
                      {counts?.active ?? 0}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* ═══ SECTION 3: Volume & Quality ═══ */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Volume & Quality</h2>
          {kpiL ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card><CardContent className="py-4 px-4">
                <div className="flex items-center gap-1.5 mb-1"><MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total Chats</span></div>
                <p className="text-2xl font-semibold">{kpi?.total ?? 0}</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <div className="flex items-center gap-1.5 mb-1"><Star className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">CSAT</span></div>
                <p className={cn("text-2xl font-semibold", scorecard?.avgCsat != null ? (scorecard.avgCsat >= 4 ? "text-emerald-600" : scorecard.avgCsat >= 3 ? "text-amber-500" : "text-red-500") : "")}>
                  {scorecard?.avgCsat != null ? `${scorecard.avgCsat.toFixed(1)}/5` : "—"}
                </p>
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <div className="flex items-center gap-1.5 mb-1"><CheckCircle className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Resolution Rate</span></div>
                <p className={cn("text-2xl font-semibold", kpi?.resolvedRate != null ? (kpi.resolvedRate >= 80 ? "text-emerald-600" : kpi.resolvedRate >= 60 ? "text-amber-500" : "text-red-500") : "")}>
                  {pct(kpi?.resolvedRate)}
                </p>
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <div className="flex items-center gap-1.5 mb-1"><Bot className="w-3.5 h-3.5 text-blue-500" /><span className="text-xs text-muted-foreground">AI Handled</span></div>
                <p className="text-2xl font-semibold text-blue-600">{kpi?.aiResolved ?? 0}</p>
                {aiPct != null && <p className="text-xs text-muted-foreground">{aiPct}% of ended</p>}
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <div className="flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Admin Handled</span></div>
                <p className="text-2xl font-semibold">{kpi?.operatorResolved ?? 0}</p>
                {opPct != null && <p className="text-xs text-muted-foreground">{opPct}% of ended</p>}
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <div className="flex items-center gap-1.5 mb-1"><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-muted-foreground">Unresolved</span></div>
                <p className={cn("text-2xl font-semibold", (kpi?.unresolvedCount ?? 0) > 0 ? "text-red-500" : "")}>{kpi?.unresolvedCount ?? 0}</p>
              </CardContent></Card>
            </div>
          )}
        </section>

        {/* ═══ SECTION 4: Quality Scorecard ═══ */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quality Scorecard</h2>
          </div>
          <Card>
            <CardContent className="py-5 px-5">
              {scoreL ? <Skeleton className="h-32 w-full rounded-lg" /> : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs text-muted-foreground">Composite Score (CSAT 35% + Resolution 30% + AI Rate 25% + Redirect 10%)</p>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-3xl font-bold tabular-nums", (scorecard?.totalScore ?? 0) >= 80 ? "text-emerald-600" : (scorecard?.totalScore ?? 0) >= 60 ? "text-amber-500" : "text-red-500")}>
                        {scorecard?.totalScore ?? 0}
                      </span>
                      <span className="text-sm text-muted-foreground">/100</span>
                      <Badge variant={(scorecard?.totalScore ?? 0) >= 80 ? "default" : (scorecard?.totalScore ?? 0) >= 60 ? "secondary" : "destructive"} className="text-xs">
                        {(scorecard?.totalScore ?? 0) >= 80 ? "Good" : (scorecard?.totalScore ?? 0) >= 60 ? "Fair" : "Needs Work"}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">CSAT</p>
                      <p className="text-lg font-semibold mt-1">{scorecard?.avgCsat != null ? scorecard.avgCsat.toFixed(1) : "—"}<span className="text-xs text-muted-foreground">/5</span></p>
                      <ProgressBar value={scorecard?.avgCsat ?? 0} max={5} />
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">Resolution</p>
                      <p className="text-lg font-semibold mt-1">{scorecard?.resolutionRate != null ? `${Math.round(scorecard.resolutionRate * 100)}%` : "—"}</p>
                      <ProgressBar value={(scorecard?.resolutionRate ?? 0) * 100} color="#2563eb" />
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">AI Rate</p>
                      <p className="text-lg font-semibold mt-1">{scorecard?.totalSessions ? `${Math.round((scorecard.aiHandled / scorecard.totalSessions) * 100)}%` : "—"}</p>
                      <ProgressBar value={scorecard?.totalSessions ? (scorecard.aiHandled / scorecard.totalSessions) * 100 : 0} color="#7c3aed" />
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-[11px] text-muted-foreground">Redirect (lower=better)</p>
                      <p className="text-lg font-semibold mt-1">{pct(formRate)}</p>
                      <ProgressBar value={formRate != null ? Math.max(0, 100 - formRate * 4) : 0} color="#059669" />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ═══ SECTION 5: Bot Health ═══ */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bot Health</h2>
          {kpiL ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="py-4 px-4">
                <p className="text-xs text-muted-foreground mb-1">Avg AI Msgs/Session</p>
                <p className="text-xl font-semibold">{kpi?.avgAiMessagesPerSession ?? "—"}</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Duration</p>
                <p className="text-xl font-semibold">{fmtMs(kpi?.avgSessionDurationMs)}</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <p className="text-xs text-muted-foreground mb-1">AI-Only Sessions</p>
                <p className="text-xl font-semibold text-blue-600">{analysis?.aiCount ?? "—"}</p>
                {analysis && analysis.total > 0 && <p className="text-xs text-muted-foreground">{Math.round((analysis.aiCount / analysis.total) * 100)}%</p>}
              </CardContent></Card>
              <Card><CardContent className="py-4 px-4">
                <p className="text-xs text-muted-foreground mb-1">Admin-Assisted</p>
                <p className="text-xl font-semibold">{analysis?.operatorCount ?? "—"}</p>
                {analysis && analysis.total > 0 && <p className="text-xs text-muted-foreground">{Math.round((analysis.operatorCount / analysis.total) * 100)}%</p>}
              </CardContent></Card>
            </div>
          )}
        </section>

        {/* ═══ SECTION 6: Charts ═══ */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Daily Chat Volume</CardTitle></CardHeader>
            <CardContent>
              {analysisL ? <Skeleton className="h-44 w-full rounded-lg" /> : dailyData.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={176}>
                  <LineChart data={dailyData} margin={{ left: 0, right: 12, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#111" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Language Distribution</CardTitle></CardHeader>
            <CardContent>
              {analysisL ? <Skeleton className="h-44 w-full rounded-lg" /> : langData.length === 0 ? (
                <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={176}>
                  <BarChart data={langData} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(v: number) => [`${v} chats`]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {langData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ═══ SECTION 7: Category Breakdown (conditional) ═══ */}
        {(analysis?.categoryBreakdown?.length ?? 0) > 0 && (
          <section>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Inquiry Categories
                  {analysis?.analyzedMessageCount ? <span className="ml-2 text-xs font-normal text-muted-foreground">({analysis.analyzedMessageCount} messages)</span> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis!.categoryBreakdown.map((cat, i) => {
                  const total = analysis!.categoryBreakdown.reduce((s, c) => s + c.count, 0);
                  const p = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                  return (
                    <div key={`${cat.category}-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <span className="text-xs text-muted-foreground">{cat.count} ({p}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      </div>
                      {cat.examples.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {cat.examples.map((ex, j) => (
                            <p key={j} className="text-xs text-muted-foreground truncate pl-2 border-l-2 border-border">{ex}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}
