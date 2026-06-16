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

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();
  const { data: detail, refetch } = trpc.operator.getSessionDetail.useQuery(
    { sessionId },
    { enabled: isValidSession }
  );
  const { data: quickReplies } = trpc.operator.listQuickReplies.useQuery();

  const assignSession = trpc.operator.assignSession.useMutation({
    onSuccess: () => { toast.success("Session assigned"); refetch(); },
  });

  const sendMessage = trpc.operator.sendMessage.useMutation({
    onSuccess: () => setInput(""),
  });

  const endSession = trpc.operator.endSession.useMutation({
    onSuccess: () => { toast.success("Session ended"); navigate("/operator/chats"); },
  });

  const generateSummary = trpc.operator.generateSummary.useMutation({
    onSuccess: (data) => { toast.success("Summary generated"); refetch(); },
  });

  const sendTyping = trpc.operator.typing.useMutation();

  // Socket.io
  useEffect(() => {
    const socket: Socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_session", sessionId);
    socket.emit("join_operators");

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => {
        // Skip if already present by id (avoids duplicate with optimistic update)
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

    return () => { socket.disconnect(); };
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
    { title: "Chat List", href: "/operator/chats", icon: MessageCircle },
  ];

  return (
    <DashboardLayout sidebarItems={sidebarItems} title="Operator">
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 w-0">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/operator/chats")}
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
                  Assign to me
                </Button>
              )}
              {!isEnded && isAssigned && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => endSession.mutate({ sessionId })}
                  disabled={endSession.isPending}
                  className="text-xs h-7 border-gray-200"
                >
                  End session
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4 bg-gray-50">
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
                      "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                      isVisitor ? "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm" :
                      isOp ? "bg-black text-white rounded-br-sm" :
                      "bg-gray-100 text-gray-700 rounded-bl-sm"
                    )}>
                      {isAI && <p className="text-xs text-gray-400 mb-1">AI</p>}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
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
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {!isEnded && isAssigned && (
            <div className="bg-white border-t border-gray-100 px-4 py-3">
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
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={cn("p-2 transition-colors flex-shrink-0",
                    showQuickReplies ? "text-black" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Zap className="w-4 h-4" />
                </button>
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
