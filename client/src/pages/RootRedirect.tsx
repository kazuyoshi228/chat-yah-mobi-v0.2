import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * ルートアクセス時にログイン状態とロールに応じて適切なページへリダイレクトする。
 * - admin  → /admin
 * - operator → /ops/chats
 * - 未ログイン / その他 → /portal
 */
export default function RootRedirect() {
  const [, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/portal", { replace: true });
      return;
    }
    if (user.role === "admin") {
      navigate("/admin", { replace: true });
    } else if (user.role === "operator") {
      navigate("/ops/chats", { replace: true });
    } else {
      navigate("/portal", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
}
