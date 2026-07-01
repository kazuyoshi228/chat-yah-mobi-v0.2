/**
 * ルートアクセス時に /admin へリダイレクト
 * Firebase Auth 版 — AdminAuthGuard がログイン画面を処理
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RootRedirect() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/admin", { replace: true });
  }, [navigate]);

  return null;
}
