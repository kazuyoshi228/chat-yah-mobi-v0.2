import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Brain, Globe, MessageSquare, ShieldAlert, Zap } from "lucide-react";

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
            <h1 className="text-2xl font-bold text-gray-900">AI Chatbot</h1>
            <p className="text-sm text-gray-500 mt-0.5">yah.mobile カスタマーサポートAI</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">モデル</p>
              <p className="text-lg font-bold text-gray-900 mt-1">Claude Opus 4.8</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">目標解決率</p>
              <p className="text-lg font-bold text-gray-900 mt-1">≥90%</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">対応言語</p>
              <p className="text-lg font-bold text-gray-900 mt-1">6言語</p>
            </CardContent>
          </Card>
        </div>

        {/* Languages */}
        <Card className="border bg-blue-50 border-blue-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Globe className="w-4 h-4 text-blue-600" />
              対応言語
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "日本語", code: "ja" },
                { label: "English", code: "en" },
                { label: "中文", code: "zh" },
                { label: "한국어", code: "ko" },
                { label: "ไทย", code: "th" },
                { label: "Tiếng Việt", code: "vi" },
              ].map((l) => (
                <Badge key={l.code} variant="secondary" className="text-sm px-3 py-1">
                  {l.label}
                  <span className="ml-1.5 text-xs text-gray-400 font-mono">{l.code}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Core Behavior */}
        <Card className="border bg-green-50 border-green-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <MessageSquare className="w-4 h-4 text-green-600" />
              応対スタイル
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />Ritz-Carlton 3 Steps + Disney HEARD Method + OONAS（おもてなし5原則）を統合</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />感情レベル4段階に応じた対応（冷静→不安→不満→怒り）</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />「できません」禁止 → 代替案を必ず提示</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />eSIM設定は具体的メニューパスで案内</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />「確認します」「オペレーターに繋ぎます」は禁止 — 必ず自力で回答</li>
            </ul>
          </CardContent>
        </Card>

        {/* Escalation / Form Redirect */}
        <Card className="border bg-orange-50 border-orange-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
              フォーム転送ルール
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />個人情報・アカウント固有の問題 → yah.mobi/app CONTACTフォームへ誘導</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />返金要求 → 特商法15条の3を説明。例外（二重課金・未発行・不正利用）のみフォームへ</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />10回応答しても未解決 → 自動でフォーム誘導</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />5回以上 + 未解決シグナル検出 → 自動でフォーム誘導</li>
            </ul>
          </CardContent>
        </Card>

        {/* Dynamic Context */}
        <Card className="border bg-purple-50 border-purple-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Zap className="w-4 h-4 text-purple-600" />
              動的コンテキスト注入
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />DB最新プラン情報（価格・容量・期間）を毎回取得して注入</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />顧客プロファイル（購入履歴・eSIMステータス）をメールで照合</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />システムヘルス（OMAX API障害時）を自動検知して応答に反映</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />RAGドキュメント（コサイン類似度検索、最大7件）</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />フローツリーコンテキスト（カテゴリ・端末・ステージ）</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />30メッセージ超の長会話は自動要約 + 直近20件を送信</li>
            </ul>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Brain className="w-4 h-4 text-gray-600" />
              システムプロンプト構造
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 font-mono leading-relaxed space-y-1">
              <p className="text-gray-400"># 構成（server/routers/ai.ts）</p>
              <p>1. About yah.mobile（サービス概要 + 動的プラン情報）</p>
              <p>2. Response Style & Hospitality Standards</p>
              <p className="pl-4 text-gray-500">- Ritz-Carlton 3 Steps / HEARD / Emotion Matrix</p>
              <p className="pl-4 text-gray-500">- De-escalation / Forbidden Expressions / OONAS</p>
              <p>3. General Guidelines（目標99.9%解決）</p>
              <p>4. Flow Context（デシジョンツリー状態）</p>
              <p>5. Rules for Unanswerable Questions</p>
              <p>6. Knowledge Base（RAG検索結果）</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              プロンプト変更は server/routers/ai.ts を編集してください。
            </p>
          </CardContent>
        </Card>

        {/* RAG link */}
        <Card className="border border-gray-200 bg-gray-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">RAG（知識ベース）：</span>
              AIは回答時にRAG Documentsを自動参照します。FAQ・トラブルシューティングを登録することで回答精度が向上します。
              <a href="/admin/rag" className="ml-1 text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
                RAG Documents →
              </a>
            </p>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
