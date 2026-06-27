import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Server,
  CreditCard,
  Mail,
  Wifi,
  Database,
  Activity,
} from "lucide-react";

type HealthStatus = "ok" | "degraded" | "down" | "unknown";

const STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; icon: React.ComponentType<any>; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ok: { label: "正常", icon: CheckCircle, color: "text-green-500", badgeVariant: "default" },
  degraded: { label: "低下", icon: AlertTriangle, color: "text-yellow-500", badgeVariant: "secondary" },
  down: { label: "障害", icon: XCircle, color: "text-red-500", badgeVariant: "destructive" },
  unknown: { label: "不明", icon: HelpCircle, color: "text-gray-400", badgeVariant: "outline" },
};

const LAYER_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; description: string }> = {
  server: { label: "サーバー", icon: Server, description: "chat.yah.mobi APIサーバー" },
  stripe: { label: "Stripe決済", icon: CreditCard, description: "決済処理（購入・返金）" },
  resend: { label: "Resendメール", icon: Mail, description: "QRコード・通知メール送信" },
  omax: { label: "OMAX API", icon: Wifi, description: "eSIMプロビジョニング" },
  database: { label: "データベース", icon: Database, description: "MySQL/TiDB接続" },
  frontend: { label: "フロントエンド", icon: Activity, description: "yah.mobi/app クライアント" },
};

function StatusCard({
  layer,
  data,
}: {
  layer: string;
  data: { status: HealthStatus; message?: string | null; errorCount?: number; checkedAt?: string | null };
}) {
  const config = LAYER_CONFIG[layer] ?? { label: layer, icon: Activity, description: "" };
  const statusCfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.unknown;
  const Icon = config.icon;
  const StatusIcon = statusCfg.icon;

  return (
    <Card className={`border-l-4 ${
      data.status === "ok" ? "border-l-green-500" :
      data.status === "degraded" ? "border-l-yellow-500" :
      data.status === "down" ? "border-l-red-500" :
      "border-l-gray-400"
    }`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${
              data.status === "ok" ? "bg-green-500/10" :
              data.status === "degraded" ? "bg-yellow-500/10" :
              data.status === "down" ? "bg-red-500/10" :
              "bg-gray-500/10"
            }`}>
              <Icon className={`w-5 h-5 ${statusCfg.color}`} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{config.label}</div>
              <div className="text-xs text-muted-foreground">{config.description}</div>
              {data.message && (
                <div className="text-xs text-muted-foreground mt-1 truncate max-w-[220px]" title={data.message}>
                  {data.message}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <StatusIcon className={`w-4 h-4 ${statusCfg.color}`} />
              <Badge variant={statusCfg.badgeVariant} className="text-xs">
                {statusCfg.label}
              </Badge>
            </div>
            {data.errorCount != null && data.errorCount > 0 && (
              <span className="text-xs text-muted-foreground">エラー {data.errorCount}件</span>
            )}
            {data.checkedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(data.checkedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SystemHealth() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, refetch } = trpc.plans.getSystemHealth.useQuery(undefined, {
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const layers = data?.layers ?? {};
  const layerKeys = ["server", "database", "stripe", "resend", "omax", "frontend"];

  const allOk = layerKeys.every((k) => !layers[k] || layers[k].status === "ok" || layers[k].status === "unknown");
  const hasDown = layerKeys.some((k) => layers[k]?.status === "down");
  const hasDegraded = layerKeys.some((k) => layers[k]?.status === "degraded");

  const overallStatus: HealthStatus = hasDown ? "down" : hasDegraded ? "degraded" : allOk ? "ok" : "unknown";
  const overallCfg = STATUS_CONFIG[overallStatus];
  const OverallIcon = overallCfg.icon;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Health</h1>
            <p className="text-muted-foreground text-sm mt-1">
              全レイヤーの稼働状況をリアルタイム監視（5分間隔で自動チェック）
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); setRefreshKey(k => k + 1); }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            更新
          </Button>
        </div>

        {/* Overall status banner */}
        <Card className={`${
          overallStatus === "ok" ? "bg-green-500/5 border-green-500/30" :
          overallStatus === "degraded" ? "bg-yellow-500/5 border-yellow-500/30" :
          overallStatus === "down" ? "bg-red-500/5 border-red-500/30" :
          "bg-muted/30"
        }`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <OverallIcon className={`w-6 h-6 ${overallCfg.color}`} />
              <div>
                <div className="font-semibold">
                  {overallStatus === "ok" ? "全システム正常稼働中" :
                   overallStatus === "degraded" ? "一部システムで低下が検出されています" :
                   overallStatus === "down" ? "障害が発生しています" :
                   "ステータス確認中"}
                </div>
                <div className="text-xs text-muted-foreground">
                  AIは障害検知時にユーザーへ自動的に状況を案内します
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layer status grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            レイヤー別ステータス
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {layerKeys.map((layer) => (
              <StatusCard
                key={`${layer}-${refreshKey}`}
                layer={layer}
                data={layers[layer] ? {
                  status: layers[layer].status as HealthStatus,
                  message: layers[layer].message,
                  errorCount: layers[layer].errorCount ?? undefined,
                  checkedAt: layers[layer].checkedAt,
                } : { status: "unknown" as HealthStatus }}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Architecture overview */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            監視アーキテクチャ
          </h2>
          <Card>
            <CardContent className="pt-4 pb-4 text-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    自動チェック（Heartbeat）
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• <strong>5分間隔</strong>でサーバー・DB・Stripe・Resend・OMAXを疎通確認</li>
                    <li>• 障害検知時は <code className="bg-muted px-1 rounded">system_health</code> テーブルに記録</li>
                    <li>• 回復時は <code className="bg-muted px-1 rounded">resolvedAt</code> を自動記録</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    フロントエンドエラー収集
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• yah.mobi/app から <code className="bg-muted px-1 rounded">POST /api/errors/report</code> で報告</li>
                    <li>• QR表示不具合・ページクラッシュ等を自動検出</li>
                    <li>• エラー件数が閾値を超えると <code className="bg-muted px-1 rounded">degraded</code> に昇格</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    AI自動案内
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• チャット開始時にシステム状態をsystem promptに注入</li>
                    <li>• 障害中はユーザーに「現在障害対応中」と自動案内</li>
                    <li>• 無駄なリトライ指示を防止し問い合わせを抑制</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" />
                    期待効果
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• 問い合わせ数 <strong>-25〜35%</strong>（プロアクティブ通知）</li>
                    <li>• CONNECTION解決率 <strong>+1〜2%</strong></li>
                    <li>• エスカレーション率 <strong>-5%</strong></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
