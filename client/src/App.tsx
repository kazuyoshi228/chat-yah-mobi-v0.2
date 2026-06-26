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
import AdminChatReply from "@/pages/admin/AdminChatReply";
import AIChatbot from "@/pages/admin/AIChatbot";
import UserManuals from "@/pages/admin/UserManuals";
import AdminTesting from "@/pages/admin/AdminTesting";
import NotFound from "@/pages/NotFound";
import WidgetChat from "@/pages/WidgetChat";
import Portal from "@/pages/Portal";
import RootRedirect from "@/pages/RootRedirect";
import WidgetAuthSuccess from "@/pages/WidgetAuthSuccess";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Switch>
        {/* Root */}
        <Route path="/" component={RootRedirect} />

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
        <Route path="/admin/ai-chatbot" component={AIChatbot} />
        <Route path="/admin/user-manuals" component={UserManuals} />
        <Route path="/admin/testing" component={AdminTesting} />
        {/* Embeddable widget */}
        <Route path="/widget-chat" component={WidgetChat} />
        <Route path="/widget-auth-success" component={WidgetAuthSuccess} />

        <Route component={NotFound} />
      </Switch>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
