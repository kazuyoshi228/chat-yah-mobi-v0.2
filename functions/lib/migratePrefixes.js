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
exports.migratePrefixes = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.migratePrefixes = (0, https_1.onRequest)({ region: "asia-northeast1", timeoutSeconds: 540 }, async (_req, res) => {
    try {
        const collectionsToMigrate = [
            { old: "ragDocuments", new: "chat_rag_documents" },
            { old: "chatFlowNodes", new: "chat_flow_nodes" },
            { old: "quickReplies", new: "chat_quick_replies" },
            { old: "surveys", new: "chat_surveys" },
            { old: "chatSessions", new: "chat_sessions" }
        ];
        const results = {};
        for (const mapping of collectionsToMigrate) {
            const oldDocs = await db.collection(mapping.old).get();
            if (oldDocs.empty) {
                results[mapping.old] = 0;
                continue;
            }
            let count = 0;
            let batch = db.batch();
            let batchCount = 0;
            for (const doc of oldDocs.docs) {
                // Copy to new collection with same ID
                const newRef = db.collection(mapping.new).doc(doc.id);
                batch.set(newRef, doc.data());
                // Delete from old collection
                batch.delete(doc.ref);
                count++;
                batchCount += 2; // set + delete = 2 ops
                // Subcollection migration for chatSessions
                if (mapping.old === "chatSessions") {
                    const messages = await doc.ref.collection("messages").get();
                    for (const msg of messages.docs) {
                        const newMsgRef = newRef.collection("chat_messages").doc(msg.id);
                        batch.set(newMsgRef, msg.data());
                        batch.delete(msg.ref);
                        batchCount += 2;
                    }
                }
                if (batchCount >= 400) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            }
            if (batchCount > 0) {
                await batch.commit();
            }
            results[mapping.old] = count;
        }
        res.json({ success: true, message: "Migration completed.", results });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
//# sourceMappingURL=migratePrefixes.js.map