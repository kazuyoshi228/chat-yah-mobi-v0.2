import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, MessageCircle, Settings, BookOpen, Zap, Star, BarChart2, Bot, FileText, FlaskConical, GitBranch, Archive, RotateCcw, Heart, TrendingUp } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

export type SidebarItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DEFAULT_OPERATOR_ITEMS: SidebarItem[] = [
  { title: "Chat List", href: "/ops/chats", icon: MessageCircle },
];

const DEFAULT_ADMIN_ITEMS: SidebarItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Chat List", href: "/admin/chats", icon: MessageCircle },
  { title: "Operators", href: "/admin/operators", icon: Users },
  { title: "AI Chatbot", href: "/admin/ai-chatbot", icon: Bot },
  { title: "Quick Replies", href: "/admin/quick-replies", icon: Zap },
  { title: "RAG Documents", href: "/admin/rag", icon: BookOpen },
  { title: "取扱説明書", href: "/admin/user-manuals", icon: FileText },
  { title: "Feedback", href: "/admin/feedback", icon: Star },
  { title: "Data Analysis", href: "/admin/data-analysis", icon: BarChart2 },
  { title: "Testing", href: "/admin/testing", icon: FlaskConical },
  { title: "Flow Tree", href: "/admin/flow-tree", icon: GitBranch },
  { title: "歴史資料", href: "/admin/historical-docs", icon: Archive },
  { title: "Refund", href: "/admin/refund", icon: RotateCcw },
  { title: "Hospitality", href: "/admin/hospitality", icon: Heart },
  { title: "定期的な改善", href: "/admin/improvements", icon: TrendingUp },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
  sidebarItems,
  title,
}: {
  children: React.ReactNode;
  sidebarItems?: SidebarItem[];
  title?: string;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in required
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Authentication is required to access this page.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/portal"; }}
            size="lg"
            className="w-full bg-black hover:bg-gray-800 text-white"
          >
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  // Determine menu items based on role if not provided
  const items = sidebarItems ?? (
    user.role === "admin" ? DEFAULT_ADMIN_ITEMS : DEFAULT_OPERATOR_ITEMS
  );

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        sidebarItems={items}
        title={title}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  sidebarItems: SidebarItem[];
  title?: string;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  sidebarItems,
  title,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = sidebarItems.find((item) => item.href === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-gray-100" disableTransition={isResizing}>
          <SidebarHeader className="h-14 justify-center border-b border-gray-100">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-2">
              {sidebarItems.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.href)}
                      tooltip={item.title}
                      className="h-9 font-normal text-sm"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-gray-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-black text-white">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-xs font-medium truncate">{user?.name ?? "-"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-12 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
              <span className="text-sm font-medium">{activeMenuItem?.title ?? title ?? "Menu"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto min-h-0 flex flex-col">{children}</main>
      </SidebarInset>
    </>
  );
}
