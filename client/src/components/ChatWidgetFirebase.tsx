/**
 * ChatWidgetFirebase - Firebase版 埋め込みチャットウィジェット
 * Socket.io + tRPC → Firestore onSnapshot + Firebase SDK直接操作
 * UIデザイン・レイアウト・スタイリングは既存ChatWidget.tsxと完全同一
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Headphones,
  Loader2,
  Star,
  CheckCircle,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, functions } from "@/lib/firebase";

// カスタムフック
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatMessages } from "@/hooks/useChatMessages";

// ── 型定義 ──

interface FlowNode {
  id: string;
  parentId: string | null;
  type: string; // "question" | "answer" | "redirect_form" | "redirect_ai"
  label: string; // JSON string {ja,en,ko,zh,th,vi}
  content: string | null; // JSON string
  options: string | null; // JSON array of child IDs
  icon: string | null;
  formTrigger: number;
  aiTrigger: number;
  sortOrder: number;
}

// ── ヘルパー関数 ──

/** 多言語JSONを解析して指定言語のテキストを返す */
function parseI18n(json: string | null, lang: string): string {
  if (!json) return "";
  try {
    const obj = JSON.parse(json);
    return obj[lang] || obj["en"] || Object.values(obj)[0] || "";
  } catch {
    return json;
  }
}

type WidgetState = "closed" | "flow" | "chat" | "ended";

// ── メインコンポーネント ──

export default function ChatWidgetFirebase() {
  const { t, lang: language } = useLanguage();

  // Firebase認証（匿名認証自動サインイン）
  const { user, loading: authLoading } = useFirebaseAuth();

  // チャットセッション管理
  const {
    sessionId,
    creating: sessionCreating,
    createSession,
    endSession,
  } = useChatSession();

  // リアルタイムメッセージ同期
  const {
    messages,
    typingIndicator: typingInfo,
    sendMessage: sendFirebaseMessage,
  } = useChatMessages(sessionId);

  // ── ウィジェット状態 ──
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [input, setInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // サーベイ状態
  const [rating, setRating] = useState(0);
  const [resolved, setResolved] = useState<"yes" | "no" | null>(null);
  const [freeComment, setFreeComment] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  // デシジョンツリー状態
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string>("root");
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [showFormPrompt, setShowFormPrompt] = useState(false);
  const [formPromptContent, setFormPromptContent] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // QR再送状態
  const [showQrResend, setShowQrResend] = useState(false);
  const [qrEmail, setQrEmail] = useState("");
  type QrResendStatus = "idle" | "sent" | "not_found" | "no_qr" | "error";
  const [qrResendStatus, setQrResendStatus] = useState<QrResendStatus>("idle");
  const [qrResendOrderId, setQrResendOrderId] = useState<string | undefined>();
  const [qrResendPending, setQrResendPending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Firestoreからフローノードを取得 ──
  useEffect(() => {
    const fetchFlowNodes = async () => {
      try {
        const nodesRef = collection(db, "chat_flow_nodes");
        const snapshot = await getDocs(nodesRef);
        const nodes: FlowNode[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FlowNode[];
        setFlowNodes(nodes);
      } catch (error) {
        console.error("[ChatWidgetFirebase] フローノード取得エラー:", error);
      }
    };
    fetchFlowNodes();
  }, []);

  // ── 未読数リセット ──
  useEffect(() => {
    if (widgetState === "chat") setUnreadCount(0);
  }, [widgetState]);

  // ── 受信メッセージの未読カウント ──
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current && widgetState !== "chat") {
      const newMsgs = messages.slice(prevMsgCountRef.current);
      const incomingCount = newMsgs.filter((m) => m.role !== "visitor").length;
      if (incomingCount > 0) {
        setUnreadCount((c) => c + incomingCount);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, widgetState]);

  // ── 自動スクロール ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingInfo]);

  // ── デシジョンツリー ヘルパー ──
  const currentNode = flowNodes.find((n) => n.id === currentNodeId);
  const childIds: string[] = currentNode?.options
    ? JSON.parse(currentNode.options)
    : [];
  const childNodes = childIds
    .map((id) => flowNodes.find((n) => n.id === id))
    .filter(Boolean) as FlowNode[];

  const navigateTo = (nodeId: string) => {
    setBreadcrumb((prev) => [...prev, currentNodeId]);
    setCurrentNodeId(nodeId);
  };

  const navigateBack = () => {
    if (breadcrumb.length === 0) return;
    const prev = [...breadcrumb];
    const last = prev.pop()!;
    setBreadcrumb(prev);
    setCurrentNodeId(last);
    setShowFormPrompt(false);
    setShowQrResend(false);
    setQrEmail("");
    setQrResendStatus("idle");
    setQrResendOrderId(undefined);
  };

  // ── AIチャットセッション開始 ──
  const handleStartAiChat = useCallback(
    async (greeting: string) => {
      if (!user || sessionCreating) return;
      try {
        await createSession({
          visitorId: user.uid,
          language,
          initialMessage: greeting || "Hello",
        });
        setWidgetState("chat");
      } catch (error) {
        console.error("[ChatWidgetFirebase] セッション作成エラー:", error);
      }
    },
    [user, sessionCreating, createSession, language]
  );

  // ── ノード選択ハンドラ ──
  const handleNodeSelect = (node: FlowNode) => {
    // QR再送トリガー: ラベルに 'qr_resend' キーワードが含まれる場合
    if (node.label && node.label.includes('"qr_resend"')) {
      setBreadcrumb((prev) => [...prev, currentNodeId]);
      setCurrentNodeId(node.id);
      setShowQrResend(true);
      return;
    }
    if (node.formTrigger) {
      const content = parseI18n(node.content, language);
      setFormPromptContent(content);
      setBreadcrumb((prev) => [...prev, currentNodeId]);
      setCurrentNodeId(node.id);
      setShowFormPrompt(true);
      return;
    }
    if (node.aiTrigger) {
      // AIチャットを起動
      const greeting = parseI18n(node.content, language);
      handleStartAiChat(greeting);
      return;
    }
    navigateTo(node.id);
  };

  // ── メッセージ送信 ──
  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !sessionId) return;
    setInput("");
    try {
      await sendFirebaseMessage(content);
    } catch (error) {
      console.error("[ChatWidgetFirebase] メッセージ送信エラー:", error);
    }
  }, [input, sessionId, sendFirebaseMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── セッション終了 ──
  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await endSession();
      setWidgetState("ended");
    } catch (error) {
      console.error("[ChatWidgetFirebase] セッション終了エラー:", error);
    }
  };

  // ── サーベイ送信（Firestoreに直接書き込み） ──
  const handleSurveySubmit = async () => {
    if (!sessionId || rating === 0 || !user) return;
    setSurveySubmitting(true);
    try {
      const surveyRef = doc(db, "chat_surveys", sessionId);
      await setDoc(surveyRef, {
        sessionId,
        visitorId: user.uid,
        rating,
        resolved: resolved ?? null,
        freeComment: freeComment || null,
        createdAt: serverTimestamp(),
      });
      setSurveySubmitted(true);
    } catch (error) {
      console.error("[ChatWidgetFirebase] サーベイ送信エラー:", error);
    } finally {
      setSurveySubmitting(false);
    }
  };

  // ── フォーム送信（Firestoreに直接書き込み） ──
  const handleFormSubmit = async () => {
    if (!formEmail.trim() || !formMessage.trim() || !user) return;
    try {
      const contactRef = collection(db, "contactForms");
      const { addDoc: addDocFn } = await import("firebase/firestore");
      await addDocFn(contactRef, {
        visitorId: user.uid,
        email: formEmail,
        message: formMessage,
        language,
        createdAt: serverTimestamp(),
      });
      setFormSubmitted(true);
    } catch (error) {
      console.error("[ChatWidgetFirebase] フォーム送信エラー:", error);
      setFormSubmitted(true); // エラーでもUIは完了表示にする
    }
  };

  // ── QR再送（Cloud Functions呼び出し） ──
  const handleQrResend = async () => {
    if (!qrEmail.trim()) return;
    setQrResendPending(true);
    try {
      const checkQrResendFn = httpsCallable<
        { email: string; language: string },
        { status: QrResendStatus; orderId?: string }
      >(functions, "checkQrResend");
      const result = await checkQrResendFn({
        email: qrEmail.trim(),
        language,
      });
      setQrResendStatus(result.data.status);
      if (result.data.orderId) {
        setQrResendOrderId(result.data.orderId);
      }
    } catch {
      setQrResendStatus("error");
    } finally {
      setQrResendPending(false);
    }
  };

  // ── ウィジェット開閉 ──
  const openWidget = () => {
    setWidgetState("flow");
    setCurrentNodeId("root");
    setBreadcrumb([]);
    setShowFormPrompt(false);
    setFormSubmitted(false);
    setFormEmail("");
    setFormMessage("");
    setShowQrResend(false);
    setQrEmail("");
    setQrResendStatus("idle");
    setQrResendOrderId(undefined);
  };

  const closeWidget = () => setWidgetState("closed");

  // ── i18n UIラベル ──
  const uiLabels: Record<string, Record<string, string>> = {
    back: {
      ja: "戻る",
      en: "Back",
      ko: "뒤로",
      zh: "返回",
      th: "กลับ",
      vi: "Quay lại",
    },
    form_email: {
      ja: "メールアドレス",
      en: "Email",
      ko: "이메일",
      zh: "邮箱",
      th: "อีเมล",
      vi: "Email",
    },
    form_message: {
      ja: "お問い合わせ内容",
      en: "Message",
      ko: "문의 내용",
      zh: "问题描述",
      th: "ข้อความ",
      vi: "Nội dung",
    },
    form_submit: {
      ja: "送信する",
      en: "Submit",
      ko: "제출",
      zh: "提交",
      th: "ส่ง",
      vi: "Gửi",
    },
    form_thanks: {
      ja: "お問い合わせありがとうございます。3営業日以内にご連絡いたします。",
      en: "Thank you! We'll contact you within 3 business days.",
      ko: "감사합니다! 3영업일 이내에 연락드리겠습니다.",
      zh: "感谢您！我们将在3个工作日内与您联系。",
      th: "ขอบคุณ! เราจะติดต่อคุณภายใน 3 วันทำการ",
      vi: "Cảm ơn! Chúng tôi sẽ liên hệ trong vòng 3 ngày làm việc.",
    },
    ai_chat: {
      ja: "AIサポートに質問する",
      en: "Ask AI Support",
      ko: "AI 지원에 질문하기",
      zh: "向AI支持提问",
      th: "ถาม AI Support",
      vi: "Hỏi AI Support",
    },
  };
  const ui = (key: string) =>
    uiLabels[key]?.[language] || uiLabels[key]?.["en"] || key;

  // 認証ロード中は何も表示しない
  if (authLoading) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* チャットウィンドウ */}
      {widgetState !== "closed" && (
        <div
          className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* ヘッダー */}
          <div className="bg-black px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {breadcrumb.length > 0 && widgetState === "flow" && (
                <button
                  onClick={navigateBack}
                  className="p-1 text-white/60 hover:text-white transition-colors mr-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  yah.mobile Support
                </p>
                <p className="text-xs text-white/60">
                  {widgetState === "chat" ? "AI + Operator" : "Support"}
                </p>
              </div>
            </div>
            <button
              onClick={closeWidget}
              className="p-1.5 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── デシジョンツリーフロー ── */}
          {widgetState === "flow" && !showFormPrompt && !showQrResend && (
            <ScrollArea className="flex-1">
              <div className="p-4 flex flex-col gap-3">
                {currentNode && (
                  <>
                    {/* ボットメッセージバブル */}
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-gray-800 leading-relaxed max-w-[85%]">
                        <p className="whitespace-pre-wrap">
                          {parseI18n(currentNode.label, language)}
                        </p>
                        {/* 回答ノードの場合はコンテンツを表示 */}
                        {currentNode.type === "answer" &&
                          currentNode.content && (
                            <p className="mt-2 whitespace-pre-wrap text-gray-700">
                              {parseI18n(currentNode.content, language)}
                            </p>
                          )}
                      </div>
                    </div>

                    {/* 選択肢ボタン */}
                    {childNodes.length > 0 && (
                      <div className="flex flex-col gap-2 mt-1">
                        {childNodes.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => handleNodeSelect(child)}
                            disabled={sessionCreating}
                            className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-700 hover:border-black hover:bg-gray-50 transition-all active:scale-[0.98] leading-snug"
                          >
                            {parseI18n(child.label, language)}
                          </button>
                        ))}

                        {/* AI フォールバックオプション */}
                        <button
                          onClick={() => {
                            const greeting = parseI18n(
                              currentNode.label,
                              language
                            );
                            handleStartAiChat(greeting);
                          }}
                          disabled={sessionCreating}
                          className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-all flex items-center gap-2"
                        >
                          {sessionCreating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Bot className="w-3 h-3" />
                          )}
                          {ui("ai_chat")}
                        </button>
                      </div>
                    )}

                    {/* リーフノード（子なし）: AI フォールバック表示 */}
                    {childNodes.length === 0 &&
                      currentNode.type !== "redirect_form" && (
                        <div className="flex flex-col gap-2 mt-1">
                          <button
                            onClick={() => {
                              const greeting = parseI18n(
                                currentNode.label,
                                language
                              );
                              handleStartAiChat(greeting);
                            }}
                            disabled={sessionCreating}
                            className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-all flex items-center gap-2"
                          >
                            {sessionCreating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Bot className="w-3 h-3" />
                            )}
                            {ui("ai_chat")}
                          </button>
                        </div>
                      )}
                  </>
                )}

                {/* ローディング状態 */}
                {!currentNode && flowNodes.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* ── フォームプロンプト ── */}
          {widgetState === "flow" && showFormPrompt && (
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
              {!formSubmitted ? (
                <>
                  {/* ボットメッセージ */}
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-gray-800 leading-relaxed max-w-[85%]">
                      <p className="whitespace-pre-wrap">
                        {formPromptContent}
                      </p>
                    </div>
                  </div>

                  {/* フォームフィールド */}
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder={ui("form_email")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                  <Textarea
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder={ui("form_message")}
                    rows={4}
                    className="resize-none border-gray-200 focus:border-black focus:ring-black text-xs"
                  />
                  <Button
                    onClick={handleFormSubmit}
                    disabled={!formEmail.trim() || !formMessage.trim()}
                    className="w-full bg-black hover:bg-gray-800 text-white text-xs"
                  >
                    {ui("form_submit")}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-sm text-gray-600 text-center">
                    {ui("form_thanks")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── QR再送 ── */}
          {widgetState === "flow" && showQrResend && (
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
              {/* ボットメッセージ */}
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-gray-800 leading-relaxed max-w-[85%]">
                  <p className="whitespace-pre-wrap">
                    {
                      {
                        ja: "ご購入時のメールアドレスを入力してください。QRコードを再送します。",
                        en: "Please enter the email address used for your purchase. We will resend your QR code.",
                        zh: "请输入购买时使用的邮箱地址，我们将重新发送二维码。",
                        ko: "구매 시 사용한 이메일 주소를 입력해 주세요. QR 코드를 재발송합니다.",
                        th: "กรุณากรอกอีเมลที่ใช้ในการซื้อ เราจะส่ง QR Code ให้คุณอีกครั้ง",
                        vi: "Vui lòng nhập email đã dùng khi mua hàng. Chúng tôi sẽ gửi lại mã QR.",
                      }[language] ??
                      "Please enter the email address used for your purchase. We will resend your QR code."
                    }
                  </p>
                </div>
              </div>

              {qrResendStatus === "idle" && (
                <>
                  <input
                    type="email"
                    value={qrEmail}
                    onChange={(e) => setQrEmail(e.target.value)}
                    placeholder={ui("form_email")}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-black"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && qrEmail.trim()) {
                        handleQrResend();
                      }
                    }}
                  />
                  <Button
                    onClick={handleQrResend}
                    disabled={!qrEmail.trim() || qrResendPending}
                    className="w-full bg-black hover:bg-gray-800 text-white text-xs"
                  >
                    {qrResendPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    {
                      {
                        ja: "QRコードを再送する",
                        en: "Resend QR Code",
                        zh: "重新发送二维码",
                        ko: "QR 코드 재발송",
                        th: "ส่ง QR Code อีกครั้ง",
                        vi: "Gửi lại mã QR",
                      }[language] ?? "Resend QR Code"
                    }
                  </Button>
                </>
              )}

              {qrResendStatus === "sent" && (
                <div className="flex flex-col items-center justify-center gap-3 py-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-xs text-gray-700 text-center">
                    {
                      {
                        ja: `QRコードを ${qrEmail} に再送しました。メールをご確認ください。\n（迷惑メールフォルダもご確認ください）`,
                        en: `QR code has been resent to ${qrEmail}. Please check your email.\n(Also check your spam folder)`,
                        zh: `二维码已重新发送至 ${qrEmail}。请查收邮件。\n（请同时检查垃圾邮件文件夹）`,
                        ko: `QR 코드가 ${qrEmail}로 재발송되었습니다. 이메일을 확인해 주세요.\n(스팸 폴더도 확인해 주세요)`,
                        th: `ส่ง QR Code ไปยัง ${qrEmail} แล้ว กรุณาตรวจสอบอีเมล\n(ตรวจสอบโฟลเดอร์สแปมด้วย)`,
                        vi: `Đã gửi lại mã QR đến ${qrEmail}. Vui lòng kiểm tra email.\n(Kiểm tra cả thư mục spam)`,
                      }[language] ??
                      `QR code has been resent to ${qrEmail}. Please check your email.`
                    }
                  </p>
                  {qrResendOrderId && (
                    <p className="text-xs text-gray-400">
                      Order: {qrResendOrderId}
                    </p>
                  )}
                </div>
              )}

              {qrResendStatus === "not_found" && (
                <div className="flex flex-col gap-3 py-2">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {
                      {
                        ja: `${qrEmail} での購入記録が見つかりませんでした。\nご購入時のメールアドレスをご確認ください。`,
                        en: `No purchase record found for ${qrEmail}.\nPlease check the email address used for your purchase.`,
                        zh: `未找到 ${qrEmail} 的购买记录。\n请确认购买时使用的邮箱地址。`,
                        ko: `${qrEmail}에 대한 구매 기록을 찾을 수 없습니다.\n구매 시 사용한 이메일 주소를 확인해 주세요.`,
                        th: `ไม่พบประวัติการซื้อสำหรับ ${qrEmail}\nกรุณาตรวจสอบอีเมลที่ใช้ในการซื้อ`,
                        vi: `Không tìm thấy lịch sử mua hàng cho ${qrEmail}.\nVui lòng kiểm tra email đã dùng khi mua hàng.`,
                      }[language] ??
                      `No purchase record found for ${qrEmail}.`
                    }
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQrResendStatus("idle");
                      setQrEmail("");
                    }}
                    className="w-full text-xs"
                  >
                    {
                      {
                        ja: "別のアドレスで試す",
                        en: "Try another email",
                        zh: "尝试其他邮箱",
                        ko: "다른 이메일로 시도",
                        th: "ลองอีเมลอื่น",
                        vi: "Thử email khác",
                      }[language] ?? "Try another email"
                    }
                  </Button>
                </div>
              )}

              {qrResendStatus === "no_qr" && (
                <div className="flex flex-col gap-3 py-2">
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    {
                      {
                        ja: "購入記録は確認できましたが、QRコードのURLがまだ準備中です。\nしばらくお待ちいただくか、チャットサポートにお問い合わせください。",
                        en: "Purchase found, but QR code is not yet available.\nPlease wait a moment or contact chat support.",
                        zh: "找到购买记录，但二维码尚未准备好。\n请稍等片刻或联系聊天支持。",
                        ko: "구매 기록은 확인되었지만 QR 코드가 아직 준비되지 않았습니다.\n잠시 기다리시거나 채팅 지원에 문의해 주세요.",
                        th: "พบประวัติการซื้อแล้ว แต่ QR Code ยังไม่พร้อม\nกรุณารอสักครู่หรือติดต่อฝ่ายสนับสนุนทางแชท",
                        vi: "Đã tìm thấy lịch sử mua hàng nhưng mã QR chưa sẵn sàng.\nVui lòng đợi một chút hoặc liên hệ hỗ trợ qua chat.",
                      }[language] ??
                      "Purchase found, but QR code is not yet available."
                    }
                  </p>
                  <Button
                    onClick={() => {
                      handleStartAiChat(
                        "QRコードが届いていません。サポートをお願いします。"
                      );
                    }}
                    className="w-full bg-black hover:bg-gray-800 text-white text-xs"
                  >
                    <Bot className="w-3 h-3 mr-1" />
                    {
                      {
                        ja: "チャットサポートに相談する",
                        en: "Contact Chat Support",
                        zh: "联系聊天支持",
                        ko: "채팅 지원에 문의",
                        th: "ติดต่อฝ่ายสนับสนุนทางแชท",
                        vi: "Liên hệ hỗ trợ qua chat",
                      }[language] ?? "Contact Chat Support"
                    }
                  </Button>
                </div>
              )}

              {qrResendStatus === "error" && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {
                    {
                      ja: "送信中にエラーが発生しました。しばらくしてから再度お試しください。",
                      en: "An error occurred. Please try again later.",
                      zh: "发生错误，请稍后再试。",
                      ko: "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
                      th: "เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง",
                      vi: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
                    }[language] ?? "An error occurred. Please try again later."
                  }
                </p>
              )}
            </div>
          )}

          {/* ── AIチャット ── */}
          {widgetState === "chat" && (
            <>
              <ScrollArea className="flex-1 px-3 py-3">
                <div className="space-y-2">
                  {messages.map((msg, i) => {
                    const isVisitor = msg.role === "visitor";
                    return (
                      <div
                        key={msg.id ?? i}
                        className={cn(
                          "flex items-end gap-2",
                          isVisitor ? "flex-row-reverse" : "flex-row"
                        )}
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
                        <div
                          className={cn(
                            "max-w-[80%] rounded-xl px-3 py-2 text-xs",
                            isVisitor
                              ? "bg-black text-white rounded-br-sm"
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

              {/* 入力エリア */}
              <div className="border-t border-gray-100 px-3 py-2 flex items-end gap-2 flex-shrink-0">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("widget_placeholder")}
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

              {/* セッション終了ボタン */}
              <div className="px-3 pb-2 flex-shrink-0">
                <button
                  onClick={handleEndSession}
                  className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
                >
                  {t("widget_ended")}
                </button>
              </div>
            </>
          )}

          {/* ── 終了 + サーベイ ── */}
          {widgetState === "ended" && (
            <div className="flex-1 p-4 flex flex-col items-center justify-center gap-3 overflow-y-auto">
              {!surveySubmitted ? (
                <>
                  <p className="text-sm font-medium text-gray-900 text-center">
                    {t("widget_survey_title")}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRating(s)}>
                        <Star
                          className={cn(
                            "w-7 h-7 transition-colors",
                            s <= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="w-full">
                    <p className="text-xs text-gray-500 mb-1.5 text-center">
                      {t("survey_resolved_question")}
                    </p>
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
                        ✔ {t("widget_survey_yes")}
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
                        ✖ {t("widget_survey_no")}
                      </button>
                    </div>
                  </div>
                  {rating > 0 && rating <= 3 && (
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">
                        {t("survey_improve")}
                      </p>
                      <textarea
                        value={freeComment}
                        onChange={(e) => setFreeComment(e.target.value)}
                        placeholder={t("survey_improve_placeholder")}
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-black/20"
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleSurveySubmit}
                    disabled={rating === 0 || surveySubmitting}
                    className="w-full bg-black text-white hover:bg-gray-800 text-sm"
                  >
                    {t("widget_survey_submit")}
                  </Button>
                </>
              ) : (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                  <p className="text-sm text-gray-600 text-center">
                    {t("widget_survey_thanks")}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* トグルボタン */}
      <button
        onClick={() => {
          if (widgetState === "closed") {
            openWidget();
          } else {
            closeWidget();
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
