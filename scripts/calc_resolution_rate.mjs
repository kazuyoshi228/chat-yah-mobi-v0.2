import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('scripts/simulation_results_v4.json', 'utf8'));

const sessions = data.sessions || [];
let totalTurns = 0;
let resolvedTurns = 0;
let resolvedSessions = 0;
const totalSessions = sessions.length;

const catStats = {};

sessions.forEach(s => {
  const scores = s.qualityScores || [];
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const resolved = avgScore >= 0.9;
  if (resolved) resolvedSessions++;

  const cat = s.category || 'unknown';
  if (!catStats[cat]) {
    catStats[cat] = { total: 0, resolved: 0 };
  }
  catStats[cat].total++;
  if (resolved) catStats[cat].resolved++;

  scores.forEach(score => {
    totalTurns++;
    if (score >= 0.9) resolvedTurns++;
  });
});

console.log('=== 解決率レポート ===');
console.log('セッション解決率:', (resolvedSessions / totalSessions * 100).toFixed(1) + '%', '(' + resolvedSessions + '/' + totalSessions + ')');
console.log('ターン解決率:', (resolvedTurns / totalTurns * 100).toFixed(1) + '%', '(' + resolvedTurns + '/' + totalTurns + ')');
console.log('');
console.log('カテゴリ別解決率:');
Object.entries(catStats).forEach(([cat, stat]) => {
  console.log(' ', cat + ':', (stat.resolved / stat.total * 100).toFixed(1) + '%', '(' + stat.resolved + '/' + stat.total + ')');
});

const allScores = sessions.flatMap(s => s.qualityScores || []);
const dist = { excellent: 0, good: 0, fair: 0, poor: 0 };
allScores.forEach(s => {
  if (s >= 0.95) dist.excellent++;
  else if (s >= 0.9) dist.good++;
  else if (s >= 0.8) dist.fair++;
  else dist.poor++;
});

console.log('');
console.log('スコア分布 (全' + allScores.length + 'ターン):');
console.log('  優秀 (>=0.95):', dist.excellent, '(' + (dist.excellent / allScores.length * 100).toFixed(1) + '%)');
console.log('  良好 (>=0.90):', dist.good, '(' + (dist.good / allScores.length * 100).toFixed(1) + '%)');
console.log('  普通 (>=0.80):', dist.fair, '(' + (dist.fair / allScores.length * 100).toFixed(1) + '%)');
console.log('  要改善 (<0.80):', dist.poor, '(' + (dist.poor / allScores.length * 100).toFixed(1) + '%)');
