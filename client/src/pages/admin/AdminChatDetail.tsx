import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bot,
  ArrowLeft,
  Loader2,
  RefreshCw,
  XCircle,
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

export default function AdminChatDetail() {
  const { id: sessionIdStr } = useParams<{ id: string }>();
  const sessionId = parseInt(sessionIdStr ?? "", 10);
  const isValidSession = !isNaN(sessionId) && sessionId > 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: detail, refetch } = trpc.admin.getChatDetail.useQuery(
    { sessionId },
    { enabled: isValidSession }
  );

  const endSession = trpc.admin.endChat.useMutation({
    onSuccess: () => {
      toast.success("Session ended");
      refetch();
    },
  });

  const generateSummary = trpc.admin.refreshChatSummary.useMutation({
    onSuccess: () => {
      toast.success("Summary generated");
      refetch();
    },
  });

  // Sync messages from query
  useEffect(() => {
    if (detail?.messages) {
      setMessages(detail.messages as ChatMessage[]);
    }
  }, [detail]);

  // Socket.io for real-time updates (read-only monitoring)
  useEffect(() => {
    if (!isValidSession) return;
    const socket: Socket = io(window.location.origin, { path: "/api/socket.io" });
    socket.emit("join_session", sessionId);

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("session_ended", () => refetch());

    return () => { socket.disconnect(); };
  }, [sessionId, isValidSession, refetch]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isValidSession) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">Invalid session</p>
        </div>
      </DashboardLayout>
    );
  }

  const session = detail?.session;
  const isEnded = session?.status === "ended";

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 w-0">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/chats")}
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
                {session?.status === "waiting" ? "Waiting" :
                 session?.status === "active" ? "Active" : "Ended"}
              </Badge>
              {!isEnded && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => endSession.mutate({ sessionId })}
                  disabled={endSession.isPending}
                  className="text-xs h-7 border-gray-200 text-red-500 hover:text-red-600 hover:border-red-300 gap-1"
                >
                  <XCircle className="w-3 h-3" />
                  Force End
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4 bg-gray-50">
            <div className="max-w-2xl mx-auto space-y-1">
              {messages.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading messages...</p>
                </div>
              )}
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
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {isVisitor
                          ? <User className="w-3.5 h-3.5 text-gray-500" />
                          : <Bot className="w-3.5 h-3.5 text-gray-500" />}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                      isVisitor ? "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm" :
                      isOp ? "bg-black text-white rounded-br-sm" :
                      "bg-gray-100 text-gray-700 rounded-bl-sm"
                    )}>
                      {isAI && <p className="text-xs text-gray-400 mb-1">AI</p>}
                      {isOp && <p className="text-xs text-white/60 mb-1">Operator</p>}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.fileUrl && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-xs underline opacity-70"
                        >
                          Attachment
                        </a>
                      )}
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Read-only notice */}
          <div className="bg-white border-t border-gray-100 px-4 py-2 text-center">
            <p className="text-xs text-gray-400">Admin view — read only. Use Operator portal to respond.</p>
          </div>
        </div>

        {/* Right Panel: Summary — hidden on mobile */}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
