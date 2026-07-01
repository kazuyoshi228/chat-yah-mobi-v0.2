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

// Admin pages (Firebase版)
import BigKPIs from "@/pages/admin/BigKPIsFirebase";
import AdminRag from "@/pages/admin/AdminRagFirebase";
import AdminChatList from "@/pages/admin/AdminChatListFirebase";
import Hospitality from "@/pages/admin/HospitalityFirebase";
import AdminFlowTree from "@/pages/admin/AdminFlowTreeFirebase";
import AdminQuickReplies from "@/pages/admin/AdminQuickRepliesFirebase";
import Customers from "@/pages/admin/CustomersFirebase";
import Pricing from "@/pages/admin/PricingFirebase";
import AdminFeedback from "@/pages/admin/AdminFeedbackFirebase";
import Refund from "@/pages/admin/RefundFirebase";
import SystemHealth from "@/pages/admin/SystemHealthFirebase";
import SSoT from "@/pages/admin/SSoT";
import AIChatbot from "@/pages/admin/AIChatbot";
import UserManuals from "@/pages/admin/UserManuals";
import CheckIn from "@/pages/CheckIn";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Switch>
        {/* Root */}
        <Route path="/" component={RootRedirect} />
        <Route path="/checkin" component={CheckIn} />

        {/* Embeddable widget (認証不要) */}
        <Route path="/widget-chat" component={WidgetChat} />

        {/* Admin portal (DashboardLayout内で認証チェック) */}
        <Route path="/admin" component={BigKPIs} />
        <Route path="/admin/dashboard" component={BigKPIs} />
        <Route path="/admin/quick-replies" component={AdminQuickReplies} />
        <Route path="/admin/rag" component={AdminRag} />
        <Route path="/admin/feedback" component={AdminFeedback} />
        <Route path="/admin/chats" component={AdminChatList} />
        <Route path="/admin/ai-chatbot" component={AIChatbot} />
        <Route path="/admin/user-manuals" component={UserManuals} />
        <Route path="/admin/flow-tree" component={AdminFlowTree} />
        <Route path="/admin/refund" component={Refund} />
        <Route path="/admin/hospitality" component={Hospitality} />
        <Route path="/admin/pricing" component={Pricing} />
        <Route path="/admin/customers" component={Customers} />
        <Route path="/admin/system-health" component={SystemHealth} />
        <Route path="/admin/ssot" component={SSoT} />

        <Route component={NotFound} />
      </Switch>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
