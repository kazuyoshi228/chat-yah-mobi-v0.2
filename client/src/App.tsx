/**
 * App.tsx — ルーティング定義
 * Admin画面は AdminAuthGuard で保護
 * tRPC 完全排除版
 */
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AdminAuthGuard from "@/components/AdminAuthGuard";

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

/** Admin画面ラッパー — Google認証ガード付き */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AdminAuthGuard>
      <Component />
    </AdminAuthGuard>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Switch>
        {/* Root */}
        <Route path="/" component={RootRedirect} />

        {/* Embeddable widget (認証不要) */}
        <Route path="/widget-chat" component={WidgetChat} />

        {/* Admin portal (Google認証必須) */}
        <Route path="/admin">{() => <AdminRoute component={BigKPIs} />}</Route>
        <Route path="/admin/dashboard">{() => <AdminRoute component={BigKPIs} />}</Route>
        <Route path="/admin/quick-replies">{() => <AdminRoute component={AdminQuickReplies} />}</Route>
        <Route path="/admin/rag">{() => <AdminRoute component={AdminRag} />}</Route>
        <Route path="/admin/feedback">{() => <AdminRoute component={AdminFeedback} />}</Route>
        <Route path="/admin/chats">{() => <AdminRoute component={AdminChatList} />}</Route>
        <Route path="/admin/ai-chatbot">{() => <AdminRoute component={AIChatbot} />}</Route>
        <Route path="/admin/user-manuals">{() => <AdminRoute component={UserManuals} />}</Route>
        <Route path="/admin/flow-tree">{() => <AdminRoute component={AdminFlowTree} />}</Route>
        <Route path="/admin/refund">{() => <AdminRoute component={Refund} />}</Route>
        <Route path="/admin/hospitality">{() => <AdminRoute component={Hospitality} />}</Route>
        <Route path="/admin/pricing">{() => <AdminRoute component={Pricing} />}</Route>
        <Route path="/admin/customers">{() => <AdminRoute component={Customers} />}</Route>
        <Route path="/admin/system-health">{() => <AdminRoute component={SystemHealth} />}</Route>
        <Route path="/admin/ssot">{() => <AdminRoute component={SSoT} />}</Route>

        <Route component={NotFound} />
      </Switch>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
