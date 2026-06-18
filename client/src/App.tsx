import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ChatStart from "@/pages/ChatStart";
import ChatRoom from "@/pages/ChatRoom";
import OperatorChats from "@/pages/operator/OperatorChats";
import OperatorChatDetail from "@/pages/operator/OperatorChatDetail";
import OperatorQuickReplies from "@/pages/operator/OperatorQuickReplies";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOperators from "@/pages/admin/AdminOperators";
import AdminQuickReplies from "@/pages/admin/AdminQuickReplies";
import AdminRag from "@/pages/admin/AdminRag";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import AdminDataAnalysis from "@/pages/admin/AdminDataAnalysis";
import AdminChatList from "@/pages/admin/AdminChatList";
import AdminChatDetail from "@/pages/admin/AdminChatDetail";
import AdminChatReply from "@/pages/admin/AdminChatReply";
import NotFound from "@/pages/NotFound";
import WidgetChat from "@/pages/WidgetChat";
import Portal from "@/pages/Portal";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Switch>
        {/* Root */}
        <Route path="/">{() => { window.location.replace("/portal"); return null; }}</Route>

        {/* Auth */}
        <Route path="/portal" component={Portal} />

        {/* Visitor chat */}
        <Route path="/chat" component={ChatStart} />
        <Route path="/chat/:sessionId" component={ChatRoom} />

        {/* Operator portal */}
        <Route path="/ops/chats" component={OperatorChats} />
        <Route path="/ops/chats/:id" component={OperatorChatDetail} />
        <Route path="/ops/quick-replies" component={OperatorQuickReplies} />
        {/* Admin portal */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/operators" component={AdminOperators} />
        <Route path="/admin/quick-replies" component={AdminQuickReplies} />
        <Route path="/admin/rag" component={AdminRag} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/admin/data-analysis" component={AdminDataAnalysis} />
        <Route path="/admin/chats" component={AdminChatList} />
        <Route path="/admin/chats/:id/reply" component={AdminChatReply} />
        <Route path="/admin/chats/:id" component={AdminChatDetail} />
        {/* Embeddable widget */}
        <Route path="/widget-chat" component={WidgetChat} />

        <Route component={NotFound} />
      </Switch>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
