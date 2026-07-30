'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getNavForRole } from '@/lib/nav';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard, Package, Navigation, Map, BrainCircuit, Siren,
  BellRing, BarChart3, FileText, Truck, Users, Building2, Warehouse,
  Snowflake, Bell, Settings, LifeBuoy, ChevronLeft, Activity,
  ShieldCheck, X, Thermometer, QrCode, History, User,
  CheckCircle2, Boxes, FolderOpen, ShieldAlert,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  LayoutDashboard, Package, Navigation, Map, BrainCircuit, Siren,
  BellRing, BarChart3, FileText, Truck, Users, Building2, Warehouse,
  Snowflake, Bell, Settings, LifeBuoy, Thermometer, QrCode, History,
  User, CheckCircle2, Boxes, FolderOpen, ShieldAlert,
};

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const role = (profile?.role || 'administrator').toLowerCase();
  const navItems = getNavForRole(role);
  const homeHref = role === 'administrator' ? '/admin' : `/${role}`;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-[width,transform] duration-300 lg:translate-x-0',
          collapsed ? 'w-[72px]' : 'w-[256px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
          <Link href={homeHref} className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold tracking-tight text-foreground">ThermaNeXus</p>
                <p className="text-[10px] text-muted-foreground">Cold Chain AI</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex flex-1 flex-col gap-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon] || Activity;
            const isExact = pathname === item.href;
            const isPrefix = pathname.startsWith(item.href + '/');
            const active = isExact || (isPrefix && item.href !== homeHref);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'gradient-primary text-white shadow-glow'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', active && 'text-white')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className={cn(
                    'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    item.badge === 'active' ? 'bg-critical/15 text-critical' : 'bg-primary/15 text-primary'
                  )}>
                    {item.badge === 'active' ? 'SOS' : 'New'}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span className={cn(
                    'absolute right-1 top-1 h-2 w-2 rounded-full',
                    item.badge === 'active' ? 'bg-critical' : 'bg-primary'
                  )} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className={cn('flex items-center gap-3 rounded-xl bg-secondary/50 p-2.5', collapsed && 'justify-center')}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-foreground">System Secure</p>
                <p className="truncate text-[10px] text-muted-foreground">HIPAA & GDPR Ready</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-premium transition-transform hover:scale-110 lg:flex"
        >
          <ChevronLeft className={cn('h-4 w-4 text-muted-foreground transition-transform', collapsed && 'rotate-180')} />
        </button>
      </aside>
    </>
  );
}
