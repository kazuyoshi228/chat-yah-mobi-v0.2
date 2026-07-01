/**
 * SystemHealthFirebase — システムヘルス画面（Firestore版）
 * tRPC → Firestore 接続チェック + Cloud Functions ステータス表示
 */
import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  Cloud,
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

interface HealthLayer {
  status: HealthStatus;
  message?: string;
  checkedAt?: string;
}

const LAYER_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; description: string }> = {
  firestore: { label: "Firestore", icon: Database, description: "Cloud Firestore データベース接続" },
  functions: { label: "Cloud Functions", icon: Cloud, description: "サーバーレス関数のステータス" },
  stripe: { label: "Stripe決済", icon: CreditCard, description: "決済処理（購入・返金）" },
  resend: { label: "Resendメール", icon: Mail, description: "QRコード・通知メール送信" },
  omax: { label: "OMAX API", icon: Wifi, description: "eSIMプロビジョニング" },
  frontend: { label: "フロントエンド", icon: Activity, description: "チャットウィジェット" },
};

function StatusCard({
  layer,
  data,
}: {
  layer: string;
  data: HealthLayer;
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

export default function SystemHealthFirebase() {
  const [layers, setLayers] = useState<Record<string, HealthLayer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    const now = new Date().toISOString();
    const result: Record<string, HealthLayer> = {};

    // 1. Firestore connectivity check
    try {
      const snap = await getDocs(collection(db, "chatSessions"));
      result.firestore = {
        status: "ok",
        message: `${snap.size} セッション取得成功`,
        checkedAt: now,
      };
    } catch (err: any) {
      result.firestore = {
        status: "down",
        message: err.message ?? "Firestore接続エラー",
        checkedAt: now,
      };
    }

    // 2. Cloud Functions — check systemHealth collection for function status
    try {
      const healthSnap = await getDocs(collection(db, "systemHealth"));
      if (healthSnap.empty) {
        result.functions = {
          status: "unknown",
          message: "systemHealth コレクションにデータなし",
          checkedAt: now,
        };
      } else {
        // Check if any functions reported issues
        let hasDown = false;
        let hasDegraded = false;
        let latestCheck: Date | null = null;

        for (const doc of healthSnap.docs) {
          const data = doc.data();
          if (data.status === "down") hasDown = true;
          if (data.status === "degraded") hasDegraded = true;
          const ts = data.checkedAt instanceof Timestamp ? data.checkedAt.toDate() : data.checkedAt ? new Date(data.checkedAt) : null;
          if (ts && (!latestCheck || ts > latestCheck)) latestCheck = ts;
        }

        result.functions = {
          status: hasDown ? "down" : hasDegraded ? "degraded" : "ok",
          message: `${healthSnap.size}件のヘルスチェック記録${latestCheck ? ` (最終: ${latestCheck.toLocaleString("ja-JP")})` : ""}`,
          checkedAt: now,
        };
      }
    } catch (err: any) {
      result.functions = {
        status: "unknown",
        message: err.message ?? "Functions状態取得エラー",
        checkedAt: now,
      };
    }

    // 3. External services — read from systemHealth collection or mark as unknown
    try {
      const healthSnap = await getDocs(collection(db, "systemHealth"));
      const healthData: Record<string, any> = {};
      for (const doc of healthSnap.docs) {
        healthData[doc.id] = doc.data();
      }

      for (const layer of ["stripe", "resend", "omax", "frontend"]) {
        if (healthData[layer]) {
          result[layer] = {
            status: (healthData[layer].status as HealthStatus) ?? "unknown",
            message: healthData[layer].message ?? undefined,
            checkedAt: healthData[layer].checkedAt instanceof Timestamp
              ? healthData[layer].checkedAt.toDate().toISOString()
              : healthData[layer].checkedAt ?? now,
          };
        } else {
          result[layer] = {
            status: "unknown",
            message: "ヘルスチェックデータなし（Cloud Functionsによる定期チェック待ち）",
            checkedAt: now,
          };
        }
      }
    } catch {
      for (const layer of ["stripe", "resend", "omax", "frontend"]) {
        if (!result[layer]) {
          result[layer] = { status: "unknown", checkedAt: now };
        }
      }
    }

    setLayers(result);
    setLastChecked(now);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const layerKeys = ["firestore", "functions", "stripe", "resend", "omax", "frontend"];

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
              全レイヤーの稼働状況をリアルタイム監視（30秒間隔で自動チェック）
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
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
                  {lastChecked && ` ・ 最終チェック: ${new Date(lastChecked).toLocaleTimeString("ja-JP")}`}
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
                key={layer}
                layer={layer}
                data={layers[layer] ?? { status: "unknown" as HealthStatus }}
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
                    Firestore ヘルスチェック
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• <strong>30秒間隔</strong>でFirestoreへの接続を自動確認</li>
                    <li>• <code className="bg-muted px-1 rounded">systemHealth</code> コレクションから各サービスの状態を取得</li>
                    <li>• Cloud Functionsが定期的に外部サービスの疎通確認を実施</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-purple-500" />
                    Cloud Functions 監視
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• Cloud Functionsが<strong>5分間隔</strong>でStripe・Resend・OMAXを確認</li>
                    <li>• 結果を <code className="bg-muted px-1 rounded">systemHealth</code> コレクションに記録</li>
                    <li>• 障害検知時はアラート通知を自動送信</li>
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
