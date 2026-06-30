/**
 * useFirebaseAuth - Firebase認証カスタムフック
 * - onAuthStateChanged で認証状態を監視
 * - 未ログイン時は匿名認証で自動サインイン
 * - { user, loading, isAnonymous } を返す
 */
import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface UseFirebaseAuthReturn {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
}

export function useFirebaseAuth(): UseFirebaseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証状態の変更を監視
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ユーザーがログイン済み
        setUser(firebaseUser);
        setLoading(false);
      } else {
        // 未ログイン → 匿名認証で自動サインイン
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged が再度発火するため、ここでは setUser しない
        } catch (error) {
          console.error("[useFirebaseAuth] 匿名認証に失敗:", error);
          setLoading(false);
        }
      }
    });

    // クリーンアップ: リスナーを解除
    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? true,
  };
}
