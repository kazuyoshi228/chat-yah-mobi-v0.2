import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// Google OAuth login URL — server handles the redirect
const GOOGLE_LOGIN_URL = "/api/auth/google";

export default function Portal() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Check for error params from OAuth callback
  const params = new URLSearchParams(window.location.search);
  const errorCode = params.get("error");
  const errorMessages: Record<string, string> = {
    google_auth_failed: "Google 認証に失敗しました。もう一度お試しください。",
    token_exchange_failed: "認証トークンの取得に失敗しました。",
    access_denied: "このアカウントはアクセス権限がありません。管理者にお問い合わせください。",
    no_email: "Google アカウントのメールアドレスを取得できませんでした。",
    internal_error: "内部エラーが発生しました。しばらくしてからお試しください。",
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
        <img
          src="/manus-storage/yah-mobile-logo-horizontal_8744efd4.svg"
          alt="yah.mobile"
          className="h-7 w-auto object-contain cursor-pointer"
          onClick={() => navigate("/")}
        />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold text-black leading-tight">chat.yah.mobile Portal</h1>
          </div>

          {/* Error message */}
          {errorCode && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
              {errorMessages[errorCode] ?? "ログインに失敗しました。"}
            </div>
          )}

          {/* Login button */}
          <a
            href={GOOGLE_LOGIN_URL}
            className="group flex items-center justify-between px-6 py-5 border border-black rounded-xl bg-black text-white hover:bg-gray-900 transition-colors duration-150"
          >
            <p className="text-base font-semibold flex items-center gap-2">
              <GoogleIcon className="w-4 h-4" />
              Google でログイン
            </p>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform duration-150"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>


        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 tracking-wide">
          © {new Date().getFullYear()} yah.mobile — Internal Use Only
        </p>
      </footer>
    </div>
  );
}

// Google logo SVG icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
