/**
 * App.tsx — ルーティング定義
 * DashboardLayout が認証ガードを担当
 */
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Visitor pages
import NotFound from "@/pages/NotFound";
import WidgetChat from "@/pages/WidgetChat";
import RootRedirect from "@/pages/RootRedirect";
import WidgetAuthSuccess from "@/pages/WidgetAuthSuccess";
import CheckIn from "@/pages/CheckIn";

// Admin pages（中核のみ・Firebase版）
import BigKPIs from "@/pages/admin/BigKPIsFirebase";
import AdminRag from "@/pages/admin/AdminRagFirebase";
import AdminChatList from "@/pages/admin/AdminChatListFirebase";
import AdminFlowTree from "@/pages/admin/AdminFlowTreeFirebase";
import AdminQuickReplies from "@/pages/admin/AdminQuickRepliesFirebase";
import AdminFeedback from "@/pages/admin/AdminFeedbackFirebase";
import Hospitality from "@/pages/admin/HospitalityFirebase";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Switch>
        {/* Root */}
        <Route path="/" component={RootRedirect} />
        <Route path="/checkin" component={CheckIn} />

        {/* Embeddable widget (認証不要) */}
        <Route path="/widget-chat" component={WidgetChat} />
        <Route path="/widget-auth-success" component={WidgetAuthSuccess} />

        {/* Admin portal（中核のみ・DashboardLayout内で認証チェック） */}
        <Route path="/admin" component={BigKPIs} />
        <Route path="/admin/dashboard" component={BigKPIs} />
        <Route path="/admin/chats" component={AdminChatList} />
        <Route path="/admin/rag" component={AdminRag} />
        <Route path="/admin/quick-replies" component={AdminQuickReplies} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/admin/flow-tree" component={AdminFlowTree} />
        <Route path="/admin/hospitality" component={Hospitality} />

        <Route component={NotFound} />
      </Switch>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
