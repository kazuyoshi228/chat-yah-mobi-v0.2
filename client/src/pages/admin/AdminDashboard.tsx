import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Bot, Star, TrendingUp, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: kpi, isLoading } = trpc.admin.getKpi.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

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
          <p className="text-gray-500 mb-4">ログインが必要です</p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} className="bg-black text-white">
            ログイン
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">管理者権限が必要です</p>
      </div>
    );
  }

  const aiResolvedRate = kpi && kpi.total > 0
    ? Math.round((kpi.aiResolved / kpi.total) * 100)
    : 0;

  return (
    <DashboardLayout title="管理ダッシュボード">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'EB Garamond', serif" }}>
            ダッシュボード
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">チャットサポートの概要</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-gray-100 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5" />
                  総チャット数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-900">{kpi?.total ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">全期間</p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5" />
                  AI解決率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-900">{aiResolvedRate}%</p>
                <p className="text-xs text-gray-400 mt-1">
                  {kpi?.aiResolved ?? 0} / {kpi?.total ?? 0} 件
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" />
                  平均満足度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-900">
                  {kpi?.avgRating ? `${kpi.avgRating} / 5` : "—"}
                </p>
                <p className="text-xs text-gray-400 mt-1">アンケート回答より</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "オペレーター管理", desc: "ロールの割り当て・管理", href: "/admin/operators" },
            { title: "定型文管理", desc: "定型返答の追加・編集", href: "/admin/quick-replies" },
            { title: "RAGドキュメント", desc: "AI知識ベースの管理", href: "/admin/rag" },
            { title: "チャット一覧", desc: "全チャットの確認", href: "/operator/chats" },
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
