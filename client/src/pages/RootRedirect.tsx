import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

/**
 * ルートアクセス時にログイン状態とロールに応じて適切なページへリダイレクトする。
 * - admin  → /admin
 * - 未ログイン / その他 → Manus OAuth ログインページ
 */
export default function RootRedirect() {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (user.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      // 非adminユーザーはログインページへ
      window.location.href = getLoginUrl();
    }
  }, [user, isLoading, navigate]);

  return null;
}
