import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useLanguage } from "@/contexts/LanguageContext";

const LANGUAGES = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
  { value: "ko", label: "한국어" },
];

function getOrCreateVisitorId(): string {
  const key = "yah_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = nanoid();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function ChatStart() {
  const [, navigate] = useLocation();
  const { lang, t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<"ja" | "en" | "zh" | "es" | "ko">(lang as "ja" | "en" | "zh" | "es" | "ko");

  const startSession = trpc.chat.startSession.useMutation({
    onSuccess: (data) => {
      navigate(`/chat/${data.sessionId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const visitorId = getOrCreateVisitorId();
    startSession.mutate({
      visitorId,
      visitorName: name || undefined,
      visitorEmail: email || undefined,
      initialMessage: message,
      language,
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black mb-4">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'EB Garamond', serif" }}>
            {t("chat_start_title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("chat_start_subtitle")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              {t("chat_start_name_label")}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("chat_start_name_placeholder")}
              className="border-gray-200 focus:border-black focus:ring-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              {t("chat_start_email_label")}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("chat_start_email_placeholder")}
              className="border-gray-200 focus:border-black focus:ring-black"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">{t("chat_start_lang_label")}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-gray-700">
              {t("chat_start_message_label")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("chat_start_message_placeholder")}
              rows={4}
              required
              className="border-gray-200 focus:border-black focus:ring-black resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 rounded-lg transition-colors"
            disabled={startSession.isPending || !message.trim()}
          >
            {startSession.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("chat_start_submitting")}
              </>
            ) : (
              t("chat_start_submit")
            )}
          </Button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          By starting a chat, you agree to our Privacy Policy
        </p>
      </div>
    </div>
  );
}
