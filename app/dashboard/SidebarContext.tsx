"use client";

import { createContext, useContext, useState } from "react";

type SidebarContextType = {
  open: boolean;
  collapsed: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        open,
        collapsed,
        openSidebar: () => setOpen(true),
        closeSidebar: () => setOpen(false),
        toggleCollapsed: () => setCollapsed((prev) => !prev),
        setCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside SidebarProvider");
  }
  return ctx;
}
