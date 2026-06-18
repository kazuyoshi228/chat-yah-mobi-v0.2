import { useEffect } from "react";

const WIDGET_AUTH_KEY = "yah_widget_auth";

export default function WidgetAuthSuccess() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const name = params.get("name") || "";
    const email = params.get("email") || "";

    if (!error && email) {
      // Save auth info to localStorage so the widget can pick it up
      localStorage.setItem(
        WIDGET_AUTH_KEY,
        JSON.stringify({ name, email, timestamp: Date.now() })
      );
    } else {
      localStorage.setItem(
        WIDGET_AUTH_KEY,
        JSON.stringify({ error: error || "unknown", timestamp: Date.now() })
      );
    }

    // Close this tab after a short delay
    setTimeout(() => {
      window.close();
    }, 500);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-8">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">ログインしました</p>
        <p className="text-sm text-gray-400 mt-1">このタブは自動的に閉じます...</p>
      </div>
    </div>
  );
}
