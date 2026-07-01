"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRagDocs = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.seedRagDocs = (0, https_1.onRequest)({ region: "asia-northeast1", timeoutSeconds: 300 }, async (_req, res) => {
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
//# sourceMappingURL=seedRagDocs.js.map