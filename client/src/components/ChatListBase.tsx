/**
 * ChatListBase — shared chat list shell used by both
 * OperatorChats (/ops/chats) and AdminChatList (/admin/chats).
 *
 * Operator-only extras (KPI counts, browser notifications, escalation toasts)
 * are rendered only when mode="operator".
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { YahLogo } from "@/components/YahLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Clock, User, Loader2, Bell, AlertCircle, Headphones, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SessionStatus = "waiting" | "active" | "ended";

const STATUS_LABELS: Record<SessionStatus, string> = {
  waiting: "Waiting",
  active: "Active",
  ended: "Ended",
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  waiting: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-500",
};

const LANG_LABELS: Record<string, string> = {
  ja: "🇯🇵",
  en: "🇺🇸",
  zh: "🇨🇳",
  ko: "🇰🇷",
  th: "🇹🇭",
  vi: "🇻🇳",
};

interface Props {
  mode: "operator" | "admin";
  sidebarItems?: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

export default function ChatListBase({ mode, sidebarItems }: Props) {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<SessionStatus | undefined>(undefined);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: opSessions, refetch: refetchOp } = trpc.operator.listSessions.useQuery(
    { status: statusFilter },
    { enabled: mode === "operator" }
  );
  const { data: adminSessions, refetch: refetchAdmin } = trpc.admin.listChats.useQuery(
    { status: statusFilter ?? "all" },
    { enabled: mode === "admin" }
  );

  const sessions = mode === "operator" ? opSessions : adminSessions;
  const refetch = mode === "operator" ? refetchOp : refetchAdmin;

  const { data: activeCounts, refetch: refetchCounts, isLoading: isLoadingCounts } = trpc.operator.getActiveCounts.useQuery(
    undefined,
    { enabled: mode === "operator" && isAuthenticated }
  );

  // ── Unread session IDs ────────────────────────────────────────────────────
  const { data: unreadData, refetch: refetchUnread } = mode === "operator"
    ? trpc.operator.getUnreadSessionIds.useQuery(undefined, { enabled: isAuthenticated })
    : trpc.admin.getUnreadSessionIds.useQuery(undefined, { enabled: isAuthenticated });
  const unreadSet = new Set(unreadData?.unreadIds ?? []);

  // ── Socket.io ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket: Socket = io(window.location.origin, { path: "/api/socket.io" });
    socket.emit("join_operators");
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("new_session", (data: { sessionId: number; visitorName?: string }) => {
      refetch();
      refetchUnread();
      if (mode === "operator") refetchCounts();
      if (mode === "operator") {
        toast.info(`New chat: ${data.visitorName ?? "Visitor"}`, {
          description: "A new chat has started",
          action: { label: "Respond", onClick: () => navigate(`/ops/chats/${data.sessionId}`) },
        });
        if (Notification.permission === "granted") {
          new Notification("New Chat", { body: `${data.visitorName ?? "Visitor"} started a chat`, icon: "/favicon.ico" });
        }
      }
    });
    socket.on("session_assigned", () => { refetch(); refetchUnread(); if (mode === "operator") refetchCounts(); });
    socket.on("session_ended", () => { refetch(); refetchUnread(); if (mode === "operator") refetchCounts(); });
    socket.on("new_message", () => refetchUnread());
    if (mode === "operator") {
      socket.on("escalation_alert", (data: { sessionId: number; visitorName?: string }) => {
        refetch();
        toast.warning(`Escalation: ${data.visitorName ?? "Visitor"}`, {
          description: "Operator assistance required",
          action: { label: "Respond", onClick: () => navigate(`/ops/chats/${data.sessionId}`) },
        });
      });
    }
    return () => { socket.disconnect(); setSocketConnected(false); };
  }, [refetch, refetchCounts, refetchUnread, navigate, mode]);

  // ── Notification permission ───────────────────────────────────────────────
  useEffect(() => { setNotifPermission(Notification.permission); }, []);
  const requestNotifPermission = async () => {
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasAccess = mode === "operator"
    ? isAuthenticated && (user?.role === "operator" || user?.role === "admin")
    : isAuthenticated && user?.role === "admin";

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Access denied</p>
      </div>
    );
  }

  const detailPath = (id: number) =>
    mode === "operator" ? `/ops/chats/${id}` : `/admin/chats/${id}/reply`;

  return (
    <DashboardLayout sidebarItems={sidebarItems} title={mode === "operator" ? "Operator" : "Admin Dashboard"}>
      <div className="p-6">
        {/* Operator: KPI count cards */}
        {mode === "operator" && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold text-gray-700">対応必要</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStatusFilter("waiting")}
                className={cn("relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                  (activeCounts?.waiting ?? 0) > 0 ? "border-red-300 bg-red-50" : "border-gray-100 bg-white")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-medium text-gray-500">Waiting</span>
                  </div>
                  {(activeCounts?.waiting ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                {isLoadingCounts ? <Loader2 className="w-5 h-5 animate-spin text-gray-300" /> : (
                  <p className={cn("text-4xl font-bold", (activeCounts?.waiting ?? 0) > 0 ? "text-red-600" : "text-gray-300")}>
                    {activeCounts?.waiting ?? 0}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">オペレーター待ち</p>
              </button>

              <button onClick={() => setStatusFilter("active")}
                className={cn("relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                  (activeCounts?.active ?? 0) > 0 ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-gray-500">Active</span>
                  </div>
                  {(activeCounts?.active ?? 0) > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                </div>
                {isLoadingCounts ? <Loader2 className="w-5 h-5 animate-spin text-gray-300" /> : (
                  <p className={cn("text-4xl font-bold", (activeCounts?.active ?? 0) > 0 ? "text-blue-600" : "text-gray-300")}>
                    {activeCounts?.active ?? 0}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">対応中</p>
              </button>
            </div>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <YahLogo height={32} className="text-black" />
            <h1 className="text-xl font-semibold text-gray-900">Chat List</h1>
          </div>
          {mode === "operator" && notifPermission !== "granted" && (
            <Button variant="outline" size="sm" onClick={requestNotifPermission} className="gap-2 text-xs">
              <Bell className="w-3.5 h-3.5" />
              Enable Notifications
            </Button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <Tabs
          value={statusFilter ?? "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? undefined : (v as SessionStatus))}
          className="mb-4"
        >
          <TabsList className="bg-gray-100">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="waiting">Waiting</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Session List */}
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-2">
            {!sessions || sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No chats found</p>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(detailPath(session.id))}
                  className={cn(
                    "w-full text-left bg-white border rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all group",
                    unreadSet.has(session.id)
                      ? "border-blue-300 bg-blue-50/40"
                      : "border-gray-100"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                        {unreadSet.has(session.id) && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {session.visitorName ?? "Anonymous"}
                          </p>
                          {(session as any).isGoogleLogin === 1 && (
                            <span
                              title="Googleアカウントでログイン済み"
                              className="inline-flex items-center gap-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
                            >
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              ログイン済み
                            </span>
                          )}
                          <span className="text-base">
                            {LANG_LABELS[session.language ?? "en"] ?? "🌐"}
                          </span>
                        </div>
                        {session.visitorEmail && (
                          <p className="text-xs text-gray-400 truncate">{session.visitorEmail}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge className={cn("text-xs px-2 py-0.5 rounded-full font-medium border-0", STATUS_COLORS[session.status as SessionStatus])}>
                        {STATUS_LABELS[session.status as SessionStatus]}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(session.createdAt).toLocaleString("en-US", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  {session.summary && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 pl-12">{session.summary}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}
