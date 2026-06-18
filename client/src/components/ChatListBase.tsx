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
  es: "🇪🇸",
  ko: "🇰🇷",
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
    {
      enabled: mode === "admin",
      refetchInterval: socketConnected ? 30_000 : 10_000,
      refetchIntervalInBackground: true,
    }
  );

  const sessions = mode === "operator" ? opSessions : adminSessions;
  const refetch = mode === "operator" ? refetchOp : refetchAdmin;

  const { data: activeCounts, isLoading: isLoadingCounts } = trpc.operator.getActiveCounts.useQuery(
    undefined,
    { enabled: mode === "operator" && isAuthenticated, refetchInterval: 15000 }
  );

  // ── Unread session IDs ────────────────────────────────────────────────────
  const { data: unreadData, refetch: refetchUnread } = mode === "operator"
    ? trpc.operator.getUnreadSessionIds.useQuery(undefined, {
        enabled: isAuthenticated,
        refetchInterval: 15000,
      })
    : trpc.admin.getUnreadSessionIds.useQuery(undefined, {
        enabled: isAuthenticated,
        refetchInterval: 15000,
      });
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
    socket.on("session_assigned", () => { refetch(); refetchUnread(); });
    socket.on("session_ended", () => { refetch(); refetchUnread(); });
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
  }, [refetch, navigate, mode]);

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
