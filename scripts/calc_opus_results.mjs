import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("/home/ubuntu/yah-chat-webdev/scripts/simulation_results_claude_opus_4_7.json", "utf8"));
// Category scores
const cats = data.summary?.categories || {};
console.log("=== Claude Opus 4.7 品質スコア ===");
let totalScores = [];
Object.entries(cats).forEach(([cat, v]) => {
  console.log(`  ${cat}: ${v.avg.toFixed(3)} (min:${v.min.toFixed(3)} max:${v.max.toFixed(3)} turns:${v.count})`);
  for (let i = 0; i < v.count; i++) totalScores.push(v.avg);
});

// Session resolution rate (avg score >= 0.90 per session)
const sessions = data.sessions || [];
let total = 0, resolved = 0;
const catRes = {};
sessions.forEach(s => {
  total++;
  const cat = s.category;
  if (!catRes[cat]) catRes[cat] = { total: 0, resolved: 0 };
  catRes[cat].total++;
  const scores = s.qualityScores || [];
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  if (avg >= 0.90) {
    resolved++;
    catRes[cat].resolved++;
  }
});

console.log("\n=== セッション解決率 ===");
console.log(`全体: ${(resolved / total * 100).toFixed(1)}% (${resolved}/${total})`);
Object.entries(catRes).forEach(([cat, v]) => {
  console.log(`  ${cat}: ${(v.resolved / v.total * 100).toFixed(1)}% (${v.resolved}/${v.total})`);
});

// Overall avg
const allScores = Object.values(cats).flatMap(v => Array(v.count).fill(v.avg));
const overall = allScores.reduce((a, b) => a + b, 0) / allScores.length;
console.log(`\n全体平均スコア: ${overall.toFixed(3)}`);

// Compare with GPT-4o
console.log("\n=== GPT-4o比較 ===");
const gpt4oScores = {
  connection: 0.932,
  pricing: 0.936,
  refund: 0.920,
  general: 0.938,
  overall: 0.930,
  resolution: 80.0,
};
Object.entries(cats).forEach(([cat, v]) => {
  const diff = v.avg - (gpt4oScores[cat] || 0);
  const sign = diff >= 0 ? "+" : "";
  console.log(`  ${cat}: ${v.avg.toFixed(3)} vs GPT-4o ${(gpt4oScores[cat] || 0).toFixed(3)} (${sign}${diff.toFixed(3)})`);
});
const overallDiff = overall - gpt4oScores.overall;
console.log(`  全体: ${overall.toFixed(3)} vs GPT-4o 0.930 (${overallDiff >= 0 ? "+" : ""}${overallDiff.toFixed(3)})`);
const resDiff = (resolved / total * 100) - gpt4oScores.resolution;
console.log(`  解決率: ${(resolved / total * 100).toFixed(1)}% vs GPT-4o 80.0% (${resDiff >= 0 ? "+" : ""}${resDiff.toFixed(1)}pt)`);
