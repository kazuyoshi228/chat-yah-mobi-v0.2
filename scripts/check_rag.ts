import { listRagDocuments } from "../server/db";

async function main() {
  const docs = await listRagDocuments();
  docs.forEach(d => console.log(`id=${d.id} | ${d.title} | ${d.content.length} chars`));
  process.exit(0);
}

main().catch(console.error);
