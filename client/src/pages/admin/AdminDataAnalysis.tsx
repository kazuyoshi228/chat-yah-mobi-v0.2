import DashboardLayout from "@/components/DashboardLayout";
import { YahLogo } from "@/components/YahLogo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

type Period = "all" | "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  all: "All Time",
  today: "Today",
  week: "Last 7 Days",
  month: "This Month",
};

const LANG_LABEL: Record<string, string> = {
  ja: "日本語", en: "English", zh: "中文", ko: "한국어", th: "ภาษาไทย", vi: "Tiếng Việt", unknown: "Unknown",
};

const PIE_COLORS = ["#111", "#6b7280", "#d1d5db", "#f3f4f6", "#e5e7eb"];
const CATEGORY_COLORS = ["#111", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb"];
const CATEGORY_LABELS: Record<string, string> = {
  error_screen: "Error Screen",
  product: "Product",
  billing: "Billing",
  account: "Account",
  ui_feedback: "UI Feedback",
  document: "Document",
  other: "Other",
  uncategorized: "Uncategorized",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "amber" | "red" | "blue";
}) {
  const accentClass =
    accent === "green" ? "text-emerald-600" :
    accent === "amber" ? "text-amber-500" :
    accent === "red" ? "text-red-500" :
    accent === "blue" ? "text-blue-600" :
    "";
  return (
    <Card className="border border-gray-100 shadow-none">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${accentClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MetricBar({ value, max = 100, color = "#111" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

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

export default function AdminDataAnalysis() {
  const [period, setPeriod] = useState<Period>("all");
  const { data, isLoading } = trpc.admin.getAnalysis.useQuery({ period });
  const { data: imgData, isLoading: imgLoading } = trpc.admin.getImageAnalytics.useQuery({ period: period as "today" | "week" | "month" | "all" });

  const scoreRange = useMemo(() => periodToRange(period), [period]);
  const { data: scorecard, isLoading: scoreLoading } = trpc.admin.getTeamScorecard.useQuery(scoreRange);

  const { data: kpi, isLoading: kpiLoading } = trpc.admin.getKpi.useQuery({ period });

  // ── HERO KPI: AI自己解決率 ──────────────────────────────────────────────────
  const aiResolvedRate = kpi?.aiResolvedRate ?? null;
  const heroTarget = 99.9;
  const heroGap = aiResolvedRate !== null ? (heroTarget - aiResolvedRate).toFixed(1) : null;
  const heroColor = aiResolvedRate === null ? "rgba(255,255,255,0.3)" : aiResolvedRate >= 99 ? "#34d399" : aiResolvedRate >= 90 ? "#fbbf24" : "#f87171";

  // ── Survey Response Rate ────────────────────────────────────────────────────
  const totalSessions = kpi?.total ?? 0;
  const surveysAnswered = kpi?.surveyCount ?? 0;
  const surveyResponseRate = totalSessions > 0 ? Math.round((surveysAnswered / totalSessions) * 100) : null;

  // ── Bot-first KPIs ──────────────────────────────────────────────────────────
  const formRedirectRate = kpi?.formRedirectRate ?? null;
  const formRedirectedCount = kpi?.formRedirectedCount ?? 0;
  const avgAiMsgs = kpi?.avgAiMessagesPerSession ?? null;
  const avgSessionMs = kpi?.avgSessionDurationMs ?? null;

  // ── Chart data ──────────────────────────────────────────────────────────────
  const langData = (data?.languageBreakdown ?? []).map((l) => ({
    name: LANG_LABEL[l.language] ?? l.language,
    count: l.count,
  }));

  const hourlyData = (data?.hourlyDistribution ?? []).map((h) => ({
    hour: `${String(h.hour).padStart(2, "0")}:00`,
    count: h.count,
  }));

  const dailyData = (data?.dailyTrend ?? []).map((d) => ({
    date: d.date.slice(5),
    Total: (d.ai ?? 0) + (d.operator ?? 0),
  }));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header + period filter */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <YahLogo height={32} className="text-black" />
            <h1 className="text-xl font-semibold">Data Analysis</h1>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p ? "bg-white shadow-sm text-black" : "text-muted-foreground hover:text-black"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* ── HERO KPI: AI自己解決率 ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-black text-white p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: AI Resolution Rate */}
            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-white/50 mb-1">HERO KPI — AI Self-Resolution Rate</p>
              <div className="flex items-end gap-3">
                {kpiLoading ? (
                  <div className="h-16 w-32 bg-white/10 rounded-lg animate-pulse" />
                ) : (
                  <>
                    <span className="text-7xl font-bold tabular-nums leading-none" style={{ color: heroColor }}>
                      {aiResolvedRate !== null ? `${aiResolvedRate}%` : "—"}
                    </span>
                    <div className="mb-2">
                      <p className="text-sm text-white/60">Target: {heroTarget}%</p>
                      {heroGap !== null && (
                        <p className="text-sm" style={{ color: Number(heroGap) <= 0 ? "#34d399" : "#fbbf24" }}>
                          {Number(heroGap) <= 0 ? `✓ ${Math.abs(Number(heroGap))}% above target` : `${heroGap}% to target`}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-white/40 mt-2">Sessions resolved by AI · based on post-chat surveys</p>
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden w-full md:w-64">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, aiResolvedRate ?? 0)}%`, background: heroColor }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-white/30 mt-0.5 md:w-64">
                <span>0%</span><span>Target {heroTarget}%</span><span>100%</span>
              </div>
            </div>

            {/* Right: Supporting KPIs */}
            <div className="grid grid-cols-2 gap-4 md:text-right">
              {/* Survey Response Rate */}
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-white/40 mb-1">Survey Response Rate</p>
                <p className="text-2xl font-semibold tabular-nums" style={{ color: surveyResponseRate === null ? "rgba(255,255,255,0.3)" : surveyResponseRate >= 40 ? "#34d399" : surveyResponseRate >= 20 ? "#fbbf24" : "#f87171" }}>
                  {surveyResponseRate !== null ? `${surveyResponseRate}%` : "—"}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {surveysAnswered > 0 ? `${surveysAnswered} / ${totalSessions} sessions` : "No surveys yet"}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">Low (&lt;20%) reduces KPI reliability</p>
              </div>

              {/* Form Redirect Rate */}
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-white/40 mb-1">Form Redirect Rate</p>
                <p className="text-2xl font-semibold tabular-nums" style={{ color: formRedirectRate === null ? "rgba(255,255,255,0.3)" : formRedirectRate <= 5 ? "#34d399" : formRedirectRate <= 15 ? "#fbbf24" : "#f87171" }}>
                  {formRedirectRate !== null ? `${formRedirectRate}%` : "—"}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {formRedirectedCount > 0 ? `${formRedirectedCount} sessions redirected` : "No redirects yet"}
                </p>
                <p className="text-[10px] text-white/25 mt-0.5">Lower is better · target &lt;5%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Volume & Quality KPI Row ──────────────────────────────────────── */}
        {kpiLoading || isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Chats" value={data?.total ?? 0} sub="sessions started" />
            <StatCard
              label="CSAT Score"
              value={scorecard?.avgCsat !== null && scorecard?.avgCsat !== undefined ? `${scorecard.avgCsat.toFixed(1)} / 5` : "—"}
              sub={`${surveysAnswered} survey responses`}
              accent={scorecard?.avgCsat !== null && scorecard?.avgCsat !== undefined ? (scorecard.avgCsat >= 4 ? "green" : scorecard.avgCsat >= 3 ? "amber" : "red") : undefined}
            />
            <StatCard
              label="Resolution Rate"
              value={kpi?.resolvedRate !== null && kpi?.resolvedRate !== undefined ? `${kpi.resolvedRate}%` : "—"}
              sub="survey-confirmed resolved"
              accent={kpi?.resolvedRate !== null && kpi?.resolvedRate !== undefined ? (kpi.resolvedRate >= 80 ? "green" : kpi.resolvedRate >= 60 ? "amber" : "red") : undefined}
            />
            <StatCard label="Languages" value={data?.languageBreakdown.length ?? 0} sub="unique languages" />
          </div>
        )}

        {/* ── Bot Health KPI Row ────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Bot Health</h2>
          {kpiLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Avg AI Messages / Session"
                value={avgAiMsgs !== null ? avgAiMsgs : "—"}
                sub="ended sessions only"
                accent={avgAiMsgs !== null ? (avgAiMsgs >= 3 && avgAiMsgs <= 8 ? "green" : "amber") : undefined}
              />
              <StatCard
                label="Avg Session Duration"
                value={fmtMs(avgSessionMs)}
                sub="from start to last message"
              />
              <StatCard
                label="AI-Only Sessions"
                value={data ? `${data.aiCount}` : "—"}
                sub={data && data.total > 0 ? `${Math.round((data.aiCount / data.total) * 100)}% of total` : undefined}
                accent="blue"
              />
              <StatCard
                label="Operator-Assisted"
                value={data ? `${data.operatorCount}` : "—"}
                sub={data && data.total > 0 ? `${Math.round((data.operatorCount / data.total) * 100)}% of total` : undefined}
                accent={data && data.total > 0 && (data.operatorCount / data.total) < 0.05 ? "green" : "amber"}
              />
            </div>
          )}
        </div>

        {/* ── Quality Scorecard ─────────────────────────────────────────────── */}
        <div className="border border-gray-100 rounded-xl p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Quality Scorecard</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Bot-first composite score (CSAT · Resolution · AI Rate · Redirect Rate)</p>
            </div>
            {scoreLoading ? (
              <Skeleton className="h-10 w-20 rounded-lg" />
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-4xl font-bold tabular-nums ${(scorecard?.totalScore ?? 0) >= 80 ? "text-emerald-600" : (scorecard?.totalScore ?? 0) >= 60 ? "text-amber-500" : "text-red-500"}`}>
                  {scorecard?.totalScore ?? 0}
                </span>
                <span className="text-lg text-muted-foreground">/100</span>
                <Badge variant={(scorecard?.totalScore ?? 0) >= 80 ? "default" : (scorecard?.totalScore ?? 0) >= 60 ? "secondary" : "destructive"} className="ml-1 text-xs">
                  {(scorecard?.totalScore ?? 0) >= 80 ? "Good" : (scorecard?.totalScore ?? 0) >= 60 ? "Fair" : "Needs Work"}
                </Badge>
              </div>
            )}
          </div>

          {scoreLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* CSAT */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">CSAT Score</p>
                <p className="text-xl font-semibold mt-1">
                  {scorecard?.avgCsat !== null && scorecard?.avgCsat !== undefined ? scorecard.avgCsat.toFixed(1) : "—"}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">/5</span>
                </p>
                <MetricBar value={scorecard?.avgCsat ?? 0} max={5} color="#111" />
                <p className="text-[10px] text-muted-foreground mt-1">Weight: 35%</p>
              </div>

              {/* Resolution Rate */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">Resolution Rate</p>
                <p className="text-xl font-semibold mt-1">
                  {scorecard?.resolutionRate !== null && scorecard?.resolutionRate !== undefined ? `${Math.round(scorecard.resolutionRate * 100)}%` : "—"}
                </p>
                <MetricBar value={(scorecard?.resolutionRate ?? 0) * 100} color="#2563eb" />
                <p className="text-[10px] text-muted-foreground mt-1">Weight: 30%</p>
              </div>

              {/* AI Rate */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">AI Handling Rate</p>
                <p className="text-xl font-semibold mt-1">
                  {scorecard?.totalSessions && scorecard.totalSessions > 0 ? `${Math.round((scorecard.aiHandled / scorecard.totalSessions) * 100)}%` : "—"}
                </p>
                <MetricBar value={scorecard?.totalSessions ? (scorecard.aiHandled / scorecard.totalSessions) * 100 : 0} color="#7c3aed" />
                <p className="text-[10px] text-muted-foreground mt-1">Weight: 25%</p>
              </div>

              {/* Form Redirect Rate (lower = better) */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">Form Redirect Rate</p>
                <p className="text-xl font-semibold mt-1">
                  {formRedirectRate !== null ? `${formRedirectRate}%` : "—"}
                </p>
                <MetricBar value={formRedirectRate !== null ? Math.max(0, 100 - formRedirectRate * 4) : 0} color="#059669" />
                <p className="text-[10px] text-muted-foreground mt-1">Weight: 10% (lower is better)</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Charts Row 1: Language + Daily Volume ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Language breakdown */}
          <Card className="border border-gray-100 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Language Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full rounded-lg" />
              ) : langData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={langData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
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

          {/* Daily volume (total only) */}
          <Card className="border border-gray-100 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Chat Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full rounded-lg" />
              ) : dailyData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyData} margin={{ left: 0, right: 16, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Total" stroke="#111" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Inquiry Category Breakdown ────────────────────────────────────── */}
        <Card className="border border-gray-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Inquiry Category Breakdown
              {data?.analyzedMessageCount ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (based on {data.analyzedMessageCount} visitor messages)
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : !data?.categoryBreakdown || data.categoryBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                {data?.total === 0 ? "No data" : "No messages to classify"}
              </div>
            ) : (
              <div className="space-y-3">
                {data.categoryBreakdown.map((cat, i) => {
                  const total = data.categoryBreakdown.reduce((s, c) => s + c.count, 0);
                  const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <span className="text-xs text-muted-foreground">{cat.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] === "#f3f4f6" ? "#9ca3af" : CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          }}
                        />
                      </div>
                      {cat.examples.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {cat.examples.map((ex, j) => (
                            <p key={j} className="text-xs text-muted-foreground truncate pl-1 border-l-2 border-gray-200">
                              {ex}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Hourly Distribution ───────────────────────────────────────────── */}
        <Card className="border border-gray-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hourly Distribution (UTC)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : hourlyData.every((h) => h.count === 0) ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} chats`]} />
                  <Bar dataKey="count" fill="#111" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Image Analytics Section ──────────────────────────────────────────── */}
      <div className="px-6 pb-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Image Analytics (Vision AI)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Images Analyzed"
            value={imgLoading ? "…" : (imgData?.totalImages ?? 0)}
            sub="Visitor-uploaded images"
          />
          <StatCard
            label="Top Category"
            value={imgLoading ? "…" : (imgData?.categoryCounts?.[0] ? (CATEGORY_LABELS[imgData.categoryCounts[0].category] ?? imgData.categoryCounts[0].category) : "—")}
            sub={imgData?.categoryCounts?.[0] ? `${imgData.categoryCounts[0].count} images` : undefined}
          />
          <StatCard
            label="Unique Keywords"
            value={imgLoading ? "…" : (imgData?.topKeywords?.length ?? 0)}
            sub="Top keywords extracted"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category distribution */}
          <Card className="border border-gray-100 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {imgLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : !imgData?.categoryCounts?.length ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No image data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={imgData.categoryCounts.map((c) => ({ name: CATEGORY_LABELS[c.category] ?? c.category, count: c.count }))}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v: number) => [`${v} images`]} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {imgData.categoryCounts.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top keywords */}
          <Card className="border border-gray-100 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              {imgLoading ? (
                <Skeleton className="h-48 w-full rounded-lg" />
              ) : !imgData?.topKeywords?.length ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No keyword data yet</div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2">
                  {imgData.topKeywords.map((kw) => (
                    <span
                      key={kw.keyword}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {kw.keyword}
                      <span className="text-gray-400">x{kw.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent analyzed images */}
        {!!imgData?.recentAnalyses?.length && (
          <Card className="border border-gray-100 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Analyzed Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {imgData.recentAnalyses.slice(0, 10).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img src={a.fileUrl} alt="analyzed" className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {CATEGORY_LABELS[a.category] ?? a.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
