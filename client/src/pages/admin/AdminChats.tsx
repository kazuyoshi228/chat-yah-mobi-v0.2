import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { io, Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Clock, User, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

type StatusFilter = "waiting" | "active" | "ended" | "all";

export default function AdminChats() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("waiting");
  const socketRef = useRef<Socket | null>(null);

  const { data: sessions, refetch } = trpc.admin.listChats.useQuery(
    { status: statusFilter },
    { refetchInterval: 10000 }
  );

  // Socket.io for real-time updates
  useEffect(() => {
    const socket: Socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_operators");

    socket.on("new_session", () => refetch());
    socket.on("session_assigned", () => refetch());
    socket.on("session_ended", () => refetch());

    return () => { socket.disconnect(); };
  }, [refetch]);

  const statusColor = (s: string) => {
    if (s === "waiting") return "bg-amber-100 text-amber-700";
    if (s === "active") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-500";
  };

  const waitingCount = sessions?.filter((s) => s.status === "waiting").length ?? 0;
  const activeCount = sessions?.filter((s) => s.status === "active").length ?? 0;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/yah-mobile-logo-horizontal_8744efd4.svg"
              alt="yah.mobile"
              className="h-7 w-auto"
            />
            <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
          </div>
          <div className="flex items-center gap-2">
            {waitingCount > 0 && (
              <Badge className="bg-amber-500 text-white">{waitingCount} waiting</Badge>
            )}
            {activeCount > 0 && (
              <Badge className="bg-green-500 text-white">{activeCount} active</Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="waiting">Waiting</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Session List */}
        <div className="space-y-2">
          {!sessions || sessions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No {statusFilter === "all" ? "" : statusFilter} chats</p>
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/admin/chats/reply/${session.id}`)}
                className="w-full text-left p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {session.visitorName || "Anonymous"}
                      </p>
                      {session.visitorEmail && (
                        <p className="text-xs text-muted-foreground truncate">{session.visitorEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
