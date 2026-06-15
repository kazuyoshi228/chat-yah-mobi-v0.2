import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Portal() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // If already logged in, redirect to the appropriate dashboard
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "operator") {
        navigate("/operator/chats");
      }
    }
  }, [user, loading, navigate]);

  const loginUrl = getLoginUrl();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
        <span
          className="text-sm font-semibold tracking-[0.18em] uppercase text-black cursor-pointer"
          onClick={() => navigate("/")}
        >
          YAH.MOBILE
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-10 text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-gray-400 mb-3">Staff Portal</p>
            <h1 className="text-3xl font-semibold text-black leading-tight">Portal</h1>
          </div>

          {/* Login cards */}
          <div className="flex flex-col gap-4">
            {/* Admin login */}
            <a
              href={loginUrl}
              className="group flex items-center justify-between px-6 py-5 border border-black rounded-xl bg-black text-white hover:bg-gray-900 transition-colors duration-150"
            >
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-1">Administrator</p>
                <p className="text-base font-semibold">Login · Admin</p>
              </div>
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

            {/* Operator login */}
            <a
              href={loginUrl}
              className="group flex items-center justify-between px-6 py-5 border border-gray-200 rounded-xl bg-white text-black hover:border-black hover:bg-gray-50 transition-colors duration-150"
            >
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-1">Operator</p>
                <p className="text-base font-semibold">Login · Operators</p>
              </div>
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

          {/* Note */}
          <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed">
            Staff accounts are managed by your administrator.<br />
            Contact your admin if you need access.
          </p>
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
