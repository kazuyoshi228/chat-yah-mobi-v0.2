import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { YahLogo } from "@/components/YahLogo";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CheckIn() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // ログイン済みなら /admin にリダイレクト
  useEffect(() => {
    if (!loading && user) {
      setLocation("/admin");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-black">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.25_0_0),transparent)]" />

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10">
        <YahLogo className="text-white" height={36} />
        <div className="space-y-4">
          <p className="text-white/40 text-xs tracking-widest uppercase">yah.mobile</p>
          <h2 className="text-white text-3xl font-semibold leading-snug tracking-tight">
            Chat Support<br />Admin Portal
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Manage conversations, monitor AI performance, and deliver world-class support.
          </p>
        </div>
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} yah.mobile. All rights reserved.
        </p>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex flex-1 items-center justify-center p-8 relative z-10">
        <div
          className="w-full max-w-sm rounded-2xl p-8 space-y-8"
          style={{
            background: "oklch(0.12 0 0)",
            border: "1px solid oklch(0.22 0 0)",
            boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)",
          }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center">
            <YahLogo className="text-white" height={28} />
          </div>

          <div className="space-y-2">
            <h1 className="text-white text-xl font-semibold tracking-tight">
              Admin Sign In
            </h1>
            <p className="text-white/40 text-sm">
              yah.mobi または bonfire.co.jp アカウントでサインイン
            </p>
          </div>

          <button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="group w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 active:scale-[0.97]"
            style={{
              background: "oklch(1 0 0)",
              color: "oklch(0.1 0 0)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "oklch(0.92 0 0)")}
            onMouseLeave={e => (e.currentTarget.style.background = "oklch(1 0 0)")}
          >
            {/* Google icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <p className="text-white/20 text-xs text-center">
            管理者権限のあるアカウントのみアクセス可能です
          </p>
        </div>
      </div>
    </div>
  );
}
