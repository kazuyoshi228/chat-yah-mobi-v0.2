/**
 * ChatWidgetFirebase - Firebase版 埋め込みチャットウィジェット（本体）
 *
 * ここは「状態と配線」のみ。各ビューは components/widget/ 配下:
 *   FlowView（3分岐ツリー） / ChatView（AIチャット） / QrGuide（QR案内） /
 *   LoginPanel（ログイン/新規登録） / SurveyView（終了アンケート） / labels（多言語辞書）
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle,
  X,
  Headphones,
  ChevronLeft,
  LogIn,
  LogOut,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { collection, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseI18n } from "@/lib/i18nJson";

// カスタムフック
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatMessages } from "@/hooks/useChatMessages";

// ウィジェットの各ビュー
import { FlowView } from "@/components/widget/FlowView";
import { ChatView } from "@/components/widget/ChatView";
import { QrGuide } from "@/components/widget/QrGuide";
import { LoginPanel } from "@/components/widget/LoginPanel";
import { SurveyView } from "@/components/widget/SurveyView";
import { CONTACT_FORM_URL, AUTH_LABELS, pick } from "@/components/widget/labels";
import type { FlowNode } from "@/components/widget/types";

type WidgetState = "closed" | "flow" | "chat" | "ended";

export default function ChatWidgetFirebase() {
  const { lang: language } = useLanguage();

  // Firebase認証（匿名自動サインイン＋お客様ログイン/新規登録）
  const {
    user,
    loading: authLoading,
    isAnonymous,
    signInWithGoogle,
    registerWithEmail,
    signInWithEmail,
    signOutUser,
  } = useFirebaseAuth();

  // チャットセッション管理
  const {
    sessionId,
    creating: sessionCreating,
    createSession,
    endSession,
  } = useChatSession();

  // ログイン/所有者付け替え後にメッセージ購読を張り直すためのキー
  const [authReloadKey, setAuthReloadKey] = useState(0);

  // リアルタイムメッセージ同期
  const {
    messages,
    typingIndicator,
    sendMessage,
  } = useChatMessages(sessionId, authReloadKey);

  // ── ウィジェット状態 ──
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

  // デシジョンツリー状態
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string>("root");
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  // QR案内状態（再取得は販売サイトのマイページで自己解決。chat は案内のみ）
  const [showQrGuide, setShowQrGuide] = useState(false);

  // ── Firestoreからフローノードを取得 ──
  useEffect(() => {
    const fetchFlowNodes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "chat_flow_nodes"));
        setFlowNodes(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FlowNode[]
        );
      } catch (error) {
        console.error("[ChatWidgetFirebase] フローノード取得エラー:", error);
      }
    };
    fetchFlowNodes();
  }, []);

  // ── 未読カウント（chat画面以外で受信した分） ──
  useEffect(() => {
    if (widgetState === "chat") setUnreadCount(0);
  }, [widgetState]);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current && widgetState !== "chat") {
      const newMsgs = messages.slice(prevMsgCountRef.current);
      const incomingCount = newMsgs.filter((m) => m.role !== "visitor").length;
      if (incomingCount > 0) setUnreadCount((c) => c + incomingCount);
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, widgetState]);

  // ── デシジョンツリー ヘルパー ──
  const currentNode = flowNodes.find((n) => n.id === currentNodeId);
  const childIds: string[] = currentNode?.options
    ? JSON.parse(currentNode.options)
    : [];
  const childNodes = childIds
    .map((id) => flowNodes.find((n) => n.id === id))
    .filter(Boolean) as FlowNode[];

  const navigateBack = () => {
    if (breadcrumb.length === 0) return;
    const prev = [...breadcrumb];
    const last = prev.pop()!;
    setBreadcrumb(prev);
    setCurrentNodeId(last);
    setShowQrGuide(false);
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

  // ── ノード選択（qr_resend / formTrigger / aiTrigger の遷移判定） ──
  const handleNodeSelect = (node: FlowNode) => {
    // QRトリガー: ラベルに 'qr_resend' キーワードが含まれる場合はマイページ案内を表示
    if (node.label && node.label.includes('"qr_resend"')) {
      setBreadcrumb((prev) => [...prev, currentNodeId]);
      setCurrentNodeId(node.id);
      setShowQrGuide(true);
      return;
    }
    if (node.formTrigger) {
      // 自前フォームは持たず、販売サイトの問い合わせフォームへ誘導（非履行・案内のみ）
      window.open(CONTACT_FORM_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (node.aiTrigger) {
      handleStartAiChat(parseI18n(node.content, language));
      return;
    }
    setBreadcrumb((prev) => [...prev, currentNodeId]);
    setCurrentNodeId(node.id);
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
  const handleSurveySubmit = async (survey: {
    rating: number;
    resolved: "yes" | "no" | null;
    freeComment: string;
  }) => {
    if (!sessionId || !user) return;
    await setDoc(doc(db, "chat_surveys", sessionId), {
      sessionId,
      visitorId: user.uid,
      rating: survey.rating,
      resolved: survey.resolved ?? null,
      freeComment: survey.freeComment || null,
      createdAt: serverTimestamp(),
    });
  };

  // ── ウィジェット開閉 ──
  const openWidget = () => {
    setWidgetState("flow");
    setCurrentNodeId("root");
    setBreadcrumb([]);
    setShowQrGuide(false);
  };
  const closeWidget = () => setWidgetState("closed");

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
            <div className="flex items-center gap-1">
              {isAnonymous ? (
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-xs text-white/80 hover:text-white px-2 py-1 rounded-md border border-white/25 transition-colors flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {pick(AUTH_LABELS.signin, language)}
                </button>
              ) : (
                <button
                  onClick={signOutUser}
                  title={user?.email ?? undefined}
                  className="text-xs text-white/70 hover:text-white px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {pick(AUTH_LABELS.signout, language)}
                </button>
              )}
              <button
                onClick={closeWidget}
                className="p-1.5 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── ログイン / 新規登録パネル ── */}
          {showLogin && (
            <LoginPanel
              sessionId={sessionId}
              signInWithGoogle={signInWithGoogle}
              registerWithEmail={registerWithEmail}
              signInWithEmail={signInWithEmail}
              onSuccess={() => {
                setShowLogin(false);
                // 付け替え後は権限が変わるのでメッセージ購読を張り直す
                setAuthReloadKey((k) => k + 1);
              }}
              onClose={() => setShowLogin(false)}
            />
          )}

          {/* ── デシジョンツリーフロー ── */}
          {widgetState === "flow" && !showQrGuide && !showLogin && (
            <FlowView
              currentNode={currentNode}
              childNodes={childNodes}
              hasNodes={flowNodes.length > 0}
              sessionCreating={sessionCreating}
              onSelectNode={handleNodeSelect}
              onStartAiChat={handleStartAiChat}
            />
          )}

          {/* ── QR案内 ── */}
          {widgetState === "flow" && showQrGuide && !showLogin && (
            <QrGuide
              onAskChat={() =>
                handleStartAiChat(
                  "QRコードがマイページで見つかりません。サポートをお願いします。"
                )
              }
            />
          )}

          {/* ── AIチャット ── */}
          {widgetState === "chat" && !showLogin && (
            <ChatView
              messages={messages}
              typing={typingIndicator}
              onSend={sendMessage}
              onEndSession={handleEndSession}
            />
          )}

          {/* ── 終了 + サーベイ ── */}
          {widgetState === "ended" && !showLogin && (
            <SurveyView onSubmit={handleSurveySubmit} />
          )}
        </div>
      )}

      {/* トグルボタン */}
      <button
        onClick={() => (widgetState === "closed" ? openWidget() : closeWidget())}
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
