/**
 * useFirebaseAuth - Firebase認証カスタムフック
 * - 未ログイン時は匿名認証で自動サインイン
 * - お客様ログイン/新規登録（Google ＋ メール/パスワード）を提供
 *   - 新規: 匿名アカウントを昇格（uid継続 → 会話そのまま継続）
 *   - 既存: 本人アカウントへサインイン → claimSession でセッション所有者を付け替え（会話継続）
 */
import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  linkWithPopup,
  linkWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  GoogleAuthProvider,
  EmailAuthProvider,
  signOut,
  type User,
  type AuthError,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, googleProvider, app } from "@/lib/firebase";

const claimSessionFn = httpsCallable(
  getFunctions(app, "asia-northeast1"),
  "claimSession"
);
const ssoExchangeFn = httpsCallable(
  getFunctions(app, "asia-northeast1"),
  "ssoExchange"
);

/** 既存アカウントへ切替時: 匿名セッションの所有者を本人uidへ付け替え（会話継続） */
async function claimIfNeeded(sessionId?: string, anonToken?: string | null) {
  if (!sessionId || !anonToken) return;
  try {
    await claimSessionFn({ sessionId, anonIdToken: anonToken });
  } catch (e) {
    console.error("[useFirebaseAuth] claimSession 失敗:", e);
  }
}

/** 親ページ(yah.mobi)へ IDトークンを要求し、応答（token/none）を待つ。タイムアウトで null。 */
function requestParentIdToken(parentOrigin: string): Promise<string | null> {
  if (typeof window === "undefined" || window.parent === window) return Promise.resolve(null);
  return new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(timer);
      resolve(v);
    };
    const onMsg = (event: MessageEvent) => {
      if (event.origin !== parentOrigin) return;
      const d = event.data as { type?: string; token?: unknown };
      if (!d || typeof d !== "object") return;
      if (d.type === "yah:auth-token" && typeof d.token === "string") finish(d.token);
      else if (d.type === "yah:auth-none") finish(null);
    };
    const timer = setTimeout(() => finish(null), 4000);
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "yah:request-auth" }, parentOrigin);
  });
}

interface UseFirebaseAuthReturn {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  signInWithGoogle: (sessionId?: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (
    email: string,
    password: string,
    sessionId?: string
  ) => Promise<void>;
  /** 埋め込み時: 親ページ(yah.mobi)のログインを引き継いでサインイン。成功時 true */
  signInWithParentSso: (parentOrigin: string, sessionId?: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
}

export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        // 未ログイン → 匿名認証で自動サインイン
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("[useFirebaseAuth] 匿名認証に失敗:", error);
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Google: 新規は匿名昇格（uid継続）、既存はサインイン＋claim
  const signInWithGoogle = useCallback(async (sessionId?: string) => {
    const anon = auth.currentUser;
    const anonToken = anon?.isAnonymous ? await anon.getIdToken() : null;
    try {
      if (anon?.isAnonymous) {
        await linkWithPopup(anon, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (e) {
      const err = e as AuthError;
      if (err.code === "auth/credential-already-in-use") {
        const cred = GoogleAuthProvider.credentialFromError(err);
        if (!cred) throw e;
        await signInWithCredential(auth, cred);
        await claimIfNeeded(sessionId, anonToken);
      } else {
        throw e;
      }
    }
  }, []);

  // メール新規登録: 匿名昇格（uid継続 → 会話継続）
  const registerWithEmail = useCallback(
    async (email: string, password: string) => {
      const anon = auth.currentUser;
      if (anon?.isAnonymous) {
        const cred = EmailAuthProvider.credential(email, password);
        await linkWithCredential(anon, cred);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    },
    []
  );

  // メールログイン: 既存アカウントへサインイン＋claim（会話継続）
  const signInWithEmail = useCallback(
    async (email: string, password: string, sessionId?: string) => {
      const anon = auth.currentUser;
      const anonToken = anon?.isAnonymous ? await anon.getIdToken() : null;
      await signInWithEmailAndPassword(auth, email, password);
      await claimIfNeeded(sessionId, anonToken);
    },
    []
  );

  // SSO: 親ページの IDトークン → ssoExchange でカスタムトークン → 同一 uid でサインイン
  //      （既存の匿名セッションは claimSession で引き継ぐ）
  const signInWithParentSso = useCallback(
    async (parentOrigin: string, sessionId?: string): Promise<boolean> => {
      const anon = auth.currentUser;
      if (anon && !anon.isAnonymous) return false; // 既にログイン済み
      const anonToken = anon?.isAnonymous ? await anon.getIdToken() : null;

      const idToken = await requestParentIdToken(parentOrigin);
      if (!idToken) return false; // 親が未ログイン or 応答なし

      try {
        const res = await ssoExchangeFn({ idToken });
        const customToken = (res.data as { token?: string })?.token;
        if (!customToken) return false;
        await signInWithCustomToken(auth, customToken);
        await claimIfNeeded(sessionId, anonToken);
        return true;
      } catch (e) {
        console.error("[useFirebaseAuth] SSO 失敗:", e);
        return false;
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    // onAuthStateChanged が null を検知 → 匿名で再サインイン（上の effect）
  }, []);

  return {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? true,
    signInWithGoogle,
    registerWithEmail,
    signInWithEmail,
    signInWithParentSso,
    signOutUser,
  };
}
