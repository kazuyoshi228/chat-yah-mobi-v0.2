import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Clock, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function AdminChatList() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<SessionStatus | undefined>(undefined);
  const [socketConnected, setSocketConnected] = useState(false);

  // B-3: Polling fallback — 30s when Socket.io connected, 10s when disconnected
  const { data: sessions, refetch } = trpc.admin.listChats.useQuery(
    { status: statusFilter ?? "all" },
    { refetchInterval: socketConnected ? 30_000 : 10_000, refetchIntervalInBackground: true }
  );

  // Socket.io for real-time updates
  useEffect(() => {
    const socket: Socket = io(window.location.origin, {
      path: "/api/socket.io",
    });
    socket.emit("join_operators");
    // B-3: Track connectivity to adjust polling interval
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("new_session", () => refetch());
    socket.on("session_assigned", () => refetch());
    socket.on("session_ended", () => refetch());
    return () => { socket.disconnect(); setSocketConnected(false); };
  }, [refetch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Access denied</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/manus-storage/yah-mobile-logo-horizontal_8744efd4.svg"
            alt="yah.mobile"
            className="h-8 w-auto object-contain"
          />
          <h1 className="text-xl font-semibold text-gray-900">Chat List</h1>
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
                  onClick={() => navigate(`/admin/chats/${session.id}`)}
                  className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
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
                      <Badge
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium border-0",
                          STATUS_COLORS[session.status as SessionStatus]
                        )}
                      >
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
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 pl-12">
                      {session.summary}
                    </p>
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
