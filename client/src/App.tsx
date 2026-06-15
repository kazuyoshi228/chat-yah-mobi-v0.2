import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/Home";
import ChatStart from "@/pages/ChatStart";
import ChatRoom from "@/pages/ChatRoom";
import OperatorChats from "@/pages/operator/OperatorChats";
import OperatorChatDetail from "@/pages/operator/OperatorChatDetail";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOperators from "@/pages/admin/AdminOperators";
import AdminQuickReplies from "@/pages/admin/AdminQuickReplies";
import AdminRag from "@/pages/admin/AdminRag";
import NotFound from "@/pages/NotFound";
import WidgetChat from "@/pages/WidgetChat";
import Portal from "@/pages/Portal";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/chat" component={ChatStart} />
        <Route path="/chat/:sessionId" component={ChatRoom} />
        <Route path="/operator/chats" component={OperatorChats} />
        <Route path="/operator/chats/:id" component={OperatorChatDetail} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/operators" component={AdminOperators} />
        <Route path="/admin/quick-replies" component={AdminQuickReplies} />
        <Route path="/admin/rag" component={AdminRag} />
        <Route path="/portal" component={Portal} />
        <Route path="/widget-chat" component={WidgetChat} />
        <Route component={NotFound} />
      </Switch>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
