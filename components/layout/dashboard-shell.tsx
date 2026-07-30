'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AIAssistant } from './ai-assistant';
import { NotificationProvider } from '@/hooks/use-notifications';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('thermanexus-theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('thermanexus-theme', next);
  }

  return (
    <NotificationProvider>
    <div className="h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={`flex h-screen flex-col transition-[padding] duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[256px]'}`}>
        <Header
          onMenuClick={() => setMobileOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6 [scrollbar-gutter:stable]">
          {children}
        </main>
      </div>
      <AIAssistant />
    </div>
    </NotificationProvider>
  );
}
