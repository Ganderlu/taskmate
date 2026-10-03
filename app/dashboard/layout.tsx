"use client";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import MobileBottomNav from "../components/MobileBottomNav";
import { SidebarProvider } from "./SidebarContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Sidebar - Hidden on mobile by default, handled inside component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar - Visible only on mobile (logic inside component) */}
        <Topbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth pb-[96px] lg:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation (app-style) */}
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
