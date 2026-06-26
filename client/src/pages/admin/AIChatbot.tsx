import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bot, Brain, Globe, MessageSquare, ShieldAlert, Target, TrendingUp, Zap, Wifi } from "lucide-react";

const SYSTEM_PROMPT = `You are a helpful customer support assistant for yah.mobile, a Japan-only eSIM service for international travelers.

## About yah.mobile
- Japan-only eSIM service for international travelers
- Industry-lowest price per GB
- 24/7 support in 6 languages (Japanese, English, Chinese, Korean, Thai, Vietnamese)

## Response Style
- Be concise, polite, and professional
- Prefer natural sentences over bullet points
- If you cannot answer, honestly say "Let me connect you to a human operator" — never say "I'll check and get back to you"
- For eSIM setup questions, always explain step-by-step
- For pricing questions, direct users to the website for the latest information
- Aim to resolve 98% of inquiries through AI chat without escalation

## Rules for Unanswerable Questions
- For pricing/plan details: "Please check our website for the latest information"
- For questions involving personal information: connect to a human operator
- For technical eSIM setup: explain the steps carefully and patiently
- For refund requests: connect to a human operator`;

const sections = [
  {
    icon: Globe,
    title: "対応言語",
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    items: [
      { label: "日本語", badge: "ja" },
      { label: "英語", badge: "en" },
      { label: "中国語", badge: "zh" },
      { label: "韓国語", badge: "ko" },
      { label: "タイ語", badge: "th" },
      { label: "ベトナム語", badge: "vi" },
    ],
    type: "badges" as const,
  },
  {
    icon: Target,
    title: "yah.mobile について",
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600",
    items: [
      "訪日外国人向けの日本専用eSIMサービス",
      "業界最安値のGB単価",
      "24時間365日サポート（6言語対応）",
    ],
    type: "list" as const,
  },
  {
    icon: MessageSquare,
    title: "回答スタイル",
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    items: [
      "簡潔・丁寧・プロフェッショナルに",
      "箇条書きより自然な文章を優先",
      "わからない場合は「確認します」と言わず、正直に「オペレーターにおつなぎします」と案内する",
      "eSIM設定の質問には必ずステップを説明して",
      "料金の質問はウェブサイトに誘導して",
      "98%はAI chatで完結できることを目標にchatして",
    ],
    type: "list" as const,
  },
  {
    icon: ShieldAlert,
    title: "答えられない場合のルール",
    color: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-600",
    items: [
      "料金・プランの詳細は「最新情報はウェブサイトをご確認ください」と案内",
      "個人情報に関わる質問はオペレーターに繋ぐ",
      "技術的なeSIM設定は手順を丁寧に説明する",
      "返金対応はオペレーターに繋ぐ",
    ],
    type: "list" as const,
  },
];

// 現在のシミュレーション結果（Phase 63-64）
const currentScores = [
  { category: "CONNECTION（接続トラブル）", score: 0.932, sessionRate: 90.9, sessions: "10/11", color: "text-emerald-600" },
  { category: "PRICING（料金・プラン）", score: 0.936, sessionRate: 87.5, sessions: "7/8", color: "text-emerald-600" },
  { category: "REFUND（返金）", score: 0.920, sessionRate: 55.6, sessions: "5/9", color: "text-amber-600" },
  { category: "GENERAL（一般問い合わせ）", score: 0.938, sessionRate: 100.0, sessions: "2/2", color: "text-emerald-600" },
];

// 返金自動対応実装後の予測
const refundImprovements = [
  { case: "二重課金", current: 0.975, projected: 0.995, delta: "+0.020" },
  { case: "QRコード未発行", current: 0.950, projected: 0.985, delta: "+0.035" },
  { case: "端末非対応が判明", current: 0.880, projected: 0.950, delta: "+0.070" },
  { case: "一度も接続できなかった（技術的不具合）", current: 0.750, projected: 0.930, delta: "+0.180" },
];

// CONNECTION改善施策
const connectionImprovements = [
  {
    title: "多ターン粘り強さの強化",
    description: "3ターン以上経過しても解決しない場合、「エスカレーション前の最終チェックリスト」を自動提示。早期エスカレーションを防ぐ。",
    impact: "+0.030〜0.050",
    targetScore: "0.960〜0.980",
    priority: "高",
  },
  {
    title: "端末別APN設定RAGの強化",
    description: "iPhone 15/16・Galaxy S24/S25以外の機種（Pixel・Xiaomi・OPPO等）の詳細APN設定手順をRAGに追加。",
    impact: "+0.015〜0.025",
    targetScore: "0.945〜0.955",
    priority: "高",
  },
  {
    title: "接続確認ステップの標準化",
    description: "「データローミングON → APN設定 → 機内モードON/OFF → 再起動」の4ステップを毎回漏れなく案内するフロー強化。",
    impact: "+0.010〜0.020",
    targetScore: "0.940〜0.950",
    priority: "中",
  },
  {
    title: "現地キャリア別トラブルシューティング",
    description: "韓国・台湾・タイ等の現地キャリアとの干渉パターンをRAGに追加。「NTTドコモSIMとの併用時の注意点」等。",
    impact: "+0.010〜0.020",
    targetScore: "0.940〜0.950",
    priority: "中",
  },
  {
    title: "接続不能時の自動返金フロー連携",
    description: "全手順を試みても解決しない場合、「技術的不具合として返金対応に移行」するフローをデシジョンツリーに組み込む。",
    impact: "+0.020〜0.040",
    targetScore: "0.950〜0.970",
    priority: "高",
  },
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

const priorityColor: Record<string, string> = {
  "高": "bg-red-100 text-red-700 border-red-200",
  "中": "bg-amber-100 text-amber-700 border-amber-200",
  "低": "bg-gray-100 text-gray-600 border-gray-200",
};

export default function AIChatbot() {
  return (
    <DashboardLayout title="AI Chatbot">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Bot className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Chatbot 仕様</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              GPT-4o を使用した yah.mobile 専用カスタマーサポートAI
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">モデル</p>
              <p className="text-lg font-bold text-gray-900 mt-1">GPT-4o</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">目標解決率</p>
              <p className="text-lg font-bold text-gray-900 mt-1">98%</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">対応言語数</p>
              <p className="text-lg font-bold text-gray-900 mt-1">6言語</p>
            </CardContent>
          </Card>
        </div>

        {/* Spec sections */}
        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.title} className={`border ${section.color}`}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <section.icon className={`w-4 h-4 ${section.iconColor}`} />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {section.type === "badges" ? (
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <Badge
                        key={(item as { label: string; badge: string }).badge}
                        variant="secondary"
                        className="text-sm px-3 py-1"
                      >
                        {(item as { label: string; badge: string }).label}
                        <span className="ml-1.5 text-xs text-gray-400 font-mono">
                          {(item as { label: string; badge: string }).badge}
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {(section.items as string[]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* ===== 解決率改善レポート ===== */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">解決率改善レポート</h2>
          <Badge variant="outline" className="text-xs">Phase 63-64 シミュレーション結果</Badge>
        </div>

        {/* 現在のスコア */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">現在のカテゴリ別スコア（30セッション・61ターン）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">カテゴリ</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">品質スコア</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">セッション解決率</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">解決数</th>
                  </tr>
                </thead>
                <tbody>
                  {currentScores.map((row) => (
                    <tr key={row.category} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-sm">{row.category}</td>
                      <td className="py-2.5 px-3 text-center">
                        <ScoreBadge score={row.score} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <ScoreBadge score={row.sessionRate} isPercent />
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">{row.sessions}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="py-2.5 pr-4 font-bold text-sm">全体平均</td>
                    <td className="py-2.5 px-3 text-center"><ScoreBadge score={0.930} /></td>
                    <td className="py-2.5 px-3 text-center"><ScoreBadge score={80.0} isPercent /></td>
                    <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">24/30</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* REFUND改善 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-semibold">返金（REFUND）— 自動返金対応実装後の予測</h3>
            <Badge variant="outline" className="text-amber-600 border-amber-400/40 bg-amber-50 text-xs">
              最優先課題 55.6% → 92%
            </Badge>
          </div>
          <Card>
            <CardContent className="pt-4 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">対象ケース</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">現在</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">実装後</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">改善幅</th>
                  </tr>
                </thead>
                <tbody>
                  {refundImprovements.map((row) => (
                    <tr key={row.case} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-sm">{row.case}</td>
                      <td className="py-2.5 px-3 text-center"><ScoreBadge score={row.current} /></td>
                      <td className="py-2.5 px-3 text-center"><ScoreBadge score={row.projected} /></td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-emerald-600 font-semibold text-xs">{row.delta}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3">
                詳細は <a href="/admin/refund" className="text-indigo-600 underline underline-offset-2">Refund ページ</a> を参照
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CONNECTION改善 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-blue-500" />
            <h3 className="text-base font-semibold">接続トラブル（CONNECTION）— 解決率向上施策</h3>
            <Badge variant="outline" className="text-blue-600 border-blue-400/40 bg-blue-50 text-xs">
              現在 90.9% → 目標 97%+
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            主な失敗原因：3ターン目以降の早期エスカレーション（「もう少し粘れば解決できた」ケース）
          </p>
          <div className="grid gap-3">
            {connectionImprovements.map((item, i) => (
              <Card key={i} className="border-l-4 border-l-blue-400">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{item.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${priorityColor[item.priority]}`}>
                          優先度: {item.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                      <span className="text-muted-foreground">改善幅</span>
                      <span className="text-emerald-600 font-bold">{item.impact}</span>
                      <span className="text-muted-foreground mt-1">目標スコア</span>
                      <span className="font-semibold">{item.targetScore}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 全施策実装後の予測 */}
          <Card className="mt-3 bg-blue-50 border-blue-200">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">全施策実装後の予測スコア</p>
                  <p className="text-xs text-blue-700 mt-0.5">CONNECTION: 0.932 → 0.970〜0.985 | セッション解決率: 90.9% → 97%+</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-700">全体平均スコア</p>
                  <p className="text-lg font-bold text-blue-900">0.960〜0.975</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* System Prompt */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Brain className="w-4 h-4 text-gray-600" />
              システムプロンプト（英語・GPT-4o に送信される指示）
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-64">
              {SYSTEM_PROMPT}
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              ※ プロンプトの変更はコード（server/routers/ai.ts）を編集してください。
            </p>
          </CardContent>
        </Card>

        {/* RAG Info */}
        <Card className="border border-gray-200 bg-gray-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">RAG（知識ベース）：</span>
              AIは回答時に「RAG Documents」に登録されたドキュメントを自動参照します。
              FAQ・サービス詳細・トラブルシューティングを登録することで回答精度が向上します。
              <a href="/admin/rag" className="ml-1 text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
                RAG Documents を管理する →
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
