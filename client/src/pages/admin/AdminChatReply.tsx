import { useParams } from "wouter";
import ChatDetailBase from "@/components/ChatDetailBase";

export default function AdminChatReply() {
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  return (
    <ChatDetailBase
      sessionId={sessionId}
      mode="admin"
      backPath="/admin/chats"
    />
  );
}
