import { useAdminAuth } from "@/contexts/AuthContext";
import { YahLogo } from "@/components/YahLogo";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CheckIn() {
  const { user, loading, login } = useAdminAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/admin");
    }
  }, [loading, user, setLocation]);

  const pageStyle: React.CSSProperties = {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#000",
    overflow: "hidden",
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 24, height: 24, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.2)",
          borderTopColor: "#fff",
          animation: "checkin-spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes checkin-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Background grid */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.04,
        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      {/* Radial glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(60,60,60,1), transparent)",
      }} />

      {/* Left panel — branding (desktop only) */}
      <div className="checkin-left" style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: "50%",
        padding: "48px",
        zIndex: 10,
        display: "none",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        <YahLogo className="text-white" height={36} />
        <div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>yah.mobile</p>
          <h2 style={{ color: "#fff", fontSize: 28, fontWeight: 600, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 12, marginTop: 0 }}>
            Chat Support<br />Admin Portal
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
            Manage conversations, monitor AI performance, and deliver world-class support.
          </p>
        </div>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, margin: 0 }}>
          © {new Date().getFullYear()} yah.mobile. All rights reserved.
        </p>
      </div>

      {/* Right panel — sign in card (centered) */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        left: 0,
        zIndex: 10,
        display: "grid",
        placeItems: "center",
        padding: 32,
      }} className="checkin-right">
        <div style={{
          width: "100%", maxWidth: 360, borderRadius: 16, padding: 32,
          background: "rgba(20,20,20,1)",
          border: "1px solid rgba(60,60,60,1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}>
          {/* Logo */}
          <div style={{ display: "grid", placeItems: "center", marginBottom: 24 }}>
            <YahLogo className="text-white" height={28} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6, marginTop: 0 }}>
              Admin Sign In
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
              yah.mobi または bonfire.co.jp アカウントでサインイン
            </p>
          </div>

          <button
            onClick={login}
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "18px 1fr",
              alignItems: "center",
              gap: 10,
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              background: "#fff",
              color: "#111",
              border: "none",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e8e8e8")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", marginTop: 20, marginBottom: 0 }}>
            管理者権限のあるアカウントのみアクセス可能です
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .checkin-left { display: flex !important; }
          .checkin-right { left: 50% !important; }
        }
      `}</style>
    </div>
  );
}
