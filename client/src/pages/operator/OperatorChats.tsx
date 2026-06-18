import { MessageCircle, Zap } from "lucide-react";
import ChatListBase from "@/components/ChatListBase";

const sidebarItems = [
  { title: "Chat List", href: "/ops/chats", icon: MessageCircle },
  { title: "Quick Replies", href: "/ops/quick-replies", icon: Zap },
];

export default function OperatorChats() {
  return <ChatListBase mode="operator" sidebarItems={sidebarItems} />;
}
