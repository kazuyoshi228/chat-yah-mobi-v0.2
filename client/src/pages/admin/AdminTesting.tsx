import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Globe,
  TestTube,
  Terminal,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  RefreshCw,
  Info,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

// ── helpers ─────────────────────────────────────────────────────────────────

const statusIcon = (status: string) => {
  if (status === "pass") return <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
  if (status === "fail") return <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
  return <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />;
};

const formatDate = (d: Date | string | null | undefined) => {
  if (!d) return "未実行";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── static test case definitions ────────────────────────────────────────────

const E2E_TESTS = [
  { name: "返金不可ポリシーの説明（日本語・英語・韓国語）", status: "pass" },
  { name: "eSIM設定手順（日本語・英語・中国語）", status: "pass" },
  { name: "料金質問へのウェブサイト誘導", status: "pass" },
  { name: "フォーム誘導フラグ（10回以上 / 未解決シグナル）", status: "pass" },
  { name: "タイ語・ベトナム語での応答言語確認", status: "pass" },
  { name: "タイ語・ベトナム語での未解決シグナルによるフォーム誘導", status: "pass" },
  { name: "AIがオペレーター接続を提案しない", status: "pass" },
  { name: "RAGヒット率（日本語・英語・韓国語 10パターン）", status: "pass" },
];

const VITEST_TESTS = [
  { name: "言語検出（日本語・韓国語・中国語・タイ語・ベトナム語・英語）", status: "pass" },
  { name: "エスカレーションキーワード判定（6言語 × 複数パターン）", status: "pass" },
  { name: "フォーム誘導ロジック（AI返信回数 × 未解決シグナル）", status: "pass" },
  { name: "コサイン類似度計算（同一・直交・ゼロベクトル）", status: "pass" },
  { name: "LLM障害時のフォールバックメッセージ（6言語）", status: "pass" },
];

const HEARTBEAT_TESTS = [
  { name: "Task UID: mLfigxmjie4GmAZNPcj8Y8", status: "info" },
  { name: "Schedule: 毎週月曜 09:00 UTC（cron: 0 0 9 * * 1）", status: "info" },
  { name: "動作: embeddingがNULLのRAGドキュメントを検出 → OpenAI API で再生成 → DBに保存", status: "info" },
  { name: "レスポンス: { ok, totalDocs, nullEmbeddings, regenerated, failed, timestamp }", status: "info" },
];

// ── sub-components ───────────────────────────────────────────────────────────

function LastRunBadge({
  log,
}: {
  log?: { status: string; passed: number; failed: number; total: number; ranAt: Date | string } | null;
}) {
  if (!log) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" /> 未実行
      </span>
    );
  }
  const isPass = log.status === "pass";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge
        variant={isPass ? "default" : "destructive"}
        className={`text-xs ${isPass ? "bg-green-500/10 text-green-600 border-green-200" : ""}`}
      >
        {isPass ? "PASS" : "FAIL"} {log.passed}/{log.total}
      </Badge>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDate(log.ranAt)}
      </span>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function AdminTesting() {
  const { data: latestLogs, refetch: refetchLogs } = trpc.admin.getLatestTestRunLogs.useQuery();
  const [runningId, setRunningId] = useState<string | null>(null);

  const regenerateEmbeddings = trpc.admin.runRegenerateEmbeddings.useMutation({
    onSuccess: (data) => {
      toast.success(`Embedding再生成完了: ${data.fixed}/${data.total} 件`);
      refetchLogs();
      setRunningId(null);
    },
    onError: (e) => {
      toast.error(`エラー: ${e.message}`);
      setRunningId(null);
    },
  });

  const runVitestMock = trpc.admin.runVitestMock.useMutation({
    onSuccess: (data) => {
      if (data.status === "pass") {
        toast.success(`Vitestテスト完了: ${data.passed} 件通過`);
      } else {
        toast.error(`Vitestテスト失敗: ${data.failed} 件失敗`);
      }
      refetchLogs();
      setRunningId(null);
    },
    onError: (e) => {
      toast.error(`エラー: ${e.message}`);
      setRunningId(null);
    },
  });

  const ragLog = latestLogs?.find((l) => l.testType === "rag-embedding-check");
  const vitestLog = latestLogs?.find((l) => l.testType === "vitest-mock");

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

        {/* ── HTTP API テスト ─────────────────────────────────────────────── */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">HTTP API テスト</CardTitle>
                <Badge variant="default" className="text-xs">E2E</Badge>
              </div>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              実際のLLM呼び出しを含むエンドツーエンドテスト。AIの応答品質・RAGヒット率・フォーム誘導の発火条件を本番に近い環境で検証します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">実行コマンド</p>
              <code className="block bg-muted text-foreground text-sm px-3 py-2 rounded-md font-mono">
                pnpm test:e2e
              </code>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">テストファイル</p>
              <code className="block bg-muted text-foreground text-sm px-3 py-2 rounded-md font-mono">
                server/ai.e2e.test.ts
              </code>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">テストケース</p>
              <ul className="space-y-1.5">
                {E2E_TESTS.map((test, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {statusIcon(test.status)}
                    <span className="text-foreground leading-snug">{test.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                実際のLLM/Embedding APIを呼び出すため、OpenAIクレジットを消費します。コマンドラインから実行してください。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Vitestモックテスト ──────────────────────────────────────────── */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Vitestモックテスト</CardTitle>
                <Badge variant="secondary" className="text-xs">Unit</Badge>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <LastRunBadge log={vitestLog} />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  disabled={runningId !== null}
                  onClick={() => {
                    setRunningId("vitest");
                    runVitestMock.mutate();
                  }}
                >
                  {runningId === "vitest" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  今すぐ実行
                </Button>
              </div>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              LLMをモック化したユニットテスト。AIロジック（言語検出・エスカレーション判定・フォーム誘導・コサイン類似度）を100パターンで高速検証します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">実行コマンド</p>
              <code className="block bg-muted text-foreground text-sm px-3 py-2 rounded-md font-mono">
                pnpm test
              </code>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">テストファイル</p>
              <code className="block bg-muted text-foreground text-sm px-3 py-2 rounded-md font-mono">
                server/ai.logic.test.ts
              </code>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">テストケース</p>
              <ul className="space-y-1.5">
                {VITEST_TESTS.map((test, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {statusIcon(test.status)}
                    <span className="text-foreground leading-snug">{test.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            {vitestLog && (
              <div className="bg-muted/50 rounded-md px-3 py-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">最終実行結果</p>
                <p className="text-xs text-foreground">{vitestLog.details ?? "詳細なし"}</p>
              </div>
            )}
            <div className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">LLM呼び出しなし。クレジット消費なし。CI/CDに組み込み可能。</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Heartbeat ──────────────────────────────────────────────────── */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Heartbeat — 週次自動化</CardTitle>
                <Badge variant="secondary" className="text-xs">Scheduled</Badge>
              </div>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              Manus Heartbeatによる週次RAG embeddingチェック。毎週月曜09:00 UTCに自動実行し、embeddingが欠落しているRAGドキュメントをOpenAI APIで自動再生成します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">テストファイル</p>
              <code className="block bg-muted text-foreground text-sm px-3 py-2 rounded-md font-mono">
                server/_core/index.ts — /api/scheduled/check-rag-embeddings
              </code>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">詳細</p>
              <ul className="space-y-1.5">
                {HEARTBEAT_TESTS.map((test, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {statusIcon(test.status)}
                    <span className="text-foreground leading-snug">{test.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                デプロイ後に有効化されます。Manus管理画面の Settings → Schedules で実行履歴を確認できます。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── サーバーサイドスクリプト ────────────────────────────────────── */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">サーバーサイドスクリプト</CardTitle>
                <Badge variant="outline" className="text-xs">Utility</Badge>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <LastRunBadge log={ragLog} />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  disabled={runningId !== null}
                  onClick={() => {
                    setRunningId("rag");
                    regenerateEmbeddings.mutate();
                  }}
                >
                  {runningId === "rag" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Embedding再生成
                </Button>
              </div>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              DBやAPIを直接操作するメンテナンス用スクリプト。RAGドキュメントのembedding再生成・状態確認などに使用します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">スクリプト一覧</p>
              <ul className="space-y-1.5">
                {[
                  {
                    name: "scripts/regenerate_rag_embeddings.mjs — 全RAGドキュメントのembeddingをOpenAI APIで再生成",
                    command: "node scripts/regenerate_rag_embeddings.mjs",
                  },
                  {
                    name: "scripts/check_rag_embeddings.mjs — RAGドキュメントのembedding保存状態を確認",
                    command: "node scripts/check_rag_embeddings.mjs",
                  },
                  {
                    name: "scripts/update_multilang_rag.mjs — 多言語RAGドキュメントの返金ポリシーを一括更新",
                    command: "node scripts/update_multilang_rag.mjs",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-foreground leading-snug">
                      {item.name}
                      <code className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                        {item.command}
                      </code>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {ragLog && (
              <div className="bg-muted/50 rounded-md px-3 py-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">最終実行結果</p>
                <p className="text-xs text-foreground">{ragLog.details ?? "詳細なし"}</p>
              </div>
            )}
            <div className="flex items-start gap-2 bg-muted/50 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                本番DBに直接アクセスするため、実行前に内容を確認してください。「Embedding再生成」ボタンはembeddingが欠落したドキュメントのみ対象です。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
