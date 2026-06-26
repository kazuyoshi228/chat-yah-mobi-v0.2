import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    status: "eligible",
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
    status: "eligible",
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
    status: "eligible",
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
    status: "eligible",
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
  { category: "返金（REFUND）全体", current: 0.920, projected: 0.965, change: "+0.045" },
  { category: "セッション解決率（返金）", current: 55.6, projected: 92.0, change: "+36.4pt", isPercent: true },
  { category: "全体平均スコア", current: 0.930, projected: 0.948, change: "+0.018" },
];

function ScoreBadge({ score, isPercent = false }: { score: number; isPercent?: boolean }) {
  const val = isPercent ? score : score * 100;
  const color = val >= 90 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : val >= 80 ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
    : "bg-red-500/15 text-red-600 border-red-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${color}`}>
      {isPercent ? score.toFixed(1) + "%" : score.toFixed(3)}
    </span>
  );
}

export default function Refund() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">返金管理 / Refund Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            自動返金対応フロー・対象ケース・AIスコア予測
          </p>
        </div>

        {/* Score Prediction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">自動返金実装後のスコア予測</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">カテゴリ</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">現在</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">実装後（予測）</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">変化</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreData.map((row) => (
                    <tr key={row.category} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.category}</td>
                      <td className="py-2.5 px-3 text-center">
                        <ScoreBadge score={row.current} isPercent={row.isPercent} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <ScoreBadge score={row.projected} isPercent={row.isPercent} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-emerald-600 font-semibold text-xs">{row.change}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Eligible Cases */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">返金対象ケース</h2>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/40 bg-emerald-500/10">
              自動対応予定
            </Badge>
          </div>
          <div className="grid gap-4">
            {refundEligibleCases.map((c) => (
              <Card key={c.id} className="border-l-4 border-l-emerald-500">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{c.title}</span>
                        <span className="text-xs text-muted-foreground">/ {c.titleEn}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{c.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {c.examples.map((ex, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{ex}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-blue-600">
                        <span className="font-medium">対応フロー:</span>
                        <span>{c.action}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="text-xs text-muted-foreground">現在</div>
                      <ScoreBadge score={c.currentScore} />
                      <div className="text-xs text-muted-foreground mt-1">実装後</div>
                      <ScoreBadge score={c.projectedScore} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ineligible Cases */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">返金対象外ケース</h2>
            <Badge variant="outline" className="text-red-600 border-red-500/40 bg-red-500/10">
              現状維持
            </Badge>
          </div>
          <div className="grid gap-3">
            {refundIneligibleCases.map((c, i) => (
              <Card key={i} className="border-l-4 border-l-red-400">
                <CardContent className="pt-4 pb-4">
                  <div className="font-semibold mb-1">{c.title}</div>
                  <p className="text-sm text-muted-foreground mb-1.5">{c.description}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-red-500">理由:</span>
                    <span>{c.reason}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Legal Basis */}
        <Card className="bg-muted/40">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">法的根拠：</span>
              特定商取引法第15条の3に基づき、デジタルコンテンツ（eSIM）は提供開始後の返金は原則不可。
              ただし、事業者側の技術的不具合・二重課金・未発行等のシステムエラーによる場合は例外として返金対応を行う。
              自動返金対応の実装により、例外ケースの検知・対応を迅速化し、顧客満足度とAIスコアの向上を図る。
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
