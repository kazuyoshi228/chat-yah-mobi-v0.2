/**
 * useChatSession - Firestore チャットセッション管理フック
 * - createSession(): chatSessions コレクションにドキュメントを作成
 * - endSession(): セッションのステータスを 'ended' に更新
 * - sessionId を返す
 */
import { useState, useCallback } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UseChatSessionReturn {
  sessionId: string | null;
  creating: boolean;
  createSession: (params: {
    visitorId: string;
    language: string;
    initialMessage?: string;
  }) => Promise<string>;
  endSession: () => Promise<void>;
}

export function useChatSession(): UseChatSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // セッションを作成
  const createSession = useCallback(
    async (params: {
      visitorId: string;
      language: string;
      initialMessage?: string;
    }): Promise<string> => {
      setCreating(true);
      try {
        const sessionsRef = collection(db, "chatSessions");
        const docRef = await addDoc(sessionsRef, {
          visitorId: params.visitorId,
          status: "active",
          language: params.language,
          initialMessage: params.initialMessage || null,
          createdAt: serverTimestamp(),
        });
        setSessionId(docRef.id);
        return docRef.id;
      } finally {
        setCreating(false);
      }
    },
    []
  );

  // セッションを終了
  const endSession = useCallback(async () => {
    if (!sessionId) return;
    const sessionRef = doc(db, "chatSessions", sessionId);
    await updateDoc(sessionRef, {
      status: "ended",
      endedAt: serverTimestamp(),
    });
  }, [sessionId]);

  return {
    sessionId,
    creating,
    createSession,
    endSession,
  };
}
