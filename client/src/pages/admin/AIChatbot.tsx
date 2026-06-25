import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bot, Brain, Globe, MessageSquare, ShieldAlert, Target } from "lucide-react";

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
