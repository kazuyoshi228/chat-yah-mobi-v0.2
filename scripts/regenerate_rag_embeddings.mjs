#!/usr/bin/env node
/**
 * Regenerate embeddings for all RAG documents that have NULL embedding.
 * Uses the same embedding API as the production code.
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

async function getEmbedding(text) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text.substring(0, 8000), // Truncate to avoid token limit
      model: "text-embedding-3-small",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

const conn = await createConnection(process.env.DATABASE_URL);

// Get all docs with NULL embedding
const [rows] = await conn.execute(
  "SELECT id, title, content FROM rag_documents WHERE embedding IS NULL ORDER BY id"
);

console.log(`Found ${rows.length} docs with NULL embedding. Regenerating...`);

let success = 0;
let failed = 0;

for (const row of rows) {
  try {
    console.log(`\nProcessing id=${row.id}: ${String(row.title).substring(0, 50)}`);
    const text = `${row.title}\n${row.content}`;
    const embedding = await getEmbedding(text);
    console.log(`  → Embedding generated: ${embedding.length} dimensions`);

    await conn.execute(
      "UPDATE rag_documents SET embedding = ? WHERE id = ?",
      [JSON.stringify(embedding), row.id]
    );
    console.log(`  → Saved to DB ✓`);
    success++;

    // Rate limit: wait 500ms between requests
    await new Promise((r) => setTimeout(r, 500));
  } catch (err) {
    console.error(`  → FAILED: ${err.message}`);
    failed++;
  }
}

console.log(`\n=== Done: ${success} succeeded, ${failed} failed ===`);

await conn.end();
