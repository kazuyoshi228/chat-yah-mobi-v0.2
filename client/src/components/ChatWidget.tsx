/**
 * ChatWidget - Embeddable floating chat button + chat window
 * Phase 57: Decision Tree flow before AI chat
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Headphones,
  Loader2,
  Star,
  CheckCircle,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatMessage {
  id?: number;
  sessionId: number;
  role: "visitor" | "operator" | "ai";
  content: string;
  createdAt: Date | string;
}

interface FlowNode {
  id: string;
  parentId: string | null;
  type: string; // "question" | "answer" | "redirect_form" | "redirect_ai"
  label: string; // JSON string {ja,en,ko,zh,th,vi}
  content: string | null; // JSON string
  options: string | null; // JSON array of child IDs
  icon: string | null;
  formTrigger: number;
  aiTrigger: number;
  sortOrder: number;
}

function getOrCreateVisitorId(): string {
  const key = "yah_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = nanoid();
    localStorage.setItem(key, id);
  }
  return id;
}

function parseI18n(json: string | null, lang: string): string {
  if (!json) return "";
  try {
    const obj = JSON.parse(json);
    return obj[lang] || obj["en"] || Object.values(obj)[0] || "";
  } catch {
    return json;
  }
}

type WidgetState = "closed" | "flow" | "chat" | "ended";

export default function ChatWidget() {
  const { t, lang: language } = useLanguage();
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [visitorName] = useState("");
  const [typingInfo, setTypingInfo] = useState<boolean>(false);
  const [rating, setRating] = useState(0);
  const [resolved, setResolved] = useState<"yes" | "no" | null>(null);
  const [freeComment, setFreeComment] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Decision tree state
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string>("root");
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]); // history of node IDs
  const [showFormPrompt, setShowFormPrompt] = useState(false);
  const [formPromptContent, setFormPromptContent] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load flow nodes from public API (no auth required)
  const { data: nodesData } = trpc.chat.getFlowNodes.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (nodesData) setFlowNodes(nodesData as FlowNode[]);
  }, [nodesData]);

  const startSession = trpc.chat.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setWidgetState("chat");
      if (data.aiResponse) {
        setMessages([
          {
            sessionId: data.sessionId,
            role: "ai",
            content: data.aiResponse,
            createdAt: new Date(),
          },
        ]);
      }
    },
  });

  const sendMessage = trpc.chat.sendMessage.useMutation();
  const endSession = trpc.chat.endSession.useMutation({
    onSuccess: () => setWidgetState("ended"),
  });
  const submitSurvey = trpc.chat.submitSurvey.useMutation({
    onSuccess: () => setSurveySubmitted(true),
  });
  const submitContactForm = trpc.chat.submitContactForm?.useMutation?.();

  // Socket.io
  useEffect(() => {
    if (!sessionId) return;
    const socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_session", sessionId);

    socket.on("new_message", (msg: ChatMessage) => {
      if (msg.role !== "visitor") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (widgetState !== "chat") setUnreadCount((c) => c + 1);
      }
    });

    socket.on("typing", (data: { role: string; isTyping: boolean }) => {
      if (data.role !== "visitor") setTypingInfo(data.isTyping);
    });

    socket.on("session_ended", () => setWidgetState("ended"));
    return () => { socket.disconnect(); };
  }, [sessionId]);

  useEffect(() => {
    if (widgetState === "chat") setUnreadCount(0);
  }, [widgetState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  // Decision tree helpers
  const currentNode = flowNodes.find((n) => n.id === currentNodeId);
  const childIds: string[] = currentNode?.options ? JSON.parse(currentNode.options) : [];
  const childNodes = childIds
    .map((id) => flowNodes.find((n) => n.id === id))
    .filter(Boolean) as FlowNode[];

  const navigateTo = (nodeId: string) => {
    setBreadcrumb((prev) => [...prev, currentNodeId]);
    setCurrentNodeId(nodeId);
  };

  const navigateBack = () => {
    if (breadcrumb.length === 0) return;
    const prev = [...breadcrumb];
    const last = prev.pop()!;
    setBreadcrumb(prev);
    setCurrentNodeId(last);
    setShowFormPrompt(false);
  };

  const handleNodeSelect = (node: FlowNode) => {
    if (node.formTrigger) {
      const content = parseI18n(node.content, language);
      setFormPromptContent(content);
      setBreadcrumb((prev) => [...prev, currentNodeId]);
      setCurrentNodeId(node.id);
      setShowFormPrompt(true);
      return;
    }
    if (node.aiTrigger) {
      // Launch AI chat
      const visitorId = getOrCreateVisitorId();
      const greeting = parseI18n(node.content, language);
      startSession.mutate({
        visitorId,
        visitorName: visitorName || undefined,
        initialMessage: greeting || "Hello",
        language,
      });
      return;
    }
    navigateTo(node.id);
  };

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !sessionId) return;
    const visitorId = getOrCreateVisitorId();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { sessionId, role: "visitor", content, createdAt: new Date() },
    ]);
    sendMessage.mutate({ sessionId, visitorId, content });
  }, [input, sessionId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = () => {
    if (!sessionId) return;
    const visitorId = getOrCreateVisitorId();
    endSession.mutate({ sessionId, visitorId });
  };

  const handleSurveySubmit = () => {
    if (!sessionId || rating === 0) return;
    const visitorId = getOrCreateVisitorId();
    submitSurvey.mutate({
      sessionId,
      visitorId,
      rating,
      resolved: resolved ?? undefined,
      freeComment: freeComment || undefined,
    });
  };

  const handleFormSubmit = () => {
    if (!formEmail.trim() || !formMessage.trim()) return;
    const visitorId = getOrCreateVisitorId();
    if (submitContactForm) {
      submitContactForm.mutate({
        visitorId,
        email: formEmail,
        message: formMessage,
        language,
      });
    }
    setFormSubmitted(true);
  };

  const openWidget = () => {
    setWidgetState("flow");
    setCurrentNodeId("root");
    setBreadcrumb([]);
    setShowFormPrompt(false);
    setFormSubmitted(false);
    setFormEmail("");
    setFormMessage("");
  };

  const closeWidget = () => setWidgetState("closed");

  // i18n labels for UI
  const uiLabels: Record<string, Record<string, string>> = {
    back: { ja: "戻る", en: "Back", ko: "뒤로", zh: "返回", th: "กลับ", vi: "Quay lại" },
    form_email: { ja: "メールアドレス", en: "Email", ko: "이메일", zh: "邮箱", th: "อีเมล", vi: "Email" },
    form_message: { ja: "お問い合わせ内容", en: "Message", ko: "문의 내용", zh: "问题描述", th: "ข้อความ", vi: "Nội dung" },
    form_submit: { ja: "送信する", en: "Submit", ko: "제출", zh: "提交", th: "ส่ง", vi: "Gửi" },
    form_thanks: { ja: "お問い合わせありがとうございます。3営業日以内にご連絡いたします。", en: "Thank you! We'll contact you within 3 business days.", ko: "감사합니다! 3영업일 이내에 연락드리겠습니다.", zh: "感谢您！我们将在3个工作日内与您联系。", th: "ขอบคุณ! เราจะติดต่อคุณภายใน 3 วันทำการ", vi: "Cảm ơn! Chúng tôi sẽ liên hệ trong vòng 3 ngày làm việc." },
    ai_chat: { ja: "AIサポートに質問する", en: "Ask AI Support", ko: "AI 지원에 질문하기", zh: "向AI支持提问", th: "ถาม AI Support", vi: "Hỏi AI Support" },
  };
  const ui = (key: string) => uiLabels[key]?.[language] || uiLabels[key]?.["en"] || key;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {widgetState !== "closed" && (
        <div
          className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="bg-black px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {breadcrumb.length > 0 && widgetState === "flow" && (
                <button
                  onClick={navigateBack}
                  className="p-1 text-white/60 hover:text-white transition-colors mr-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">yah.mobile Support</p>
                <p className="text-xs text-white/60">
                  {widgetState === "chat" ? "AI + Operator" : "Support"}
                </p>
              </div>
            </div>
            <button
              onClick={closeWidget}
              className="p-1.5 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── DECISION TREE FLOW ── */}
          {widgetState === "flow" && !showFormPrompt && (
            <ScrollArea className="flex-1">
              <div className="p-4 flex flex-col gap-3">
                {currentNode && (
                  <>
                    {/* Bot message bubble */}
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-gray-800 leading-relaxed max-w-[85%]">
                        <p className="whitespace-pre-wrap">
                          {parseI18n(currentNode.label, language)}
                        </p>
                        {/* Show content if answer node */}
                        {currentNode.type === "answer" && currentNode.content && (
                          <p className="mt-2 whitespace-pre-wrap text-gray-700">
                            {parseI18n(currentNode.content, language)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Option buttons */}
                    {childNodes.length > 0 && (
                      <div className="flex flex-col gap-2 mt-1">
                        {childNodes.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => handleNodeSelect(child)}
                            disabled={startSession.isPending}
                            className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-700 hover:border-black hover:bg-gray-50 transition-all active:scale-[0.98] leading-snug"
                          >
                            {parseI18n(child.label, language)}
                          </button>
                        ))}

                        {/* Always show AI fallback option */}
                        <button
                          onClick={() => {
                            const visitorId = getOrCreateVisitorId();
                            startSession.mutate({
                              visitorId,
                              visitorName: visitorName || undefined,
                              initialMessage: parseI18n(currentNode.label, language),
                              language,
                            });
                          }}
                          disabled={startSession.isPending}
                          className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-all flex items-center gap-2"
                        >
                          {startSession.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Bot className="w-3 h-3" />
                          )}
                          {ui("ai_chat")}
                        </button>
                      </div>
                    )}

                    {/* Leaf node with no children: show AI fallback */}
                    {childNodes.length === 0 && currentNode.type !== "redirect_form" && (
                      <div className="flex flex-col gap-2 mt-1">
                        <button
                          onClick={() => {
                            const visitorId = getOrCreateVisitorId();
                            startSession.mutate({
                              visitorId,
                              visitorName: visitorName || undefined,
                              initialMessage: parseI18n(currentNode.label, language),
                              language,
                            });
                          }}
                          disabled={startSession.isPending}
                          className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-all flex items-center gap-2"
                        >
                          {startSession.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Bot className="w-3 h-3" />
                          )}
                          {ui("ai_chat")}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Loading state */}
                {!currentNode && flowNodes.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* ── FORM PROMPT ── */}
          {widgetState === "flow" && showFormPrompt && (
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
              {!formSubmitted ? (
                <>
                  {/* Bot message */}
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-gray-800 leading-relaxed max-w-[85%]">
                      <p className="whitespace-pre-wrap">{formPromptContent}</p>
                    </div>
                  </div>

                  {/* Form fields */}
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder={ui("form_email")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                  <Textarea
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder={ui("form_message")}
                    rows={4}
                    className="resize-none border-gray-200 focus:border-black focus:ring-black text-xs"
                  />
                  <Button
                    onClick={handleFormSubmit}
                    disabled={!formEmail.trim() || !formMessage.trim()}
                    className="w-full bg-black hover:bg-gray-800 text-white text-xs"
                  >
                    {ui("form_submit")}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-sm text-gray-600 text-center">{ui("form_thanks")}</p>
                </div>
              )}
            </div>
          )}

          {/* ── AI CHAT ── */}
          {widgetState === "chat" && (
            <>
              <ScrollArea className="flex-1 px-3 py-3">
                <div className="space-y-2">
                  {messages.map((msg, i) => {
                    const isVisitor = msg.role === "visitor";
                    return (
                      <div
                        key={msg.id ?? i}
                        className={cn("flex items-end gap-2", isVisitor ? "flex-row-reverse" : "flex-row")}
                      >
                        {!isVisitor && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            {msg.role === "ai" ? (
                              <Bot className="w-3 h-3 text-gray-500" />
                            ) : (
                              <Headphones className="w-3 h-3 text-gray-500" />
                            )}
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2 text-xs",
                          isVisitor
                            ? "bg-black text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        )}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}

                  {typingInfo && (
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <Bot className="w-3 h-3 text-gray-500" />
                      </div>
                      <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-gray-100 px-3 py-2 flex items-end gap-2 flex-shrink-0">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("widget_placeholder")}
                  rows={1}
                  className="flex-1 resize-none border-gray-200 focus:border-black focus:ring-black min-h-[36px] max-h-[80px] py-2 text-xs"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-black hover:bg-gray-800 text-white rounded-full w-8 h-8 p-0 flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* End Session */}
              <div className="px-3 pb-2 flex-shrink-0">
                <button
                  onClick={handleEndSession}
                  className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
                >
                  {t("widget_ended")}
                </button>
              </div>
            </>
          )}

          {/* ── ENDED + SURVEY ── */}
          {widgetState === "ended" && (
            <div className="flex-1 p-4 flex flex-col items-center justify-center gap-3 overflow-y-auto">
              {!surveySubmitted ? (
                <>
                  <p className="text-sm font-medium text-gray-900 text-center">
                    {t("widget_survey_title")}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRating(s)}>
                        <Star className={cn(
                          "w-7 h-7 transition-colors",
                          s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        )} />
                      </button>
                    ))}
                  </div>
                  <div className="w-full">
                    <p className="text-xs text-gray-500 mb-1.5 text-center">{t("survey_resolved_question")}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolved("yes")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          resolved === "yes"
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        )}
                      >
                        ✔ {t("widget_survey_yes")}
                      </button>
                      <button
                        onClick={() => setResolved("no")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          resolved === "no"
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        )}
                      >
                        ✖ {t("widget_survey_no")}
                      </button>
                    </div>
                  </div>
                  {rating > 0 && rating <= 3 && (
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">{t("survey_improve")}</p>
                      <textarea
                        value={freeComment}
                        onChange={(e) => setFreeComment(e.target.value)}
                        placeholder={t("survey_improve_placeholder")}
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-black/20"
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleSurveySubmit}
                    disabled={rating === 0 || submitSurvey.isPending}
                    className="w-full bg-black text-white hover:bg-gray-800 text-sm"
                  >
                    {t("widget_survey_submit")}
                  </Button>
                </>
              ) : (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-sm text-gray-600 text-center">
                    {t("widget_survey_thanks")}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => {
          if (widgetState === "closed") {
            openWidget();
          } else {
            closeWidget();
          }
        }}
        className="w-14 h-14 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative"
      >
        {widgetState === "closed" ? (
          <MessageCircle className="w-6 h-6" />
        ) : (
          <X className="w-6 h-6" />
        )}
        {unreadCount > 0 && widgetState === "closed" && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
