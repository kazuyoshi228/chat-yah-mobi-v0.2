/**
 * LLM-as-Judge Weekly Evaluation Job
 *
 * Runs a lightweight set of AI quality checks using the LLM to evaluate
 * response quality across key support scenarios. Results are persisted to
 * test_run_logs and the owner is notified via Manus notification.
 *
 * Triggered by Heartbeat cron: every Monday 09:00 JST (00:00 UTC)
 * Endpoint: POST /api/scheduled/llm-judge
 */

import { generateAIResponse } from "./routers/ai";
import { createTestRunLog } from "./db";
import { notifyOwner } from "./_core/notification";

interface JudgeCase {
  id: string;
  description: string;
  message: string;
  language: "ja" | "en" | "zh" | "ko" | "th" | "vi";
  history?: { role: string; content: string }[];
  checks: {
    mustContainAny?: string[];
    mustNotContainAny?: string[];
    minLength?: number;
  };
}

// Core test cases — lightweight subset of ai.e2e.test.ts
const JUDGE_CASES: JudgeCase[] = [
  {
    id: "refund-ja",
    description: "返金ポリシーを日本語で説明する",
    message: "返金してほしいのですが",
    language: "ja",
    checks: {
      mustContainAny: ["返金", "キャンセル", "不可", "できません", "特定商取引"],
      mustNotContainAny: ["オペレーター", "担当者に繋"],
      minLength: 20,
    },
  },
  {
    id: "refund-en",
    description: "Refund policy explanation in English",
    message: "I want a refund",
    language: "en",
    checks: {
      mustContainAny: ["refund", "cancel", "non-refundable", "policy", "digital"],
      mustNotContainAny: ["connect you to a human", "transfer you to an operator"],
      minLength: 20,
    },
  },
  {
    id: "esim-setup-ja",
    description: "eSIMセットアップ手順を日本語で案内する",
    message: "eSIMの設定方法を教えてください",
    language: "ja",
    checks: {
      mustContainAny: ["設定", "インストール", "APN", "プロファイル", "QR"],
      minLength: 30,
    },
  },
  {
    id: "esim-setup-en",
    description: "eSIM setup instructions in English",
    message: "How do I set up my eSIM?",
    language: "en",
    checks: {
      mustContainAny: ["settings", "install", "profile", "QR", "APN", "activate"],
      minLength: 30,
    },
  },
  {
    id: "form-redirect-ja",
    description: "未解決シグナルでフォーム誘導が発火する",
    message: "まだ解決していません、何度も試しましたが動きません",
    language: "ja",
    history: Array.from({ length: 4 }, (_, i) => [
      { role: "visitor", content: `質問${i}` },
      { role: "ai", content: `回答${i}` },
    ]).flat(),
    checks: {
      mustContainAny: ["フォーム", "contact", "yah.mobi", "お問い合わせ", "CONTACT"],
    },
  },
  {
    id: "language-consistency-ko",
    description: "韓国語入力に韓国語で回答する",
    message: "eSIM 설정 방법을 알려주세요",
    language: "ko",
    checks: {
      mustContainAny: ["설정", "설치", "프로파일", "QR", "APN"],
      minLength: 20,
    },
  },
];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

interface CaseResult {
  id: string;
  description: string;
  passed: boolean;
  failReason?: string;
  responseLength: number;
  durationMs: number;
}

export async function runLlmJudgeJob(): Promise<{
  passed: number;
  failed: number;
  total: number;
  results: CaseResult[];
  durationMs: number;
}> {
  const jobStart = Date.now();
  const results: CaseResult[] = [];

  for (const tc of JUDGE_CASES) {
    const caseStart = Date.now();
    try {
      const response = await generateAIResponse(
        9999, // dummy sessionId for evaluation
        tc.message,
        tc.history ?? [],
        tc.language
      );

      const content = response.content;
      let failReason: string | undefined;

      // Check minimum length
      if (tc.checks.minLength && content.length < tc.checks.minLength) {
        failReason = `Response too short: ${content.length} < ${tc.checks.minLength}`;
      }

      // Check must-contain keywords
      if (!failReason && tc.checks.mustContainAny) {
        if (!containsAny(content, tc.checks.mustContainAny)) {
          failReason = `Missing required keywords: ${tc.checks.mustContainAny.join(", ")}`;
        }
      }

      // Check must-not-contain keywords
      if (!failReason && tc.checks.mustNotContainAny) {
        if (containsAny(content, tc.checks.mustNotContainAny)) {
          const found = tc.checks.mustNotContainAny.filter((kw) =>
            content.toLowerCase().includes(kw.toLowerCase())
          );
          failReason = `Forbidden keywords found: ${found.join(", ")}`;
        }
      }

      results.push({
        id: tc.id,
        description: tc.description,
        passed: !failReason,
        failReason,
        responseLength: content.length,
        durationMs: Date.now() - caseStart,
      });
    } catch (err) {
      results.push({
        id: tc.id,
        description: tc.description,
        passed: false,
        failReason: `Exception: ${String(err)}`,
        responseLength: 0,
        durationMs: Date.now() - caseStart,
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const durationMs = Date.now() - jobStart;

  // Persist to test_run_logs
  const failedCases = results.filter((r) => !r.passed);
  const details =
    failedCases.length > 0
      ? failedCases.map((r) => `[${r.id}] ${r.failReason}`).join("; ")
      : `All ${total} cases passed in ${durationMs}ms`;

  await createTestRunLog({
    testType: "llm-judge-weekly",
    status: failed === 0 ? "pass" : "fail",
    passed,
    failed,
    total,
    details,
    // triggeredBy is a user ID (int) — omit for heartbeat-triggered runs
  });

  // Notify owner
  const passRate = Math.round((passed / total) * 100);
  const statusEmoji = failed === 0 ? "✅" : failed <= 1 ? "⚠️" : "❌";
  const notifContent = [
    `${statusEmoji} 週次LLM品質評価: ${passed}/${total}件 通過 (${passRate}%)`,
    `実行時間: ${Math.round(durationMs / 1000)}秒`,
    "",
    ...results.map(
      (r) => `${r.passed ? "✅" : "❌"} [${r.id}] ${r.description}${r.failReason ? ` → ${r.failReason}` : ""}`
    ),
  ].join("\n");

  await notifyOwner({
    title: `LLM品質評価 ${statusEmoji} ${passed}/${total}件通過`,
    content: notifContent,
  });

  return { passed, failed, total, results, durationMs };
}
