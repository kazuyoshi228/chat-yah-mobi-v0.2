import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Send, UserCheck, StopCircle, RefreshCw, Bot, User } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

interface ChatMessage {
  id?: number;
  sessionId: number;
  role: "visitor" | "operator" | "ai";
  content: string;
  fileUrl?: string;
  operatorName?: string;
  createdAt: Date;
}

export default function AdminChatReply() {
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: detail, refetch } = trpc.admin.getChatDetail.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  const assignChat = trpc.admin.assignChat.useMutation({
    onSuccess: () => { toast.success("Session assigned to you"); refetch(); },
  });
  const sendMessage = trpc.admin.sendChatMessage.useMutation({
    onSuccess: () => { setInput(""); },
    onError: () => toast.error("Failed to send message"),
  });
  const endChat = trpc.admin.endChat.useMutation({
    onSuccess: () => { toast.success("Session ended"); navigate("/admin/chats"); },
  });
  const refreshSummary = trpc.admin.refreshChatSummary.useMutation({
    onSuccess: (data) => { toast.success("Summary updated"); refetch(); },
  });

  // Load initial messages
  useEffect(() => {
    if (detail?.messages) {
      setMessages(detail.messages.map((m) => ({ ...m, fileUrl: m.fileUrl ?? undefined, createdAt: new Date(m.createdAt) })));
    }
  }, [detail?.messages]);

  // Socket.io
  useEffect(() => {
    if (!sessionId) return;
    const socket: Socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_session", String(sessionId));
    socket.emit("join_operators");

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
      });
    });
    socket.on("typing", (data: { role: string; isTyping: boolean }) => {
      if (data.role !== "operator") setIsTyping(data.isTyping);
    });
    socket.on("session_ended", () => {
      toast.info("Session has ended");
      refetch();
    });

    return () => { socket.disconnect(); };
  }, [sessionId, refetch]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || sendMessage.isPending) return;
    // Optimistic update
    setMessages((prev) => [
      ...prev,
      { sessionId, role: "operator", content, operatorName: user?.name ?? undefined, createdAt: new Date() },
    ]);
    sendMessage.mutate({ sessionId, content });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const session = detail?.session;
  const quickReplies = detail?.quickReplies ?? [];
  const isEnded = session?.status === "ended";

  const statusColor =
    session?.status === "waiting" ? "bg-amber-100 text-amber-700" :
    session?.status === "active" ? "bg-green-100 text-green-700" :
    "bg-gray-100 text-gray-500";

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-0px)] max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/chats")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{session?.visitorName || "Anonymous"}</span>
                {session && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                    {session.status}
                  </span>
                )}
              </div>
              {session?.visitorEmail && (
                <p className="text-xs text-muted-foreground">{session.visitorEmail}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.status === "waiting" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => assignChat.mutate({ sessionId })}
                disabled={assignChat.isPending}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Assign to me
              </Button>
            )}
            {!isEnded && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => endChat.mutate({ sessionId })}
                disabled={endChat.isPending}
              >
                <StopCircle className="h-4 w-4 mr-1" />
                End
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => {
            const isOp = msg.role === "operator";
            const isAI = msg.role === "ai";
            return (
              <div key={msg.id ?? i} className={`flex ${isOp ? "justify-end" : "justify-start"}`}>
                {!isOp && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center mr-2 mt-1 shrink-0">
                    {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                )}
                <div className={`max-w-[70%] ${isOp ? "items-end" : "items-start"} flex flex-col`}>
                  {!isOp && (
                    <span className="text-xs text-muted-foreground mb-0.5">
                      {isAI ? "AI" : msg.operatorName || "Visitor"}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isOp
                        ? "bg-foreground text-background rounded-br-sm"
                        : isAI
                        ? "bg-blue-50 text-blue-900 rounded-bl-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted px-3 py-2 rounded-2xl text-sm text-muted-foreground animate-pulse">
                Typing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Replies */}
        {!isEnded && quickReplies.length > 0 && (
          <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto shrink-0">
            {quickReplies.slice(0, 5).map((qr) => (
              <button
                key={qr.id}
                onClick={() => setInput(qr.content)}
                className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent whitespace-nowrap transition-colors"
              >
                {qr.title}
              </button>
            ))}
          </div>
        )}

        {/* Summary (collapsed) */}
        {session?.summary && (
          <div className="px-4 py-2 border-t bg-muted/30 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Summary</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => refreshSummary.mutate({ sessionId })}
                disabled={refreshSummary.isPending}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{session.summary}</p>
          </div>
        )}

        {/* Input */}
        {isEnded ? (
          <div className="px-4 py-3 border-t text-center text-sm text-muted-foreground bg-muted/30 shrink-0">
            This session has ended.
          </div>
        ) : (
          <div className="px-4 py-3 border-t bg-background shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                className="resize-none min-h-[44px] max-h-32 text-sm"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMessage.isPending}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
