/**
 * WidgetChat - Standalone chat page rendered inside the embed iframe.
 * URL: /widget-chat?lang=ja&color=%23000000&origin=https://example.com
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Bot,
  Headphones,
  Star,
  CheckCircle,
  Loader2,
  X,
  AlertCircle,
  Paperclip,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

interface ChatMessage {
  id?: number;
  sessionId: number;
  role: "visitor" | "operator" | "ai";
  content: string;
  fileUrl?: string | null;
  createdAt: Date | string;
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

function useQueryParam(key: string): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) ?? "";
}

type Stage = "start" | "chat" | "ended";

// ── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-3 right-3 text-white/70 hover:text-white"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt="Full size"
        className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export default function WidgetChat() {
  const rawLang = useQueryParam("lang") || "en";
  const validLangs = ["ja", "en", "zh", "es", "ko"] as const;
  type Lang = typeof validLangs[number];
  const lang: Lang = (validLangs as readonly string[]).includes(rawLang) ? (rawLang as Lang) : "en";
  const accentColor = useQueryParam("color") || "#000000";
  const parentOrigin = useQueryParam("origin") || "*";

  const [stage, setStage] = useState<Stage>("start");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [shouldEscalate, setShouldEscalate] = useState(false);
  const [rating, setRating] = useState(0);
  const [resolved, setResolved] = useState<"yes" | "no" | null>(null);
  const [freeComment, setFreeComment] = useState("");
  const [surveyDone, setSurveyDone] = useState(false);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedMessages, setFailedMessages] = useState<string[]>([]);

  const uploadFile = trpc.upload.uploadFile.useMutation();

  const startSession = trpc.chat.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setStage("chat");
      const msgs: ChatMessage[] = [
        { sessionId: data.sessionId, role: "visitor", content: initialMessage, createdAt: new Date() },
      ];
      if (data.aiResponse) {
        msgs.push({ sessionId: data.sessionId, role: "ai", content: data.aiResponse, createdAt: new Date() });
      }
      setMessages(msgs);
    },
    onError: () => {
      // Keep form so user can retry
    },
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data.shouldEscalate) setShouldEscalate(true);
      setSendError(null);
    },
    onError: (_err, variables) => {
      // Roll back optimistic message and show retry option
      setMessages((prev) => prev.filter((m) => m.content !== variables.content || m.role !== "visitor"));
      setFailedMessages((prev) => [...prev, variables.content]);
      setSendError("Failed to send. Please try again.");
    },
  });

  const endSession = trpc.chat.endSession.useMutation({
    onSuccess: () => setStage("ended"),
    onError: () => {
      // Silently ignore — user can retry
    },
  });

  const requestEscalation = trpc.chat.requestEscalation.useMutation({
    onSuccess: () => setShouldEscalate(false),
  });

  const submitSurvey = trpc.chat.submitSurvey.useMutation({
    onSuccess: () => setSurveyDone(true),
    onError: () => {
      // Allow retry
    },
  });

    // ── Polling fallback (in case Socket.io cross-instance delivery fails) ─────
  const getMessages = trpc.chat.getMessages.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId && stage === "chat", refetchInterval: 3000 }
  );
  useEffect(() => {
    if (!getMessages.data) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id).filter(Boolean));
      const newMsgs = (getMessages.data as ChatMessage[]).filter(
        (m) => m.id && !existingIds.has(m.id)
      );
      if (newMsgs.length === 0) return prev;
      // Notify parent about unread operator/ai messages
      const hasNewOperator = newMsgs.some((m) => m.role !== "visitor");
      if (hasNewOperator) {
        window.parent.postMessage({ type: "yah:unread", count: newMsgs.filter(m => m.role !== "visitor").length }, parentOrigin);
      }
      return [...getMessages.data as ChatMessage[]];
    });
  }, [getMessages.data, parentOrigin]);

  // ── Socket ────────────────────────────────────────────────────────────────
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
        // Notify parent about unread
        window.parent.postMessage({ type: "yah:unread", count: 1 }, parentOrigin);
      }
    });
    socket.on("typing", (data: { role: string; isTyping: boolean }) => {
      if (data.role !== "visitor") setIsTyping(data.isTyping);
    });
    socket.on("session_ended", () => setStage("ended"));
    return () => { socket.disconnect(); };
  }, [sessionId, parentOrigin]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Listen for parent open event (reset unread)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "yah:open") {
        // parent opened the widget — nothing special needed here
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Image handlers ────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      setSendError("Image must be under 16MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCancelImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSendImage = useCallback(async () => {
    if (!imageFile || !sessionId) return;
    setIsUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          // Strip data URL prefix
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const { url } = await uploadFile.mutateAsync({
        fileName: imageFile.name,
        mimeType: imageFile.type,
        base64Data: base64,
        sessionId,
      });
      // Add optimistic message with image
      setMessages((prev) => [
        ...prev,
        { sessionId, role: "visitor", content: "", fileUrl: url, createdAt: new Date() },
      ]);
      setImageFile(null);
      setImagePreview(null);
      sendMessage.mutate({ sessionId, visitorId: getOrCreateVisitorId(), content: "", fileUrl: url });
    } catch {
      setSendError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [imageFile, sessionId, uploadFile, sendMessage]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (!initialMessage.trim()) return;
    startSession.mutate({
      visitorId: getOrCreateVisitorId(),
      visitorName: visitorName || undefined,
      initialMessage,
      language: lang,
    });
  };

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !sessionId) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { sessionId, role: "visitor", content, createdAt: new Date() },
    ]);
    sendMessage.mutate({ sessionId, visitorId: getOrCreateVisitorId(), content });
  }, [input, sessionId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClose = () => {
    window.parent.postMessage({ type: "yah:close" }, parentOrigin);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-white font-sans" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {/* Lightbox */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: accentColor }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">yah.mobile Support</p>
            <p className="text-xs text-white/60 leading-tight">
              {stage === "chat" ? "AI + Operator" : "Chat Support"}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 text-white/60 hover:text-white transition-colors rounded-full"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Start Form ── */}
      {stage === "start" && (
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
          <p className="text-sm text-gray-500">
            Feel free to ask us anything. Our AI will respond instantly.
          </p>
          <input
            type="text"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
          />
          <Textarea
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleStart(); }
            }}
            placeholder="How can we help you today?"
            rows={4}
            className="resize-none border-gray-200 text-sm focus:ring-black/20"
          />
          {startSession.isError && (
            <p className="text-xs text-red-500 text-center">
              Connection failed. Please try again.
            </p>
          )}
          <button
            onClick={handleStart}
            disabled={!initialMessage.trim() || startSession.isPending}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: accentColor }}
          >
            {startSession.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Start Chat"
            )}
          </button>
        </div>
      )}

      {/* ── Chat ── */}
      {stage === "chat" && (
        <>
          {/* Escalation banner */}
          {shouldEscalate && (
            <div className="bg-amber-50 border-b border-amber-100 px-3 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">Would you like to connect with an operator?</p>
              </div>
              <button
                onClick={() => requestEscalation.mutate({ sessionId: sessionId!, visitorId: getOrCreateVisitorId() })}
                className="text-xs text-amber-700 font-medium underline"
              >
                Connect
              </button>
            </div>
          )}

          {/* Message list */}
          <div
            className="flex-1 px-3 py-3 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <div className="space-y-2">
              {messages.map((msg, i) => {
                const isVisitor = msg.role === "visitor";
                return (
                  <div
                    key={msg.id ?? i}
                    className={cn("flex items-end gap-1.5", isVisitor ? "flex-row-reverse" : "flex-row")}
                  >
                    {!isVisitor && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {msg.role === "ai"
                          ? <Bot className="w-3 h-3 text-gray-400" />
                          : <Headphones className="w-3 h-3 text-gray-400" />}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[78%] rounded-2xl overflow-hidden",
                      isVisitor
                        ? "rounded-br-sm"
                        : "bg-gray-100 rounded-bl-sm"
                    )}>
                      {/* Image attachment */}
                      {msg.fileUrl && (
                        <button
                          onClick={() => setLightboxSrc(msg.fileUrl!)}
                          className="block w-full"
                        >
                          <img
                            src={msg.fileUrl}
                            alt="Attachment"
                            className="max-w-[200px] max-h-[200px] object-cover rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                            style={isVisitor ? { borderRadius: "1rem 1rem 0.25rem 1rem" } : { borderRadius: "1rem 1rem 1rem 0.25rem" }}
                          />
                        </button>
                      )}
                      {/* Text content */}
                      {msg.content && (
                        <div
                          className={cn(
                            "px-3 py-2 text-xs leading-relaxed",
                            isVisitor ? "text-white" : "text-gray-800"
                          )}
                          style={isVisitor ? { background: accentColor } : undefined}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1 items-center h-3">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Send error + failed message retry */}
          {sendError && (
            <div className="px-3 pt-1 flex-shrink-0">
              <p className="text-xs text-red-500">{sendError}</p>
              {failedMessages.length > 0 && (
                <button
                  onClick={() => {
                    const msg = failedMessages[failedMessages.length - 1];
                    setFailedMessages((prev) => prev.slice(0, -1));
                    setSendError(null);
                    setMessages((prev) => [
                      ...prev,
                      { sessionId: sessionId!, role: "visitor", content: msg, createdAt: new Date() },
                    ]);
                    sendMessage.mutate({ sessionId: sessionId!, visitorId: getOrCreateVisitorId(), content: msg });
                  }}
                  className="text-xs text-blue-500 underline mt-0.5"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Image preview before send */}
          {imagePreview && (
            <div className="px-3 pt-2 flex-shrink-0">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-20 w-auto rounded-lg object-cover border border-gray-200"
                />
                <button
                  onClick={handleCancelImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-900"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-2 flex items-end gap-2 flex-shrink-0">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
              aria-label="Attach image"
              disabled={isUploading}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {imagePreview ? (
              // When image is selected, show send image button
              <button
                onClick={handleSendImage}
                disabled={isUploading}
                className="flex-1 py-2 rounded-full text-xs font-medium text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: accentColor }}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5" />
                    Send Image
                  </>
                )}
              </button>
            ) : (
              <>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none border-gray-200 text-xs min-h-[36px] max-h-[80px] py-2 focus:ring-black/20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: accentColor }}
                  aria-label="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="px-3 pb-2 flex-shrink-0">
            <button
              onClick={() => endSession.mutate({ sessionId: sessionId!, visitorId: getOrCreateVisitorId() })}
              className="text-xs text-gray-400 hover:text-gray-600 w-full text-center transition-colors"
            >
              End chat
            </button>
          </div>
        </>
      )}

      {/* ── Ended + Survey ── */}
      {stage === "ended" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          {!surveyDone ? (
            <>
              <p className="text-sm font-medium text-gray-900 text-center">
                How was your experience?
              </p>
              {/* Star rating */}
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star className={cn(
                      "w-8 h-8 transition-colors",
                      s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"
                    )} />
                  </button>
                ))}
              </div>
              {/* Resolved question */}
              <div className="w-full">
                <p className="text-xs text-gray-500 mb-1.5 text-center">Was your issue resolved?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResolved("yes")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      resolved === "yes"
                        ? "text-white border-transparent"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    )}
                    style={resolved === "yes" ? { background: accentColor } : undefined}
                  >
                    ✔ Yes
                  </button>
                  <button
                    onClick={() => setResolved("no")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      resolved === "no"
                        ? "text-white border-transparent"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    )}
                    style={resolved === "no" ? { background: accentColor } : undefined}
                  >
                    ✖ No
                  </button>
                </div>
              </div>
              {/* Low-rating free comment */}
              {rating > 0 && rating <= 3 && (
                <div className="w-full">
                  <p className="text-xs text-gray-500 mb-1">What could we improve?</p>
                  <textarea
                    value={freeComment}
                    onChange={(e) => setFreeComment(e.target.value)}
                    placeholder="Tell us what went wrong..."
                    rows={2}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-black/20"
                  />
                </div>
              )}
              <button
                onClick={() => {
                  if (!sessionId || rating === 0) return;
                  submitSurvey.mutate({
                    sessionId,
                    visitorId: getOrCreateVisitorId(),
                    rating,
                    resolved: resolved ?? undefined,
                    freeComment: freeComment || undefined,
                  });
                }}
                disabled={rating === 0 || submitSurvey.isPending}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: accentColor }}
              >
                Submit
              </button>
            </>
          ) : (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-sm text-gray-600 text-center">
                Thank you for your feedback!
              </p>
              <button
                onClick={handleClose}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
