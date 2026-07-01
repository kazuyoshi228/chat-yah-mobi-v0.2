import { getDb } from "../server/db";
import { chat_quick_replies } from "../drizzle/schema";
import { asc } from "drizzle-orm";

async function main() {
  const db = await getDb();

  // 全クイック返信を作成日昇順で取得
  const all = await db
    .select()
    .from(chat_quick_replies)
    .orderBy(asc(chat_quick_replies.createdAt));

  console.log("全クイック返信一覧:");
  all.forEach((r) => console.log(`  id=${r.id}: ${r.title}`));

  // 最初の5本（カテゴリタグなし）を特定してタグを付与
  const tagMap: Record<string, string> = {
    "対応開始の挨拶": "【開始】対応開始の挨拶",
    "接続トラブル対応": "【接続】接続トラブル対応",
    "インストール手順案内": "【設定】インストール手順案内",
    "QRコード再発行の受付": "【QR】QRコード再発行の受付",
    "問題解決の確認クローズ": "【クローズ】問題解決の確認クローズ",
  };

  let updatedCount = 0;
  for (const reply of all) {
    const newTitle = tagMap[reply.title ?? ""];
    if (newTitle) {
      await db
        .update(chat_quick_replies)
        .set({ title: newTitle })
        .where(
          (await import("drizzle-orm")).eq(chat_quick_replies.id, reply.id)
        );
      console.log(`✓ 更新: "${reply.title}" → "${newTitle}"`);
      updatedCount++;
    }
  }

  console.log(`\n${updatedCount}件更新完了`);
  process.exit(0);
}

main().catch(console.error);
