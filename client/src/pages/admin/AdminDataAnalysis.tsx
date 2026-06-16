import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

type Period = "all" | "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  all: "All Time",
  today: "Today",
  week: "Last 7 Days",
  month: "This Month",
};

const LANG_LABEL: Record<string, string> = {
  ja: "日本語", en: "English", zh: "中文", es: "Español", ko: "한국어", unknown: "Unknown",
};

const PIE_COLORS = ["#111", "#6b7280", "#d1d5db", "#f3f4f6", "#e5e7eb"];
const AI_COLOR = "#7c3aed";
const OP_COLOR = "#2563eb";

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

const CATEGORY_COLORS = ["#111", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border border-gray-100 shadow-none">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDataAnalysis() {
  const [period, setPeriod] = useState<Period>("all");
  const { data, isLoading } = trpc.admin.getAnalysis.useQuery({ period });
  const { data: imgData, isLoading: imgLoading } = trpc.admin.getImageAnalytics.useQuery({ period: period as "today" | "week" | "month" | "all" });

  const aiPct = data && data.total > 0 ? Math.round((data.aiCount / data.total) * 100) : 0;
  const opPct = data && data.total > 0 ? Math.round((data.operatorCount / data.total) * 100) : 0;

  const aiOpData = data
    ? [
        { name: "AI Handled", value: data.aiCount, color: AI_COLOR },
        { name: "Operator Handled", value: data.operatorCount, color: OP_COLOR },
      ]
    : [];

  const langData = (data?.languageBreakdown ?? []).map((l) => ({
    name: LANG_LABEL[l.language] ?? l.language,
    count: l.count,
  }));

  const hourlyData = (data?.hourlyDistribution ?? []).map((h) => ({
    hour: `${String(h.hour).padStart(2, "0")}:00`,
    count: h.count,
  }));

  const dailyData = (data?.dailyTrend ?? []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    AI: d.ai,
    Operator: d.operator,
  }));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header + period filter */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/yah-mobile-logo-horizontal_8744efd4.svg"
              alt="yah.mobile"
              className="h-8 w-auto object-contain"
            />
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

        {/* KPI row */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Chats" value={data?.total ?? 0} />
            <StatCard label="AI Handled" value={data?.aiCount ?? 0} sub={`${aiPct}% of total`} />
            <StatCard label="Operator Handled" value={data?.operatorCount ?? 0} sub={`${opPct}% of total`} />
            <StatCard
              label="Languages"
              value={data?.languageBreakdown.length ?? 0}
              sub="unique languages"
            />
          </div>
        )}

        {/* Charts row 1: AI vs Operator pie + Language bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI vs Operator pie */}
          <Card className="border border-gray-100 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">AI vs Operator Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full rounded-lg" />
              ) : data?.total === 0 ? (
                <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">No data</div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie
                        data={aiOpData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {aiOpData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v} chats`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {aiOpData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: entry.color }} />
                        <div>
                          <p className="text-xs font-medium">{entry.name}</p>
                          <p className="text-lg font-semibold leading-tight">{entry.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
        </div>

        {/* Daily trend line chart */}
        <Card className="border border-gray-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Chat Volume (AI vs Operator)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : dailyData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyData} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="AI" stroke={AI_COLOR} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Operator" stroke={OP_COLOR} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown (LLM-classified) */}
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
                            background: PIE_COLORS[i % PIE_COLORS.length] === "#f3f4f6" ? "#9ca3af" : PIE_COLORS[i % PIE_COLORS.length],
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

        {/* Hourly distribution bar chart */}
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

      {/* ── Image Analytics Section ──────────────────────────────────────── */}
      <div className="space-y-4">
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
          {/* Category distribution bar chart */}
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
                {imgData.recentAnalyses.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img src={a.fileUrl} alt="analyzed" className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {CATEGORY_LABELS[a.category ?? ""] ?? a.category ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {a.confidence != null ? `${Math.round((a.confidence as number) * 100)}% confidence` : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{a.description ?? "—"}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(a.keywords as string[] | null)?.slice(0, 5).map((kw) => (
                          <span key={kw} className="text-xs text-muted-foreground">#{kw}</span>
                        ))}
                      </div>
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
