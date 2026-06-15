import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Headphones, Bot, Zap, Shield, Globe, ChevronDown, Copy, Check } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANG_OPTIONS } from "../../../shared/i18n";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const currentLangOption = LANG_OPTIONS.find((o) => o.value === lang) ?? LANG_OPTIONS[0];

  const embedCode = `<script\n  src="https://chat.yah.mobi/widget.js"\n  data-lang="${lang}"\n  data-position="bottom-right"\n  data-color="#000000">\n</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const features = [
    { icon: Bot, titleKey: "home_feature_ai_title" as const, descKey: "home_feature_ai_desc" as const },
    { icon: Headphones, titleKey: "home_feature_escalation_title" as const, descKey: "home_feature_escalation_desc" as const },
    { icon: Globe, titleKey: "home_feature_multilingual_title" as const, descKey: "home_feature_multilingual_desc" as const },
    { icon: Zap, titleKey: "home_feature_quickreply_title" as const, descKey: "home_feature_quickreply_desc" as const },
    { icon: Shield, titleKey: "home_feature_secure_title" as const, descKey: "home_feature_secure_desc" as const },
    { icon: MessageCircle, titleKey: "home_feature_survey_title" as const, descKey: "home_feature_survey_desc" as const },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav — yah.mobi style: transparent bg, uppercase tracking, white text on scroll */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-0 flex items-center justify-between h-14">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 focus:outline-none"
        >
          <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
            <MessageCircle className="w-3 h-3 text-white" />
          </div>
          <span
            className="text-[0.8125rem] font-medium tracking-[0.14em] uppercase text-gray-900"
          >
            yah.mobile
          </span>
        </button>

        {/* Right nav items */}
        <div className="flex items-center gap-8">
          {/* Staff nav links */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-8">
              {(user?.role === "operator" || user?.role === "admin") && (
                <button
                  onClick={() => navigate("/operator/chats")}
                  className="text-[0.6875rem] font-medium tracking-[0.16em] uppercase text-gray-700 hover:text-black transition-colors border-b border-transparent hover:border-black pb-0.5"
                >
                  {t("home_nav_operator")}
                </button>
              )}
              {user?.role === "admin" && (
                <button
                  onClick={() => navigate("/admin")}
                  className="text-[0.6875rem] font-medium tracking-[0.16em] uppercase text-gray-700 hover:text-black transition-colors border-b border-transparent hover:border-black pb-0.5"
                >
                  {t("home_nav_admin")}
                </button>
              )}
            </div>
          )}

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-[0.6875rem] font-medium tracking-[0.16em] uppercase text-gray-700 hover:text-black transition-colors focus:outline-none">
                <span>{currentLangOption.flag}</span>
                <span className="hidden sm:inline ml-1">{currentLangOption.label}</span>
                <ChevronDown className="w-3 h-3 ml-0.5 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {LANG_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setLang(option.value)}
                  className={`gap-2 cursor-pointer text-xs ${lang === option.value ? "font-semibold" : ""}`}
                >
                  <span>{option.flag}</span>
                  <span>{option.label}</span>
                  {lang === option.value && <Check className="w-3 h-3 ml-auto text-gray-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Staff login / CTA */}
          {!isAuthenticated && (
            <button
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="text-[0.6875rem] font-medium tracking-[0.16em] uppercase text-gray-700 hover:text-black transition-colors border-b border-transparent hover:border-black pb-0.5"
            >
              Staff Login
            </button>
          )}
          <button
            onClick={() => navigate("/chat")}
            className="bg-black hover:bg-gray-800 text-white text-[0.6875rem] font-medium tracking-[0.12em] uppercase px-5 py-2 rounded-full transition-colors"
          >
            {t("home_start_chat")}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-1.5 text-xs text-gray-500 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {t("home_hero_badge")}
        </div>
        <h1
          className="text-5xl md:text-6xl font-medium text-gray-900 leading-tight mb-6"
        >
          {t("home_hero_title1")}
          <br />
          <span className="italic">{t("home_hero_title2")}</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          {t("home_hero_subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate("/chat")}
            className="bg-black hover:bg-gray-800 text-white px-8 py-3 h-auto rounded-full text-sm font-medium"
          >
            {t("home_start_chat")}
          </Button>
          <Button
            variant="outline"
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="border-gray-200 text-gray-600 px-8 py-3 h-auto rounded-full text-sm"
          >
            {t("home_staff_portal")}
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.titleKey} className="p-6 bg-gray-50 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <feature.icon className="w-4.5 h-4.5 text-gray-700" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t(feature.titleKey)}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{t(feature.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Embed Section */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-gray-950 rounded-2xl p-8 text-white">
          <div className="mb-6">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Embed</span>
            <h2 className="text-xl font-semibold mt-2 mb-2">
              {t("home_embed_title")}
            </h2>
            <p className="text-sm text-gray-400">
              {t("home_embed_desc")}
            </p>
          </div>
          <div className="relative bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400 overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all pr-16">{embedCode}</pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            >
              {copied ? (
                <><Check className="w-3 h-3" />{t("home_embed_copied")}</>
              ) : (
                <><Copy className="w-3 h-3" />{t("home_embed_copy")}</>
              )}
            </button>
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
