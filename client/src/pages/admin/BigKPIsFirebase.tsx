/**
 * BigKPIsFirebase — KPI ダッシュボード（Firestore版）
 * tRPC → Firestore onSnapshot リアルタイム集計
 */
import { useMemo, useState } from "react";
import { useSessionStats, useChatSessions, type ChatSessionDoc } from "@/hooks/useFirestoreAdmin";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Bot, Clock, Users, MessageCircle, CheckCircle,
  XCircle, Star, Target, Activity, AlertTriangle,
} from "lucide-react";

const LANG_LABELS: Record<string, string> = {
  ja: "日本語", en: "English", zh: "中文", ko: "한국어",
  th: "ไทย", vi: "Tiếng Việt", unknown: "Other",
};

export default function BigKPIsFirebase() {
  const { stats, loading } = useSessionStats();
  const { sessions } = useChatSessions();

  // 直近のエスカレーション
  const recentEscalations = useMemo(() => {
    return sessions
      .filter((s) => s.escalated)
      .slice(0, 5);
  }, [sessions]);

  if (loading || !stats) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">KPI ダッシュボード</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const kpis = [
    {
      title: "総セッション数",
      value: stats.total,
      icon: MessageCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "アクティブ",
      value: stats.active,
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "AI解決率",
      value: `${stats.resolvedRate.toFixed(1)}%`,
      icon: Target,
      color: stats.resolvedRate >= 99 ? "text-green-600" : "text-amber-600",
      bg: stats.resolvedRate >= 99 ? "bg-green-50" : "bg-amber-50",
      subtitle: "目標: 99.9%",
    },
    {
      title: "エスカレーション",
      value: stats.escalated,
      icon: AlertTriangle,
      color: stats.escalated > 0 ? "text-red-600" : "text-green-600",
      bg: stats.escalated > 0 ? "bg-red-50" : "bg-green-50",
    },
    {
      title: "平均評価",
      value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} ⭐` : "—",
      icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "終了済み",
      value: stats.ended,
      icon: CheckCircle,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI ダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">
            リアルタイム集計（Firestore onSnapshot）
          </p>
        </div>

        {/* KPI カード */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.bg)}>
                  <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", kpi.color)}>
                  {kpi.value}
                </div>
                {kpi.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 言語分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">言語分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byLanguage)
                .sort(([, a], [, b]) => b - a)
                .map(([lang, count]) => (
                  <Badge key={lang} variant="outline" className="text-xs">
                    {LANG_LABELS[lang] || lang}: {count}
                    <span className="ml-1 text-muted-foreground">
                      ({stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : 0}%)
                    </span>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* 最近のエスカレーション */}
        {recentEscalations.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                最近のエスカレーション
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentEscalations.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground">
                        {s.id.slice(0, 8)}...
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {s.language}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {s.createdAt?.toDate
                        ? s.createdAt.toDate().toLocaleString("ja-JP")
                        : "—"}
                    </span>
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
