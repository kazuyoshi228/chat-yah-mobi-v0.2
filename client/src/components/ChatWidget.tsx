/**
 * ChatWidget - Embeddable floating chat button + chat window
 * Can be embedded in any page via: <ChatWidget />
 * Or as a floating widget on the home page.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Headphones,
  Minimize2,
  Loader2,
  Star,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

interface ChatMessage {
  id?: number;
  sessionId: number;
  role: "visitor" | "operator" | "ai";
  content: string;
  createdAt: Date | string;
}

function getOrCreateVisitorId(): string {
  const key = "yah_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = nanoid();
    localStorage.setItem(key, id);
  }
  return id;
}

type WidgetState = "closed" | "start" | "chat" | "ended";

export default function ChatWidget() {
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [typingInfo, setTypingInfo] = useState<boolean>(false);
  const [rating, setRating] = useState(0);
  const [resolved, setResolved] = useState<"yes" | "no" | null>(null);
  const [freeComment, setFreeComment] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const startSession = trpc.chat.startSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setWidgetState("chat");
      // Load initial messages
      if (data.aiResponse) {
        setMessages([
          {
            sessionId: data.sessionId,
            role: "visitor",
            content: initialMessage,
            createdAt: new Date(),
          },
          {
            sessionId: data.sessionId,
            role: "ai",
            content: data.aiResponse,
            createdAt: new Date(),
          },
        ]);
      }
    },
  });

  const sendMessage = trpc.chat.sendMessage.useMutation();
  const endSession = trpc.chat.endSession.useMutation({
    onSuccess: () => setWidgetState("ended"),
  });
  const submitSurvey = trpc.chat.submitSurvey.useMutation({
    onSuccess: () => setSurveySubmitted(true),
  });

  // Socket.io
  useEffect(() => {
    if (!sessionId) return;

    const socket = io(window.location.origin, { path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join_session", sessionId);

    socket.on("new_message", (msg: ChatMessage) => {
      if (msg.role !== "visitor") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (widgetState !== "chat") {
          setUnreadCount((c) => c + 1);
        }
      }
    });

    socket.on("typing", (data: { role: string; isTyping: boolean }) => {
      if (data.role !== "visitor") setTypingInfo(data.isTyping);
    });

    socket.on("session_ended", () => setWidgetState("ended"));

    return () => { socket.disconnect(); };
  }, [sessionId]);

  // Reset unread when chat is open
  useEffect(() => {
    if (widgetState === "chat") setUnreadCount(0);
  }, [widgetState]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  const handleStartChat = () => {
    if (!initialMessage.trim()) return;
    const visitorId = getOrCreateVisitorId();
    startSession.mutate({
      visitorId,
      visitorName: visitorName || undefined,
      initialMessage,
      language: "en",
    });
  };

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !sessionId) return;
    const visitorId = getOrCreateVisitorId();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { sessionId, role: "visitor", content, createdAt: new Date() },
    ]);
    sendMessage.mutate({ sessionId, visitorId, content });
  }, [input, sessionId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = () => {
    if (!sessionId) return;
    const visitorId = getOrCreateVisitorId();
    endSession.mutate({ sessionId, visitorId });
  };

  const handleSurveySubmit = () => {
    if (!sessionId || rating === 0) return;
    const visitorId = getOrCreateVisitorId();
    submitSurvey.mutate({
      sessionId,
      visitorId,
      rating,
      resolved: resolved ?? undefined,
      freeComment: freeComment || undefined,
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {widgetState !== "closed" && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: "500px" }}>
          {/* Header */}
          <div className="bg-black px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">yah.mobile Support</p>
                <p className="text-xs text-white/60">
                  {widgetState === "chat" ? "AI + Operator" : "Chat"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWidgetState("closed")}
                className="p-1.5 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Start Form */}
          {widgetState === "start" && (
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
              <p className="text-sm text-gray-600">
                Feel free to ask us anything. Our AI will respond instantly.
              </p>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
              <Textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="How can we help you today?"
                rows={4}
                className="resize-none border-gray-200 focus:border-black focus:ring-black text-sm"
              />
              <Button
                onClick={handleStartChat}
                disabled={!initialMessage.trim() || startSession.isPending}
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                {startSession.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Start Chat"
                )}
              </Button>
            </div>
          )}

          {/* Chat Messages */}
          {widgetState === "chat" && (
            <>
              <ScrollArea className="flex-1 px-3 py-3">
                <div className="space-y-2">
                  {messages.map((msg, i) => {
                    const isVisitor = msg.role === "visitor";
                    return (
                      <div
                        key={msg.id ?? i}
                        className={cn("flex items-end gap-2", isVisitor ? "flex-row-reverse" : "flex-row")}
                      >
                        {!isVisitor && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            {msg.role === "ai" ? (
                              <Bot className="w-3 h-3 text-gray-500" />
                            ) : (
                              <Headphones className="w-3 h-3 text-gray-500" />
                            )}
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2 text-xs",
                          isVisitor
                            ? "bg-black text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        )}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}

                  {typingInfo && (
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <Bot className="w-3 h-3 text-gray-500" />
                      </div>
                      <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-gray-100 px-3 py-2 flex items-end gap-2 flex-shrink-0">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none border-gray-200 focus:border-black focus:ring-black min-h-[36px] max-h-[80px] py-2 text-xs"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-black hover:bg-gray-800 text-white rounded-full w-8 h-8 p-0 flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* End Session */}
              <div className="px-3 pb-2 flex-shrink-0">
                <button
                  onClick={handleEndSession}
                  className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
                >
                  End chat
                </button>
              </div>
            </>
          )}

          {/* Ended + Survey */}
          {widgetState === "ended" && (
            <div className="flex-1 p-4 flex flex-col items-center justify-center gap-3 overflow-y-auto">
              {!surveySubmitted ? (
                <>
                  <p className="text-sm font-medium text-gray-900 text-center">
                    How was your experience?
                  </p>
                  {/* Star rating */}
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRating(s)}>
                        <Star className={cn(
                          "w-7 h-7 transition-colors",
                          s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        )} />
                      </button>
                    ))}
                  </div>
                  {/* Resolved question */}
                  <div className="w-full">
                    <p className="text-xs text-gray-500 mb-1.5 text-center">Was your issue resolved?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolved("yes")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          resolved === "yes"
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        )}
                      >
                        ✔ Yes
                      </button>
                      <button
                        onClick={() => setResolved("no")}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          resolved === "no"
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        )}
                      >
                        ✖ No
                      </button>
                    </div>
                  </div>
                  {/* Low-rating free comment */}
                  {rating > 0 && rating <= 3 && (
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">What could we improve?</p>
                      <textarea
                        value={freeComment}
                        onChange={(e) => setFreeComment(e.target.value)}
                        placeholder="Tell us what went wrong..."
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-black/20"
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleSurveySubmit}
                    disabled={rating === 0 || submitSurvey.isPending}
                    className="w-full bg-black text-white hover:bg-gray-800 text-sm"
                  >
                    Submit
                  </Button>
                </>
              ) : (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-sm text-gray-600 text-center">
                    Thank you for your feedback!
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => {
          if (widgetState === "closed") {
            setWidgetState("start");
          } else {
            setWidgetState("closed");
          }
        }}
        className="w-14 h-14 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative"
      >
        {widgetState === "closed" ? (
          <MessageCircle className="w-6 h-6" />
        ) : (
          <X className="w-6 h-6" />
        )}
        {unreadCount > 0 && widgetState === "closed" && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
