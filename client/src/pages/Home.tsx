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
                  オペレーター
                </Button>
              )}
              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="text-sm text-gray-600"
                >
                  管理
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
              スタッフログイン
            </Button>
          )}
          <Button
            onClick={() => navigate("/chat")}
            className="bg-black hover:bg-gray-800 text-white text-sm px-4 py-2 h-auto rounded-full"
          >
            チャットを始める
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-1.5 text-xs text-gray-500 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          AI + オペレーターによるリアルタイムサポート
        </div>
        <h1
          className="text-5xl md:text-6xl font-medium text-gray-900 leading-tight mb-6"
          style={{ fontFamily: "'EB Garamond', serif" }}
        >
          カスタマーサポートを
          <br />
          <span className="italic">次のレベルへ</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          AIが即座に対応し、必要に応じてオペレーターへスムーズにエスカレーション。
          多言語対応で、世界中のお客様をサポートします。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate("/chat")}
            className="bg-black hover:bg-gray-800 text-white px-8 py-3 h-auto rounded-full text-sm font-medium"
          >
            今すぐチャットを開始
          </Button>
          <Button
            variant="outline"
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="border-gray-200 text-gray-600 px-8 py-3 h-auto rounded-full text-sm"
          >
            スタッフポータル
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Bot,
              title: "AI自動応答",
              desc: "GPT-4oによる高精度な自動応答。RAGで御社の情報を学習させ、的確な回答を提供します。",
            },
            {
              icon: Headphones,
              title: "シームレスなエスカレーション",
              desc: "AIで解決できない場合は、オペレーターへ自動的に引き継ぎ。会話履歴も共有されます。",
            },
            {
              icon: Globe,
              title: "多言語対応",
              desc: "日本語・英語・中国語・スペイン語・韓国語に対応。グローバルなお客様をサポート。",
            },
            {
              icon: Zap,
              title: "定型文機能",
              desc: "よく使う返答を定型文として登録。オペレーターの対応スピードを大幅に向上させます。",
            },
            {
              icon: Shield,
              title: "セキュアな通信",
              desc: "WebSocketによるリアルタイム通信。メッセージは安全に暗号化されます。",
            },
            {
              icon: MessageCircle,
              title: "満足度調査",
              desc: "チャット終了後にアンケートを自動送信。サービス改善に役立てます。",
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
