import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Globe, TestTube, Terminal, CheckCircle, AlertCircle, Clock } from "lucide-react";

const sections = [
  {
    id: "http-api",
    icon: Globe,
    title: "HTTP API テスト",
    badge: "E2E",
    badgeVariant: "default" as const,
    description: "実際のLLM呼び出しを含むエンドツーエンドテスト。AIの応答品質・RAGヒット率・フォーム誘導の発火条件を本番に近い環境で検証します。",
    command: "pnpm test:e2e",
    configFile: "server/ai.e2e.test.ts",
    note: "実際のLLM/Embedding APIを呼び出すため、OpenAIクレジットを消費します。",
    tests: [
      { name: "返金不可ポリシーの説明（日本語・英語・韓国語）", status: "pass" },
      { name: "eSIM設定手順（日本語・英語・中国語）", status: "pass" },
      { name: "料金質問へのウェブサイト誘導", status: "pass" },
      { name: "フォーム誘導フラグ（10回以上 / 未解決シグナル）", status: "pass" },
      { name: "タイ語・ベトナム語での応答言語確認", status: "pass" },
      { name: "タイ語・ベトナム語での未解決シグナルによるフォーム誘導", status: "pass" },
      { name: "AIがオペレーター接続を提案しない", status: "pass" },
      { name: "RAGヒット率（日本語・英語・韓国語 10パターン）", status: "pass" },
    ],
  },
  {
    id: "vitest",
    icon: TestTube,
    title: "Vitestモックテスト",
    badge: "Unit",
    badgeVariant: "secondary" as const,
    description: "LLMをモック化したユニットテスト。AIロジック（言語検出・エスカレーション判定・フォーム誘導・コサイン類似度）を100パターンで高速検証します。",
    command: "pnpm test",
    configFile: "server/ai.logic.test.ts",
    note: "LLM呼び出しなし。クレジット消費なし。CI/CDに組み込み可能。",
    tests: [
      { name: "言語検出（日本語・韓国語・中国語・タイ語・ベトナム語・英語）", status: "pass" },
      { name: "エスカレーションキーワード判定（6言語 × 複数パターン）", status: "pass" },
      { name: "フォーム誘導ロジック（AI返信回数 × 未解決シグナル）", status: "pass" },
      { name: "コサイン類似度計算（同一・直交・ゼロベクトル）", status: "pass" },
      { name: "LLM障害時のフォールバックメッセージ（6言語）", status: "pass" },
    ],
  },
  {
    id: "heartbeat",
    icon: Clock,
    title: "Heartbeat — 週次自動化",
    badge: "Scheduled",
    badgeVariant: "secondary" as const,
    description: "Manus Heartbeatによる週次RAG embeddingチェック。毎週月曜09:00 UTCに自動実行し、embeddingが欠落しているRAGドキュメントをOpenAI APIで自動再生成します。",
    command: null,
    configFile: "server/_core/index.ts — /api/scheduled/check-rag-embeddings",
    note: "デプロイ後に有効化されます。Manus管理画面の Settings → Schedules で実行履歴を確認できます。",
    tests: [
      { name: "Task UID: mLfigxmjie4GmAZNPcj8Y8", status: "info" },
      { name: "Schedule: 毎週月曜 09:00 UTC（cron: 0 0 9 * * 1）", status: "info" },
      { name: "動作: embeddingがNULLのRAGドキュメントを検出 → OpenAI API で再生成 → DBに保存", status: "info" },
      { name: "レスポンス: { ok, totalDocs, nullEmbeddings, regenerated, failed, timestamp }", status: "info" },
    ],
  },
  {
    id: "server-scripts",
    icon: Terminal,
    title: "サーバーサイドスクリプト",
    badge: "Utility",
    badgeVariant: "outline" as const,
    description: "DBやAPIを直接操作するメンテナンス用スクリプト。RAGドキュメントのembedding再生成・状態確認などに使用します。",
    command: null,
    configFile: "scripts/",
    note: "本番DBに直接アクセスするため、実行前に内容を確認してください。",
    tests: [
      { name: "scripts/regenerate_rag_embeddings.mjs — 全RAGドキュメントのembeddingをOpenAI APIで再生成", status: "info", command: "node scripts/regenerate_rag_embeddings.mjs" },
      { name: "scripts/check_rag_embeddings.mjs — RAGドキュメントのembedding保存状態を確認", status: "info", command: "node scripts/check_rag_embeddings.mjs" },
      { name: "scripts/update_multilang_rag.mjs — 多言語RAGドキュメントの返金ポリシーを一括更新", status: "info", command: "node scripts/update_multilang_rag.mjs" },
    ],
  },
];

const statusIcon = (status: string) => {
  if (status === "pass") return <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
  if (status === "fail") return <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
  return <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />;
};

export default function AdminTesting() {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Testing</h1>
            <p className="text-sm text-muted-foreground">AIロジックの検証・メンテナンス用スクリプト</p>
          </div>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <Card key={section.id} className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <Badge variant={section.badgeVariant} className="text-xs">{section.badge}</Badge>
                </div>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Command */}
              {section.command && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">実行コマンド</p>
                  <code className="block bg-muted text-foreground text-sm px-3 py-2 rounded-md font-mono">
                    {section.command}
                  </code>
                </div>
              )}

              {/* Config file */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">テストファイル</p>
                <code className="block bg-muted text-foreground text-sm px-3 py-2 rounded-md font-mono">
                  {section.configFile}
                </code>
              </div>

              {/* Test cases */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">テストケース</p>
                <ul className="space-y-1.5">
                  {section.tests.map((test, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {statusIcon(test.status)}
                      <span className="text-foreground leading-snug">
                        {test.name}
                        {"command" in test && test.command && (
                          <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            {test.command}
                          </code>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Note */}
              <div className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{section.note}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
