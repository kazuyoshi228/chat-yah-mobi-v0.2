#!/usr/bin/env node
/**
 * Check RAG document embedding status in DB
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(
  "SELECT id, title, embedding IS NOT NULL as has_embedding, LENGTH(CAST(embedding AS CHAR)) as emb_len FROM rag_documents ORDER BY id"
);

console.log("RAG Documents:");
for (const row of rows) {
  console.log(
    `  id=${row.id} | title=${String(row.title).substring(0, 50)} | has_embedding=${row.has_embedding} | emb_len=${row.emb_len}`
  );
}
console.log(`Total: ${rows.length} docs`);

await conn.end();
