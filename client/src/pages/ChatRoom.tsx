import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  User,
  Bot,
  Headphones,
  AlertCircle,
  CheckCircle,
  X,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id?: number;
  sessionId: number;
  role: "visitor" | "operator" | "ai";
  content: string;
  fileUrl?: string | null;
  operatorName?: string;
  createdAt: Date | string;
}

function getVisitorId(): string {
  return localStorage.getItem("yah_visitor_id") ?? "";
}

function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
        <Headphones className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function SurveyModal({
  sessionId,
  visitorId,
  onClose,
}: {
  sessionId: number;
  visitorId: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [resolved, setResolved] = useState<"yes" | "no" | null>(null);
  const [comment, setComment] = useState("");
  const [freeComment, setFreeComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitSurvey = trpc.chat.submitSurvey.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Thank you!</h3>
          <p className="text-sm text-gray-500 mb-4">Your feedback has been received</p>
          <Button onClick={onClose} className="w-full bg-black text-white hover:bg-gray-800">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">How was your experience?</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)}>
              <Star
                className={cn(
                  "w-8 h-8 transition-colors",
                  s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                )}
              />
            </button>
          ))}
        </div>
        {/* Resolved question */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Was your issue resolved?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setResolved("yes")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
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
                "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                resolved === "no"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
              )}
            >
              ✖ No
            </button>
          </div>
        </div>
        {/* Free comment: shown only for rating <= 3 */}
        {rating > 0 && rating <= 3 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">What could we improve?</p>
            <Textarea
              value={freeComment}
              onChange={(e) => setFreeComment(e.target.value)}
              placeholder="Tell us what went wrong or how we can do better."
              rows={3}
              className="resize-none border-gray-200"
            />
          </div>
        )}
        {/* Optional general comment */}
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Additional comments (optional)"
          rows={2}
          className="mb-4 resize-none border-gray-200"
        />
        <Button
          onClick={() =>
            submitSurvey.mutate({
              sessionId,
              visitorId,
              rating,
              resolved: resolved ?? undefined,
              comment: comment || undefined,
              freeComment: freeComment || undefined,
            })
          }
          disabled={rating === 0 || submitSurvey.isPending}
          className="w-full bg-black text-white hover:bg-gray-800"
        >
          Submit
        </Button>
      </div>
    </div>
  );
}

export default function ChatRoom() {
  const { sessionId: sessionIdStr } = useParams<{ sessionId: string }>();
  const sessionId = parseInt(sessionIdStr ?? "", 10);
  const isValidSession = !isNaN(sessionId) && sessionId > 0;
  const [, navigate] = useLocation();

  const visitorId = getVisitorId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingInfo, setTypingInfo] = useState<{ role: string; name?: string } | null>(null);
  const [shouldEscalate, setShouldEscalate] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [operatorJoined, setOperatorJoined] = useState(false);
  const [fileInputRef] = useState(() => ({ current: null as HTMLInputElement | null }));

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing messages
  const { data: existingMessages } = trpc.chat.getMessages.useQuery(
    { sessionId },
    { enabled: isValidSession }
  );
  const { data: session } = trpc.chat.getSession.useQuery(
    { sessionId },
    { enabled: isValidSession }
  );

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data.shouldEscalate) setShouldEscalate(true);
    },
  });

  const endSession = trpc.chat.endSession.useMutation({
    onSuccess: () => {
      setSessionEnded(true);
      setShowSurvey(true);
    },
  });

  const requestEscalation = trpc.chat.requestEscalation.useMutation({
    onSuccess: () => setShouldEscalate(false),
  });

  const uploadFile = trpc.upload.uploadFile.useMutation();

  // Initialize socket
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/api/socket.io",
    });
    socketRef.current = socket;

    socket.emit("join_session", sessionId);

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("typing", (data: { role: string; name?: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingInfo({ role: data.role, name: data.name });
      } else {
        setTypingInfo(null);
      }
    });

    socket.on("escalation_suggested", () => setShouldEscalate(true));

    socket.on("operator_joined", (data: { operatorName?: string }) => {
      setOperatorJoined(true);
      setShouldEscalate(false);
      setMessages((prev) => [
        ...prev,
        {
          sessionId,
          role: "ai",
          content: `${data.operatorName ?? "Operator"} has joined. We'll continue to assist you.`,
          createdAt: new Date(),
        },
      ]);
    });

    socket.on("session_ended", () => {
      setSessionEnded(true);
      setShowSurvey(true);
    });

    return () => {
      socket.emit("leave_session", sessionId);
      socket.disconnect();
    };
  }, [sessionId]);

  // Load initial messages
  useEffect(() => {
    if (existingMessages) {
      setMessages(existingMessages as ChatMessage[]);
    }
  }, [existingMessages]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || sendMessage.isPending) return;

    setInput("");

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      {
        sessionId,
        role: "visitor",
        content,
        createdAt: new Date(),
      },
    ]);

    sendMessage.mutate({ sessionId, visitorId, content });
  }, [input, sessionId, visitorId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Typing indicator
    if (socketRef.current) {
      socketRef.current.emit("visitor_typing", { sessionId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("visitor_typing", { sessionId, isTyping: false });
      }, 1500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(",")[1] ?? "";
      const result = await uploadFile.mutateAsync({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        sessionId,
      });
      sendMessage.mutate({
        sessionId,
        visitorId,
          content: `[File: ${file.name}]`,
        fileUrl: result.url,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleEndSession = () => {
    endSession.mutate({ sessionId, visitorId });
  };

  const getMessageIcon = (role: string) => {
    if (role === "visitor") return null;
    if (role === "ai") return <Bot className="w-3.5 h-3.5 text-gray-500" />;
    return <Headphones className="w-3.5 h-3.5 text-white" />;
  };

  // Guard: invalid sessionId
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">Session not found</p>
          <Button onClick={() => navigate("/chat")}>Start a chat</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
            <Headphones className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">yah.mobile Support</p>
            <p className="text-xs text-gray-400">
              {session?.status === "active" ? "Operator connected" : "AI Support"}
            </p>
          </div>
        </div>
        {!sessionEnded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndSession}
            className="text-gray-400 hover:text-red-500 text-xs"
          >
            End
          </Button>
        )}
      </div>

      {/* Escalation Banner */}
      {shouldEscalate && !operatorJoined && !sessionEnded && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Need to connect with an operator?
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => requestEscalation.mutate({ sessionId, visitorId })}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1 h-auto"
          >
            Connect to operator
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((msg, i) => {
            const isVisitor = msg.role === "visitor";
            const isAI = msg.role === "ai";
            const isOperator = msg.role === "operator";

            return (
              <div
                key={msg.id ?? i}
                className={cn(
                  "flex items-end gap-2 mb-3",
                  isVisitor ? "flex-row-reverse" : "flex-row"
                )}
              >
                {!isVisitor && (
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                      isOperator ? "bg-black" : "bg-gray-200"
                    )}
                  >
                    {getMessageIcon(msg.role)}
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    isVisitor
                      ? "bg-black text-white rounded-br-sm"
                      : isOperator
                      ? "bg-gray-900 text-white rounded-bl-sm"
                      : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
                  )}
                >
                  {isOperator && msg.operatorName && (
                    <p className="text-xs text-gray-400 mb-1">{msg.operatorName}</p>
                  )}
                  {msg.fileUrl ? (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-300"
                    >
                      {msg.content}
                    </a>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                  <p
                    className={cn(
                      "text-xs mt-1",
                      isVisitor ? "text-gray-400" : "text-gray-400"
                    )}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {typingInfo && <TypingIndicator name={typingInfo.name} />}

          {sessionEnded && (
            <div className="text-center py-4">
              <Badge variant="secondary" className="text-xs">
                Chat ended
              </Badge>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      {!sessionEnded && (
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          {/* Connect to operator button - always visible when no operator yet */}
          {!operatorJoined && (
            <div className="max-w-2xl mx-auto mb-2">
              <button
                onClick={() => requestEscalation.mutate({ sessionId, visitorId })}
                disabled={requestEscalation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-black hover:text-black transition-colors duration-150 disabled:opacity-50"
              >
                <Headphones className="w-3.5 h-3.5" />
                オペレーターに繋ぐ
              </button>
            </div>
          )}
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <input
              ref={(el) => { fileInputRef.current = el; }}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none border-gray-200 focus:border-black focus:ring-black min-h-[40px] max-h-[120px] py-2.5 text-sm"
              style={{ height: "auto" }}
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

      {/* Survey Modal */}
      {showSurvey && (
        <SurveyModal
          sessionId={sessionId}
          visitorId={visitorId}
          onClose={() => {
            setShowSurvey(false);
            navigate("/chat");
          }}
        />
      )}
    </div>
  );
}
