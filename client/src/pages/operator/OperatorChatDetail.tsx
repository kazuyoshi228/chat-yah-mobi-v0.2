import { useParams } from "wouter";
import { MessageCircle, Zap } from "lucide-react";
import ChatDetailBase from "@/components/ChatDetailBase";

const sidebarItems = [
  { title: "Chat List", href: "/ops/chats", icon: MessageCircle },
  { title: "Quick Replies", href: "/ops/quick-replies", icon: Zap },
];

export default function OperatorChatDetail() {
  const { id: sessionIdStr } = useParams<{ id: string }>();
  const sessionId = parseInt(sessionIdStr ?? "", 10);

  return (
    <ChatDetailBase
      sessionId={sessionId}
      mode="operator"
      backPath="/ops/chats"
      sidebarItems={sidebarItems}
    />
  );
}
