/**
 * ChatDetailBase — shared chat detail shell used by both
 * OperatorChatDetail (/ops/chats/:id) and AdminChatReply (/admin/chats/:id/reply).
 *
 * Differences between the two callers are injected via props:
 *   - mode: "operator" | "admin"
 *   - backPath: where the back button navigates
 *   - sidebarItems (optional, operator only)
 *   - mutations differ: assignSession vs assignChat, endSession vs endChat, etc.
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  User,
  Bot,
  Headphones,
  Zap,
  RefreshCw,
  ArrowLeft,
  Loader2,
  MessageCircle,
  Paperclip,
  ImageIcon,
  X as XIcon,
  PhoneOff,
  Star,
  UserCheck,
  StopCircle,
  CheckCircle2,
  XCircle,
  Search,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  id?: number;
  sessionId: number;
  role: "visitor" | "operator" | "ai";
  content: string;
  translation?: string | null; // DeepL translated text
  originalContent?: string | null; // original text before translation (for operator messages)
  fileUrl?: string | null;
  operatorName?: string;
  createdAt: Date | string;
}

interface SurveyResult {
  sessionId: number;
  rating: number;
  resolved: boolean | "yes" | "no" | null;
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

const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-500",
};

interface Props {
  sessionId: number;
  mode: "operator" | "admin";
  backPath: string;
  sidebarItems?: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

export default function ChatDetailBase({ sessionId, mode, backPath, sidebarItems }: Props) {
  const isValidSession = !isNaN(sessionId) && sessionId > 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typingInfo, setTypingInfo] = useState<{ role: string; isTyping: boolean } | null>(null);
  const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Right panel (operator mode only)
  const [rightTab, setRightTab] = useState<"summary" | "quickreplies">("quickreplies");
  const [qrSearch, setQrSearch] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: opDetail, refetch: refetchOp } = trpc.operator.getSessionDetail.useQuery(
    { sessionId },
    { enabled: isValidSession && mode === "operator" }
  );
  const { data: adminDetail, refetch: refetchAdmin } = trpc.admin.getChatDetail.useQuery(
    { sessionId },
    { enabled: isValidSession && mode === "admin" }
  );

  const detail = mode === "operator" ? opDetail : adminDetail;
  const refetch = mode === "operator" ? refetchOp : refetchAdmin;

  const { data: polledMessages } = trpc.chat.getMessages.useQuery(
    { sessionId },
    {
      enabled: isValidSession,
      refetchInterval: socketConnected ? 30_000 : 3_000,
      refetchIntervalInBackground: true,
    }
  );

  // Operator-only quick replies query
  const { data: opQuickReplies } = trpc.operator.listQuickReplies.useQuery(
    undefined,
    { enabled: mode === "operator" }
  );
  const adminQuickReplies = (adminDetail as any)?.quickReplies ?? [];
  const quickReplies = mode === "operator" ? (opQuickReplies ?? []) : adminQuickReplies;

  // Admin-only: operator list for assignment dropdown
  const { data: operatorList } = trpc.admin.listOperators.useQuery(
    undefined,
    { enabled: mode === "admin" }
  );
  const operators = (operatorList ?? []).filter((op: any) => op.role === "operator" || op.role === "admin");

  // ── Mutations ─────────────────────────────────────────────────────────────
  const assignSession = trpc.operator.assignSession.useMutation({
    onSuccess: () => { toast.success("Session assigned"); refetch(); },
  });
  const assignChat = trpc.admin.assignChat.useMutation({
    onSuccess: () => { toast.success("オペレーターをアサインしました"); refetch(); },
    onError: (e) => { toast.error(e.message); },
  });

  const opSendMessage = trpc.operator.sendMessage.useMutation({ onSuccess: () => setInput("") });
  const adminSendMessage = trpc.admin.sendChatMessage.useMutation({
    onSuccess: () => setInput(""),
    onError: () => toast.error("Failed to send message"),
  });

  const endSession = trpc.operator.endSession.useMutation({
    onSuccess: () => { toast.success("Session ended"); navigate(backPath); },
  });
  const endChat = trpc.admin.endChat.useMutation({
    onSuccess: () => { toast.success("Session ended"); navigate(backPath); },
  });

  const generateSummary = trpc.operator.generateSummary.useMutation({
    onSuccess: () => { toast.success("Summary generated"); refetch(); },
  });
  const refreshSummary = trpc.admin.refreshChatSummary.useMutation({
    onSuccess: () => { toast.success("Summary updated"); refetch(); },
  });

  const opTyping = trpc.operator.typing.useMutation();
  const uploadFile = trpc.upload.uploadFile.useMutation();

  // Mark read
  const opMarkRead = trpc.operator.markRead.useMutation();
  const adminMarkRead = trpc.admin.markRead.useMutation();
  const markRead = () => {
    if (mode === "operator") opMarkRead.mutate({ sessionId });
    else adminMarkRead.mutate({ sessionId });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleAssign = (operatorId?: number) => {
    if (mode === "operator") assignSession.mutate({ sessionId });
    else assignChat.mutate({ sessionId, operatorId });
  };
  const isAssignPending = mode === "operator" ? assignSession.isPending : assignChat.isPending;

  const handleEnd = () => {
    if (!confirm("このセッションを終了しますか？")) return;
    if (mode === "operator") endSession.mutate({ sessionId });
    else endChat.mutate({ sessionId });
  };
  const isEndPending = mode === "operator" ? endSession.isPending : endChat.isPending;

  const handleSummaryUpdate = () => {
    if (mode === "operator") generateSummary.mutate({ sessionId });
    else refreshSummary.mutate({ sessionId });
  };
  const isSummaryPending = mode === "operator" ? generateSummary.isPending : refreshSummary.isPending;

  const sendMessageMutate = (content: string, fileUrl?: string) => {
    const tempId = -(Date.now());
    setMessages((prev) => [
      ...prev,
      { id: tempId, sessionId, role: "operator", content: content ?? "", fileUrl: fileUrl ?? null, operatorName: user?.name ?? undefined, createdAt: new Date() },
    ]);
    const onSuccess = (data: { messageId: number }) => {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: data.messageId } : m));
    };
    const onError = () => {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (fileUrl) toast.error("Failed to send image.");
    };
    if (mode === "operator") {
      opSendMessage.mutate({ sessionId, content, fileUrl }, { onSuccess, onError });
    } else {
      adminSendMessage.mutate({ sessionId, content, fileUrl }, { onSuccess, onError });
    }
  };
  const isSendPending = mode === "operator" ? opSendMessage.isPending : adminSendMessage.isPending;

  // ── Polling merge ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!polledMessages) return;
    setMessages((prev) => {
      const withoutTemps = prev.filter((m) => m.id && m.id > 0);
      const allIds = new Set(withoutTemps.map((m) => m.id));
      const newMsgs = (polledMessages as ChatMessage[]).filter((m) => m.id && !allIds.has(m.id));
      if (newMsgs.length === 0) return prev;
      return [...withoutTemps, ...newMsgs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [polledMessages]);

  // Mark read when session is opened
  useEffect(() => {
    if (isValidSession) markRead();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidSession, sessionId]);

  // ── Load initial detail ───────────────────────────────────────────────────
  useEffect(() => {
    if (!detail) return;
    if (detail.messages) setMessages(detail.messages as ChatMessage[]);
    if ((detail as any).survey && !surveyResult) {
      const s = (detail as any).survey as any;
      setSurveyResult({
        sessionId: s.sessionId,
        rating: s.rating,
        resolved: s.resolved ?? null,
        freeComment: s.freeComment ?? null,
        submittedAt: s.createdAt ?? new Date(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  // ── Socket.io ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isValidSession) return;
    const socket: Socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_session", sessionId);
    socket.emit("join_operators");
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("new_message", (msg: ChatMessage) => {
      if (msg.role === "operator") return;
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Auto-mark as read when viewing the session
      markRead();
    });
    socket.on("typing", (data: { role: string; isTyping: boolean }) => {
      if (data.role !== "operator") setTypingInfo(data);
    });
    socket.on("session_ended", () => { toast.info("Session has ended"); refetch(); });
    socket.on("survey_submitted", (data: any) => {
      if (data.sessionId === sessionId) {
        setSurveyResult({
          sessionId: data.sessionId,
          rating: data.rating,
          resolved: data.resolved ?? null,
          freeComment: data.freeComment ?? null,
          submittedAt: data.submittedAt ?? new Date(),
        });
        toast.success("アンケートが送信されました");
      }
    });
    return () => { socket.disconnect(); setSocketConnected(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  // ── Send handlers ─────────────────────────────────────────────────────────
  const handleSend = () => {
    const content = input.trim();
    if (!content || isSendPending) return;
    setInput("");
    sendMessageMutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (mode === "operator") {
      opTyping.mutate({ sessionId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => opTyping.mutate({ sessionId, isTyping: false }), 1500);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Image must be under 16MB."); return; }
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
      const { url } = await uploadFile.mutateAsync({ fileName: imageFile.name, mimeType: imageFile.type, base64Data: base64, sessionId });
      setImageFile(null);
      setImagePreview(null);
      sendMessageMutate("", url);
    } catch {
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const session = (detail as any)?.session;
  const isEnded = session?.status === "ended";
  const isAssigned = mode === "operator" ? session?.operatorId === user?.id : false;

  // ── Render ────────────────────────────────────────────────────────────────
  const resolvedBool = (v: boolean | "yes" | "no" | null | undefined): boolean | null => {
    if (v === "yes" || v === true) return true;
    if (v === "no" || v === false) return false;
    return null;
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} title={mode === "operator" ? "Operator" : "Admin Dashboard"}>
      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-3 right-3 text-white/70 hover:text-white" onClick={() => setLightboxSrc(null)}>
            <XIcon className="w-6 h-6" />
          </button>
          <img src={lightboxSrc} alt="Full size" className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── Main Chat Area ── */}
        <div className="flex-1 flex flex-col min-w-0 w-0">
          {/* Header */}
          <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(backPath)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{session?.visitorName ?? "Anonymous"}</p>
                  <span className="text-xs text-gray-400">{LANG_LABELS[session?.language ?? "ja"]}</span>
                </div>
                {session?.visitorEmail && <p className="text-xs text-gray-400">{session.visitorEmail}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs border-0", STATUS_COLORS[session?.status ?? "ended"])}>
                {session?.status === "waiting" ? "Waiting" : session?.status === "active" ? "Active" : "Ended"}
              </Badge>
              {!isEnded && !isAssigned && mode === "operator" && (
                <Button size="sm" onClick={() => handleAssign()} disabled={isAssignPending} className="bg-black text-white hover:bg-gray-800 text-xs h-7 gap-1">
                  {isAssignPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserCheck className="w-3 h-3" /> Assign to me</>}
                </Button>
              )}
              {/* Admin: operator assignment dropdown */}
              {mode === "admin" && !isEnded && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <Select
                    value={session?.operatorId ? String(session.operatorId) : ""}
                    onValueChange={(val) => {
                      if (val === "unassign") {
                        // no unassign API yet — show info
                        toast.info("アサイン解除は現在未対応です");
                        return;
                      }
                      handleAssign(Number(val));
                    }}
                    disabled={isAssignPending}
                  >
                    <SelectTrigger className="h-7 text-xs w-40 border-gray-200 bg-white">
                      <SelectValue placeholder="オペレーターを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.length === 0 && (
                        <SelectItem value="__none" disabled>オペレーターなし</SelectItem>
                      )}
                      {operators.map((op: any) => {
                        const displayName = op.firstName
                          ? `${op.firstName}${op.lastName ? " " + op.lastName : ""}`
                          : op.name ?? op.email;
                        return (
                          <SelectItem key={op.id} value={String(op.id)}>
                            {displayName}
                            {op.role === "admin" && (
                              <span className="ml-1 text-[10px] text-gray-400">(admin)</span>
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {isAssignPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                </div>
              )}
              {!isEnded && (
                <Button size="sm" onClick={handleEnd} disabled={isEndPending} className="bg-red-500 hover:bg-red-600 text-white text-xs h-7 gap-1.5 border-0">
                  {isEndPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><StopCircle className="w-3 h-3" /> End</>}
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
                  <div key={msg.id ?? i} className={cn("flex items-end gap-2 mb-3", isVisitor ? "flex-row" : "flex-row-reverse")}>
                    {!isOp && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200">
                        {isVisitor ? <User className="w-3.5 h-3.5 text-gray-500" /> : isAI ? <Bot className="w-3.5 h-3.5 text-gray-500" /> : <Headphones className="w-3.5 h-3.5 text-gray-500" />}
                      </div>
                    )}
                    <div className={cn("max-w-[70%] flex flex-col", isVisitor ? "items-start" : "items-end")}>
                      {!isOp && (
                        <span className="text-[10px] text-gray-400 mb-0.5">
                          {isAI ? "AI" : isVisitor ? (session?.visitorName ?? "Visitor") : (msg.operatorName ?? "Operator")}
                        </span>
                      )}
                      <div className={cn(
                        "rounded-2xl overflow-hidden",
                        isOp ? "bg-gray-900 text-white rounded-br-sm" : isAI ? "bg-blue-50 text-blue-900 rounded-bl-sm" : "bg-white border border-gray-100 rounded-bl-sm"
                      )}>
                        {msg.fileUrl && (
                          <button onClick={() => setLightboxSrc(msg.fileUrl!)} className="block w-full">
                            <img src={msg.fileUrl} alt="Attachment" className="max-w-[220px] max-h-[220px] object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                          </button>
                        )}
                        {msg.content && (
                          <div className="px-3 py-2 text-sm whitespace-pre-wrap break-words">
                            {/* For operator messages: show originalContent (JP) if available, else content */}
                            {isOp ? (msg.originalContent ?? msg.content) : msg.content}
                          </div>
                        )}
                        {/* Layer 1: Show translation for visitor messages (non-Japanese sessions) */}
                        {isVisitor && msg.translation && (() => {
                          const isFailed = msg.translation === "[翻訳できませんでした]" || msg.translation === "[翻訳上限に達しました]";
                          return (
                            <div className={`px-3 pb-2 border-t mt-0.5 ${isFailed ? "border-amber-100 bg-amber-50/50" : "border-gray-100"}`}>
                              <p className={`text-[11px] leading-relaxed ${isFailed ? "text-amber-600" : "text-gray-400"}`}>
                                <span className="font-medium">{isFailed ? "⚠ " : "🌐 "}</span>{msg.translation}
                              </p>
                            </div>
                          );
                        })()}
                        {/* Layer 1b: Show translation for AI messages (non-Japanese sessions) */}
                        {isAI && msg.translation && (() => {
                          const isFailed = msg.translation === "[翻訳できませんでした]" || msg.translation === "[翻訳上限に達しました]";
                          return (
                            <div className={`px-3 pb-2 border-t mt-0.5 ${isFailed ? "border-amber-200 bg-amber-50/50" : "border-blue-100"}`}>
                              <p className={`text-[11px] leading-relaxed ${isFailed ? "text-amber-600" : "text-blue-400"}`}>
                                <span className="font-medium">{isFailed ? "⚠ " : "🌐 "}</span>{msg.translation}
                              </p>
                            </div>
                          );
                        })()}
                        {/* Layer 2: Show translated text for operator messages sent to non-Japanese visitors */}
                        {isOp && msg.translation && (() => {
                          const isFailed = msg.translation === "[翻訳できませんでした]" || msg.translation === "[翻訳上限に達しました]";
                          return (
                            <div className={`px-3 pb-2 border-t mt-0.5 ${isFailed ? "border-amber-400/40 bg-amber-500/20" : "border-white/20"}`}>
                              <p className={`text-[11px] leading-relaxed ${isFailed ? "text-amber-200" : "text-white/60"}`}>
                                <span className="font-medium">{isFailed ? "⚠ " : "→ "}</span>{msg.translation}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typingInfo?.isTyping && (
                <div className="flex items-end gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((n) => (
                        <span key={n} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${n * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Survey result card */}
              {surveyResult && (
                <div className="mx-auto max-w-sm w-full mt-4">
                  <div className="rounded-xl border bg-white p-4 space-y-2 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">アンケート結果</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("w-5 h-5", n <= surveyResult.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                      ))}
                      <span className="ml-1 text-sm font-medium text-gray-700">{surveyResult.rating} / 5</span>
                    </div>
                    {resolvedBool(surveyResult.resolved) !== null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        {resolvedBool(surveyResult.resolved) ? (
                          <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-green-700">問題解決済み</span></>
                        ) : (
                          <><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-700">未解決</span></>
                        )}
                      </div>
                    )}
                    {surveyResult.freeComment && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
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

          {/* Admin: inline quick replies strip */}
          {mode === "admin" && !isEnded && quickReplies.length > 0 && (
            <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto shrink-0 bg-white">
              {quickReplies.slice(0, 5).map((qr: { id: number; title: string; content: string }) => (
                <button key={qr.id} onClick={() => setInput(qr.content)}
                  className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50 whitespace-nowrap transition-colors">
                  {qr.title}
                </button>
              ))}
            </div>
          )}

          {/* Admin: summary strip */}
          {mode === "admin" && session?.summary && (
            <div className="px-4 py-2 border-t bg-gray-50 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">Summary</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleSummaryUpdate} disabled={isSummaryPending}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Update
                </Button>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{session.summary}</p>
            </div>
          )}

          {/* Input */}
          {isEnded ? (
            <div className="px-4 py-3 border-t text-center text-sm text-gray-400 bg-gray-50 shrink-0">
              This session has ended.
            </div>
          ) : (
            <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3">
              {/* Operator: assign banner */}
              {mode === "operator" && !isAssigned && (
                <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-700">このセッションはまだアサインされていません</p>
                  <Button size="sm" onClick={() => handleAssign()} disabled={isAssignPending} className="bg-black text-white hover:bg-gray-800 text-xs h-6 ml-2">
                    {isAssignPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign to me"}
                  </Button>
                </div>
              )}

              {/* Operator: quick reply popup */}
              {mode === "operator" && showQuickReplies && quickReplies.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {quickReplies.map((qr: { id: number; title: string; content: string }) => (
                    <button key={qr.id} onClick={() => { setInput(qr.content); setShowQuickReplies(false); }}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors">
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
                    <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-900">
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <div className="flex items-end gap-2">
                {mode === "operator" && (
                  <button onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className={cn("p-2 transition-colors flex-shrink-0", showQuickReplies ? "text-black" : "text-gray-400 hover:text-gray-600")}>
                    <Zap className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0" aria-label="Attach image">
                  <Paperclip className="w-4 h-4" />
                </button>
                {imagePreview ? (
                  <Button onClick={handleSendImage} disabled={isUploading} className="flex-1 bg-black hover:bg-gray-800 text-white text-xs gap-1.5">
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ImageIcon className="w-3.5 h-3.5" /> Send Image</>}
                  </Button>
                ) : (
                  <>
                    <Textarea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message… (Shift+Enter for newline)"
                      rows={1}
                      className="flex-1 resize-none border-gray-200 focus:border-black focus:ring-black min-h-[40px] max-h-[120px] py-2.5 text-sm"
                    />
                    <Button onClick={handleSend} disabled={!input.trim() || isSendPending}
                      className="bg-black hover:bg-gray-800 text-white rounded-full w-10 h-10 p-0 flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel (operator mode only) ── */}
        {mode === "operator" && (
          <div className="hidden lg:flex w-72 border-l border-gray-100 bg-white flex-col min-h-0 overflow-hidden">
            <div className="shrink-0 flex border-b border-gray-100">
              {(["quickreplies", "summary"] as const).map((tab) => (
                <button key={tab} onClick={() => setRightTab(tab)}
                  className={cn("flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                    rightTab === tab ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-gray-600")}>
                  {tab === "quickreplies" ? "Quick Replies" : "Summary"}
                </button>
              ))}
            </div>

            {rightTab === "quickreplies" && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="shrink-0 px-3 py-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" value={qrSearch} onChange={(e) => setQrSearch(e.target.value)} placeholder="Search..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-gray-50" />
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                  {quickReplies.filter((qr: { title: string; content: string }) =>
                    qrSearch === "" || qr.title.toLowerCase().includes(qrSearch.toLowerCase()) || qr.content.toLowerCase().includes(qrSearch.toLowerCase())
                  ).map((qr: { id: number; title: string; content: string }) => (
                    <button key={qr.id} onClick={() => { setInput(qr.content); toast.success(`"${qr.title}" をセット`); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors group border border-transparent hover:border-gray-200">
                      <p className="text-xs font-medium text-gray-800 group-hover:text-black truncate">{qr.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{qr.content}</p>
                    </button>
                  ))}
                  {quickReplies.length > 0 && quickReplies.filter((qr: { title: string; content: string }) =>
                    qrSearch === "" || qr.title.toLowerCase().includes(qrSearch.toLowerCase()) || qr.content.toLowerCase().includes(qrSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No results</p>
                  )}
                  {quickReplies.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No quick replies</p>
                  )}
                </div>
              </div>
            )}

            {rightTab === "summary" && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                  {session?.summary ? (
                    <p className="text-sm text-gray-600 leading-relaxed">{session.summary}</p>
                  ) : (
                    <p className="text-xs text-gray-400">No summary yet</p>
                  )}
                </div>
                {!isEnded && (
                  <div className="p-4 border-t border-gray-100">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-2 border-gray-200"
                      onClick={handleSummaryUpdate} disabled={isSummaryPending}>
                      {isSummaryPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Update Summary
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
