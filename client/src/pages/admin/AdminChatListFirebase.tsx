/**
 * AdminChatListFirebase — チャット履歴一覧（Firestore版）
 * セッション一覧 + メッセージ詳細表示
 */
import { useState, useEffect } from "react";
import {
  collection, query, orderBy, onSnapshot, limit, doc, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useChatSessions, type ChatSessionDoc } from "@/hooks/useFirestoreAdmin";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  MessageCircle, Bot, User, AlertTriangle, ChevronRight,
  X, Clock, Loader2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: unknown;
}

export default function AdminChatListFirebase() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { sessions, loading } = useChatSessions(statusFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");

  // 選択セッションのメッセージをリアルタイム監視
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);

    const ref = collection(db, `chatSessions/${selectedId}/messages`);
    const q = query(ref, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
      );
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [selectedId]);

  // 選択セッションの顧客名取得
  useEffect(() => {
    if (!selectedId) return;
    const session = sessions.find((s) => s.id === selectedId);
    if (!session) return;

    getDoc(doc(db, `customerProfiles/${session.visitorId}`)).then((snap) => {
      if (snap.exists()) {
        setCustomerName((snap.data().name as string) || "匿名");
      } else {
        setCustomerName("匿名ユーザー");
      }
    });
  }, [selectedId, sessions]);

  const selectedSession = sessions.find((s) => s.id === selectedId);

  const filters = [
    { key: "all", label: "全て" },
    { key: "active", label: "アクティブ" },
    { key: "ended", label: "終了" },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)]">
        {/* 左: セッション一覧 */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b">
            <h2 className="text-sm font-bold mb-2">チャット履歴</h2>
            <div className="flex gap-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    statusFilter === f.key
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                セッションがありません
              </div>
            ) : (
              <div className="p-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg mb-1 transition-colors",
                      selectedId === s.id
                        ? "bg-black text-white"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono">
                        {s.id.slice(0, 12)}...
                      </span>
                      <div className="flex gap-1">
                        {s.escalated && (
                          <AlertTriangle className={cn(
                            "w-3 h-3",
                            selectedId === s.id ? "text-red-300" : "text-red-500"
                          )} />
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            selectedId === s.id && "border-white/30 text-white/80"
                          )}
                        >
                          {s.language}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        s.status === "active" ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <span className={cn(
                        "text-xs",
                        selectedId === s.id ? "text-white/60" : "text-muted-foreground"
                      )}>
                        {s.status === "active" ? "アクティブ" : "終了"}
                      </span>
                      {s.summary && (
                        <span className={cn(
                          "text-xs truncate ml-1",
                          selectedId === s.id ? "text-white/50" : "text-muted-foreground"
                        )}>
                          — {s.summary}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* 右: メッセージ詳細 */}
        <div className="flex-1 flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">セッションを選択してください</p>
              </div>
            </div>
          ) : (
            <>
              {/* ヘッダー */}
              <div className="border-b p-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">{customerName}</h3>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedId}
                    </span>
                    {selectedSession?.escalated && (
                      <Badge variant="destructive" className="text-[10px]">
                        エスカレーション
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* メッセージ */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isVisitor = msg.role === "visitor";
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex items-end gap-2",
                            isVisitor ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          {!isVisitor && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                          {isVisitor && (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[70%] rounded-xl px-3 py-2 text-xs",
                              isVisitor
                                ? "bg-blue-600 text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-800 rounded-bl-sm"
                            )}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
