import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Bot, Star, Users, CheckCircle, XCircle, Loader2, AlertCircle, Clock, Headphones } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Period = "all" | "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  all: "All Time",
  today: "Today",
  week: "Last 7 Days",
  month: "This Month",
};

function RateBar({ rate, color }: { rate: number | null; color: string }) {
  if (rate === null) return <p className="text-xs text-gray-300 mt-1">No data</p>;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{rate}%</span>
        <span className="text-xs text-gray-300">100%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<Period>("all");

  const { data: kpi, isLoading } = trpc.admin.getKpi.useQuery(
    { period },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: activeCounts, isLoading: isLoadingCounts } = trpc.admin.getActiveCounts.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin", refetchInterval: 15000 }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Login required</p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} className="bg-black text-white">
            Login
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Admin access required</p>
      </div>
    );
  }

  // AI-handled rate (sessions ended without operator / total ended)
  const endedTotal = (kpi?.aiResolved ?? 0) + (kpi?.operatorResolved ?? 0);
  const aiHandledRate = endedTotal > 0
    ? Math.round(((kpi?.aiResolved ?? 0) / endedTotal) * 100)
    : null;
  const opHandledRate = endedTotal > 0
    ? Math.round(((kpi?.operatorResolved ?? 0) / endedTotal) * 100)
    : null;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="p-6">
        {/* Header with period filter */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/yah-mobile-logo-horizontal_f116360c.svg"
              alt="yah.mobile"
              className="h-8 w-auto object-contain"
            />
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          {/* Period filter buttons */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  period === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* 対応必要セクション */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-700">対応必要</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Waiting */}
            <Link href="/admin/active-chats?status=waiting">
              <div className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                (activeCounts?.waiting ?? 0) > 0
                  ? "border-red-300 bg-red-50"
                  : "border-gray-100 bg-white"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-medium text-gray-500">Waiting</span>
                  </div>
                  {(activeCounts?.waiting ?? 0) > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>
                {isLoadingCounts ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                ) : (
                  <p className={`text-4xl font-bold ${
                    (activeCounts?.waiting ?? 0) > 0 ? "text-red-600" : "text-gray-300"
                  }`}>
                    {activeCounts?.waiting ?? 0}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">オペレーター待ち</p>
              </div>
            </Link>

            {/* Active */}
            <Link href="/admin/active-chats?status=active">
              <div className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                (activeCounts?.active ?? 0) > 0
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-100 bg-white"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-gray-500">Active</span>
                  </div>
                  {(activeCounts?.active ?? 0) > 0 && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
                {isLoadingCounts ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                ) : (
                  <p className={`text-4xl font-bold ${
                    (activeCounts?.active ?? 0) > 0 ? "text-blue-600" : "text-gray-300"
                  }`}>
                    {activeCounts?.active ?? 0}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">対応中</p>
              </div>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Row 1: Volume KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card className="border-gray-100 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Total Chats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">{kpi?.total ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">{PERIOD_LABELS[period]}</p>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5" />
                    AI Handled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">{kpi?.aiResolved ?? 0}</p>
                  <RateBar rate={aiHandledRate} color="bg-blue-400" />
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Operator Handled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">{kpi?.operatorResolved ?? 0}</p>
                  <RateBar rate={opHandledRate} color="bg-purple-400" />
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Resolution KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Overall resolved rate */}
              <Card className="border-gray-100 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    Overall Resolution Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">
                    {kpi?.resolvedRate !== null && kpi?.resolvedRate !== undefined ? `${kpi.resolvedRate}%` : "—"}
                  </p>
                  <RateBar rate={kpi?.resolvedRate ?? null} color="bg-green-400" />
                  {kpi?.surveyCount ? (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Resolved {kpi.resolvedCount} / Unresolved {kpi.unresolvedCount} ({kpi.surveyCount} responses)
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300 mt-1.5">No survey responses yet</p>
                  )}
                </CardContent>
              </Card>

              {/* AI resolved rate */}
              <Card className="border-gray-100 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-blue-500" />
                    AI Resolution Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">
                    {kpi?.aiResolvedRate !== null && kpi?.aiResolvedRate !== undefined ? `${kpi.aiResolvedRate}%` : "—"}
                  </p>
                  <RateBar rate={kpi?.aiResolvedRate ?? null} color="bg-blue-400" />
                  <p className="text-xs text-gray-400 mt-1.5">From surveys on AI-handled chats</p>
                </CardContent>
              </Card>

              {/* Operator resolved rate */}
              <Card className="border-gray-100 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    Operator Resolution Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">
                    {kpi?.operatorResolvedRate !== null && kpi?.operatorResolvedRate !== undefined ? `${kpi.operatorResolvedRate}%` : "—"}
                  </p>
                  <RateBar rate={kpi?.operatorResolvedRate ?? null} color="bg-purple-400" />
                  <p className="text-xs text-gray-400 mt-1.5">From surveys on operator-handled chats</p>
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Satisfaction */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-gray-100 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-yellow-500" />
                    Avg. Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">
                    {kpi?.avgRating ? `${kpi.avgRating}` : "—"}
                    {kpi?.avgRating ? <span className="text-base font-normal text-gray-400"> / 5</span> : null}
                  </p>
                  <RateBar rate={kpi?.avgRating ? Math.round((kpi.avgRating / 5) * 100) : null} color="bg-yellow-400" />
                  <p className="text-xs text-gray-400 mt-1.5">From {kpi?.surveyCount ?? 0} survey responses</p>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-none col-span-1 md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    Unresolved Chats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-gray-900">{kpi?.unresolvedCount ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Number of surveys where visitors said the issue was not resolved. Use this as a priority for improvement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Quick links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "Operators", desc: "Manage roles and assignments", href: "/admin/operators" },
            { title: "Quick Replies", desc: "Add and edit canned responses", href: "/admin/quick-replies" },
            { title: "RAG Documents", desc: "Manage AI knowledge base", href: "/admin/rag" },
            { title: "Chat List", desc: "View all chats", href: "/operator/chats" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
