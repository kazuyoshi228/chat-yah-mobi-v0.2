import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MessageCircle, Headphones, Bot, Zap, Shield, Globe } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import { getLoginUrl } from "@/const";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ fontFamily: "'EB Garamond', serif" }}>
            yah.mobile
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {(user?.role === "operator" || user?.role === "admin") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/operator/chats")}
                  className="text-sm text-gray-600"
                >
                  Operator
                </Button>
              )}
              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="text-sm text-gray-600"
                >
                  Admin
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="text-sm text-gray-600"
            >
              Staff Login
            </Button>
          )}
          <Button
            onClick={() => navigate("/chat")}
            className="bg-black hover:bg-gray-800 text-white text-sm px-4 py-2 h-auto rounded-full"
          >
            Start Chat
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-1.5 text-xs text-gray-500 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          AI + Operator Real-time Support
        </div>
        <h1
          className="text-5xl md:text-6xl font-medium text-gray-900 leading-tight mb-6"
          style={{ fontFamily: "'EB Garamond', serif" }}
        >
          Elevate Your
          <br />
          <span className="italic">Customer Support</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          AI responds instantly and escalates seamlessly to operators when needed.
          Multilingual support for customers around the world.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate("/chat")}
            className="bg-black hover:bg-gray-800 text-white px-8 py-3 h-auto rounded-full text-sm font-medium"
          >
            Start Chatting Now
          </Button>
          <Button
            variant="outline"
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="border-gray-200 text-gray-600 px-8 py-3 h-auto rounded-full text-sm"
          >
            Staff Portal
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Bot,
              title: "AI Auto-Response",
              desc: "High-accuracy auto-responses via GPT-4o. Train on your company's knowledge base with RAG for precise answers.",
            },
            {
              icon: Headphones,
              title: "Seamless Escalation",
              desc: "When AI can't resolve an issue, it automatically hands off to an operator — with full conversation history shared.",
            },
            {
              icon: Globe,
              title: "Multilingual Support",
              desc: "Supports Japanese, English, Chinese, Spanish, and Korean. Serve your global customers in their own language.",
            },
            {
              icon: Zap,
              title: "Quick Replies",
              desc: "Save frequently used responses as quick replies. Dramatically speed up operator response times.",
            },
            {
              icon: Shield,
              title: "Secure Communication",
              desc: "Real-time communication via WebSocket. Messages are securely encrypted end-to-end.",
            },
            {
              icon: MessageCircle,
              title: "Satisfaction Survey",
              desc: "Automatically send a survey after each chat. Use the feedback to continuously improve your service.",
            },
          ].map((feature) => (
            <div key={feature.title} className="p-6 bg-gray-50 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <feature.icon className="w-4.5 h-4.5 text-gray-700" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Embed Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-gray-950 rounded-2xl p-8 text-white">
          <div className="mb-6">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Embed</span>
            <h2 className="text-xl font-semibold mt-2 mb-2" style={{ fontFamily: "'EB Garamond', serif" }}>
              Add to Your Website
            </h2>
            <p className="text-sm text-gray-400">
              Paste the script tag below to install the chat widget on any website.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all">{`<script
  src="https://chat.yah.mobi/widget.js"
  data-lang="en"
  data-position="bottom-right"
  data-color="#000000">
</script>`}</pre>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-400">
            <div>
              <span className="text-gray-300 font-medium">data-lang</span>
              <p className="mt-0.5">ja / en / zh / es / ko</p>
            </div>
            <div>
              <span className="text-gray-300 font-medium">data-position</span>
              <p className="mt-0.5">bottom-right / bottom-left</p>
            </div>
            <div>
              <span className="text-gray-300 font-medium">data-color</span>
              <p className="mt-0.5">Any HEX color (e.g. #000000)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Widget */}
      <ChatWidget />

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center">
        <p className="text-xs text-gray-400">
          © 2025 yah.mobile. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
