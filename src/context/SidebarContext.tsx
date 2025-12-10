'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type SidebarContextType = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isMobileOpen,
        toggle:  () => setIsCollapsed((p) => !p),
        toggleMobile: () => setIsMobileOpen((p) => !p),
        closeMobile: () => setIsMobileOpen(false),
      }}
    >
      {children}
    </SidebarContext. Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within SidebarProvider');
  return context;
}