import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  User,
  Bot,
  Headphones,
  Zap,
  RefreshCw,
  CheckCircle,
  ArrowLeft,
  Loader2,
  MessageCircle,
  Paperclip,
  ImageIcon,
  X as XIcon,
  PhoneOff,
  Star,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  id?: number;
  sessionId: number;
  role: "visitor" | "operator" | "ai";
  content: string;
  fileUrl?: string | null;
  operatorName?: string;
  createdAt: Date | string;
}

interface SurveyResult {
  sessionId: number;
  rating: number;
  resolved: "yes" | "no" | null;
  freeComment: string | null;
  submittedAt: Date | string;
}

const LANG_LABELS: Record<string, string> = {
  ja: "🇯🇵 日本語",
  en: "🇺🇸 English",
  zh: "🇨🇳 中文",
  es: "🇪🇸 Español",
  ko: "🇰🇷 한국어",
};

export default function OperatorChatDetail() {
  const { id: sessionIdStr } = useParams<{ id: string }>();
  const sessionId = parseInt(sessionIdStr ?? "", 10);
  const isValidSession = !isNaN(sessionId) && sessionId > 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typingInfo, setTypingInfo] = useState<{ role: string; isTyping: boolean } | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const utils = trpc.useUtils();
  const { data: detail, refetch } = trpc.operator.getSessionDetail.useQuery(
    { sessionId },
    { enabled: isValidSession }
  );

  // Polling fallback: fetch messages in case Socket.io misses events (multi-instance)
  // B-3: When Socket.io is connected, poll every 30s; otherwise every 3s
  // Operators are authenticated; no visitorId needed (server bypasses check for operator/admin)
  const { data: polledMessages } = trpc.chat.getMessages.useQuery(
    { sessionId },
    {
      enabled: isValidSession,
      refetchInterval: socketConnected ? 30_000 : 3_000,
      refetchIntervalInBackground: true,
    }
  );

  useEffect(() => {
    if (!polledMessages) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id).filter(Boolean));
      const newMsgs = (polledMessages as ChatMessage[]).filter(
        (m) => m.id && !existingIds.has(m.id)
      );
      if (newMsgs.length === 0) return prev;
      // Merge: replace temp messages (negative id) and add truly new ones
      const withoutTemps = prev.filter((m) => m.id && m.id > 0);
      const allIds = new Set(withoutTemps.map((m) => m.id));
      const merged = [
        ...withoutTemps,
        ...(polledMessages as ChatMessage[]).filter((m) => m.id && !allIds.has(m.id)),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return merged;
    });
  }, [polledMessages]);
  const { data: quickReplies } = trpc.operator.listQuickReplies.useQuery();

  const assignSession = trpc.operator.assignSession.useMutation({
    onSuccess: () => { toast.success("Session assigned"); refetch(); },
  });

  const sendMessage = trpc.operator.sendMessage.useMutation({
    onSuccess: () => setInput(""),
  });

  const endSession = trpc.operator.endSession.useMutation({
    onSuccess: () => { toast.success("Session ended"); navigate("/ops/chats"); },
  });

  const generateSummary = trpc.operator.generateSummary.useMutation({
    onSuccess: (data) => { toast.success("Summary generated"); refetch(); },
  });

  const sendTyping = trpc.operator.typing.useMutation();
  const uploadFile = trpc.upload.uploadFile.useMutation();

  // Socket.io
  useEffect(() => {
    const socket: Socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_session", sessionId);
    socket.emit("join_operators");
    // B-3: Track connectivity to adjust polling interval
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("new_message", (msg: ChatMessage) => {
      // Skip operator messages - they are already shown via optimistic updates
      if (msg.role === "operator") return;
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("typing", (data: { role: string; isTyping: boolean }) => {
      if (data.role !== "operator") setTypingInfo(data);
    });

    socket.on("session_ended", () => {
      toast.info("Session has ended");
      refetch();
    });

    socket.on("survey_submitted", (data: SurveyResult) => {
      if (data.sessionId === sessionId) {
        setSurveyResult(data);
        toast.success("アンケートが送信されました");
      }
    });

    return () => { socket.disconnect(); setSocketConnected(false); };
  }, [sessionId, refetch]);

  // Load messages
  useEffect(() => {
    if (detail?.messages) {
      setMessages(detail.messages as ChatMessage[]);
    }
  }, [detail?.messages]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || sendMessage.isPending) return;
    setInput("");
    const tempId = -(Date.now());
    setMessages((prev) => [
      ...prev,
      { id: tempId, sessionId, role: "operator", content, createdAt: new Date() },
    ]);
    sendMessage.mutate({ sessionId, content }, {
      onSuccess: (data) => {
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...m, id: data.messageId } : m)
        );
      },
      onError: () => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("Image must be under 16MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendImage = async () => {
    if (!imageFile) return;
    setIsUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const { url } = await uploadFile.mutateAsync({
        fileName: imageFile.name,
        mimeType: imageFile.type,
        base64Data: base64,
        sessionId,
      });
      const tempId = -(Date.now());
      setMessages((prev) => [
        ...prev,
        { id: tempId, sessionId, role: "operator", content: "", fileUrl: url, createdAt: new Date() },
      ]);
      setImageFile(null);
      setImagePreview(null);
      sendMessage.mutate({ sessionId, content: "", fileUrl: url }, {
        onSuccess: (data) => {
          setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: data.messageId } : m));
        },
        onError: () => {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          toast.error("Failed to send image.");
        },
      });
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    sendTyping.mutate({ sessionId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping.mutate({ sessionId, isTyping: false });
    }, 1500);
  };

  const session = detail?.session;
  const isEnded = session?.status === "ended";
  const isAssigned = session?.operatorId === user?.id;

  const sidebarItems = [
    { title: "Chat List", href: "/ops/chats", icon: MessageCircle },
  ];

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Operator">
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-3 right-3 text-white/70 hover:text-white"
            onClick={() => setLightboxSrc(null)}
          >
            <XIcon className="w-6 h-6" />
          </button>
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 w-0">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/ops/chats")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {session?.visitorName ?? "Anonymous"}
                  </p>
                  <span className="text-xs text-gray-400">
                    {LANG_LABELS[session?.language ?? "ja"]}
                  </span>
                </div>
                {session?.visitorEmail && (
                  <p className="text-xs text-gray-400">{session.visitorEmail}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs border-0",
                  session?.status === "waiting" ? "bg-amber-100 text-amber-700" :
                  session?.status === "active" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-500"
                )}
              >
                {session?.status === "waiting" ? "Waiting" : session?.status === "active" ? "Active" : "Ended"}
              </Badge>
              {!isEnded && !isAssigned && (
                <Button
                  size="sm"
                  onClick={() => assignSession.mutate({ sessionId })}
                  disabled={assignSession.isPending}
                  className="bg-black text-white hover:bg-gray-800 text-xs h-7"
                >
                  {assignSession.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign to me"}
                </Button>
              )}
              {!isEnded && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (confirm("このセッションを終了しますか？")) {
                      endSession.mutate({ sessionId });
                    }
                  }}
                  disabled={endSession.isPending}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs h-7 gap-1.5 border-0"
                >
                  {endSession.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <><PhoneOff className="w-3 h-3" /> End</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 px-4 py-4 bg-gray-50 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-1">
              {messages.map((msg, i) => {
                const isVisitor = msg.role === "visitor";
                const isAI = msg.role === "ai";
                const isOp = msg.role === "operator";

                return (
                  <div
                    key={msg.id ?? i}
                    className={cn("flex items-end gap-2 mb-3", isVisitor ? "flex-row" : "flex-row-reverse")}
                  >
                    {!isOp && (
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                        isVisitor ? "bg-gray-200" : "bg-gray-200"
                      )}>
                        {isVisitor ? <User className="w-3.5 h-3.5 text-gray-500" /> : <Bot className="w-3.5 h-3.5 text-gray-500" />}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[70%] rounded-2xl overflow-hidden",
                      isVisitor ? "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm" :
                      isOp ? "bg-black text-white rounded-br-sm" :
                      "bg-gray-100 text-gray-700 rounded-bl-sm"
                    )}>
                      {msg.fileUrl && (
                        <button onClick={() => setLightboxSrc(msg.fileUrl!)} className="block w-full">
                          <img
                            src={msg.fileUrl}
                            alt="Attachment"
                            className="max-w-[220px] max-h-[220px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </button>
                      )}
                      {msg.content && (
                        <div className="px-4 py-2.5 text-sm">
                          {isAI && <p className="text-xs text-gray-400 mb-1">AI</p>}
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-60">
                            {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      )}
                      {!msg.content && msg.fileUrl && (
                        <p className="text-xs px-2 pb-1.5 opacity-60">
                          {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {typingInfo?.isTyping && (
                <div className="flex items-end gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              {/* Survey Result Card */}
              {surveyResult && (
                <div className="flex justify-center my-4">
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm max-w-[320px] w-full">
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardCheck className="w-4 h-4 text-gray-500" />
                      <p className="text-xs font-semibold text-gray-700">アンケート結果</p>
                      <span className="ml-auto text-xs text-gray-400">
                        {new Date(surveyResult.submittedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {/* Star rating */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "w-5 h-5",
                            s <= surveyResult.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-200"
                          )}
                        />
                      ))}
                      <span className="ml-1 text-sm font-medium text-gray-700">{surveyResult.rating}/5</span>
                    </div>
                    {/* Resolved */}
                    {surveyResult.resolved !== null && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs text-gray-500">問題解決:</span>
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          surveyResult.resolved === "yes"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        )}>
                          {surveyResult.resolved === "yes" ? "✔ 解決済み" : "✖ 未解決"}
                        </span>
                      </div>
                    )}
                    {/* Free comment */}
                    {surveyResult.freeComment && (
                      <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 mb-0.5">コメント</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{surveyResult.freeComment}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          {!isEnded && (
            <div className="bg-white border-t border-gray-100 px-4 py-3">
              {/* Assign banner for unassigned sessions */}
              {!isAssigned && (
                <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-700">このセッションはまだアサインされていません</p>
                  <Button
                    size="sm"
                    onClick={() => assignSession.mutate({ sessionId })}
                    disabled={assignSession.isPending}
                    className="bg-black text-white hover:bg-gray-800 text-xs h-6 ml-2"
                  >
                    {assignSession.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign to me"}
                  </Button>
                </div>
              )}

              {/* Quick Replies */}
              {showQuickReplies && quickReplies && quickReplies.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr.id}
                      onClick={() => {
                        setInput(qr.content);
                        setShowQuickReplies(false);
                      }}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {qr.title}
                    </button>
                  ))}
                </div>
              )}
              {/* Image preview */}
              {imagePreview && (
                <div className="mb-2">
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-lg object-cover border border-gray-200" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-900"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={cn("p-2 transition-colors flex-shrink-0",
                    showQuickReplies ? "text-black" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Zap className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  disabled={isUploading}
                  aria-label="Attach image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                {imagePreview ? (
                  <Button
                    onClick={handleSendImage}
                    disabled={isUploading}
                    className="flex-1 bg-black hover:bg-gray-800 text-white text-xs gap-1.5"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ImageIcon className="w-3.5 h-3.5" /> Send Image</>}
                  </Button>
                ) : (
                  <>
                    <Textarea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message... (Shift+Enter for newline)"
                      rows={1}
                      className="flex-1 resize-none border-gray-200 focus:border-black focus:ring-black min-h-[40px] max-h-[120px] py-2.5 text-sm"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || sendMessage.isPending}
                      className="bg-black hover:bg-gray-800 text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Summary - hidden on mobile */}
        <div className="hidden lg:flex w-72 border-l border-gray-100 bg-white flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Conversation Summary</p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {session?.summary ? (
              <p className="text-sm text-gray-600 leading-relaxed">{session.summary}</p>
            ) : (
              <p className="text-xs text-gray-400">No summary yet</p>
            )}
          </div>
          {!isEnded && (
            <div className="p-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-2 border-gray-200"
                onClick={() => generateSummary.mutate({ sessionId })}
                disabled={generateSummary.isPending}
              >
                {generateSummary.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Update Summary
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
