import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const seedRagDocs = onRequest(
  { region: "asia-northeast1", timeoutSeconds: 300 },
  async (_req, res) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Delete existing RAG docs to avoid duplicates
      const existing = await db.collection("ragDocuments").get();
      if (!existing.empty) {
        const delBatch = db.batch();
        existing.forEach(doc => delBatch.delete(doc.ref));
        await delBatch.commit();
      }

      // Read extracted docs
      const jsonPath = path.join(__dirname, "ragDocs.json");
      if (!fs.existsSync(jsonPath)) {
        res.status(404).json({ error: "ragDocs.json not found" });
        return;
      }

      const docs = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      
      let totalInserted = 0;
      let batch = db.batch();
      let count = 0;

      for (const doc of docs) {
        const ref = db.collection("ragDocuments").doc();
        batch.set(ref, {
          title: doc.title,
          content: doc.content,
          category: doc.category || "general",
          createdAt: now,
          updatedAt: now,
        });

        count++;
        totalInserted++;

        if (count === 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      res.json({ success: true, message: `Inserted ${totalInserted} RAG documents.` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  }
);
