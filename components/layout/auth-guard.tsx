'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, getRoleRedirect } from '@/hooks/use-auth';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Snowflake } from 'lucide-react';

const ROLE_ROUTES: Record<string, string[]> = {
  administrator: ['/admin', '/dashboard', '/shipments', '/tracking', '/map', '/predictions', '/risk-monitor', '/emergency', '/alerts', '/analytics', '/reports', '/fleet', '/drivers', '/hospitals', '/warehouses', '/cold-storage', '/notifications', '/settings', '/support'],
  dispatcher: ['/dispatcher', '/dashboard', '/shipments', '/tracking', '/map', '/predictions', '/risk-monitor', '/emergency', '/alerts', '/analytics', '/reports', '/fleet', '/drivers', '/notifications', '/settings', '/support'],
  driver: ['/driver', '/dashboard', '/tracking', '/map', '/emergency', '/alerts', '/notifications', '/settings', '/support'],
  hospital: ['/hospital', '/dashboard', '/shipments', '/tracking', '/map', '/alerts', '/notifications', '/settings', '/support', '/reports'],
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile) {
      const role = (profile.role || '').toLowerCase();
      const allowedRoutes = ROLE_ROUTES[role] || ['/dashboard'];
      const isAllowed = allowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
      if (!isAllowed) {
        router.replace(getRoleRedirect(role));
      }
    }
  }, [loading, user, profile, pathname, router]);

  const role = (profile?.role || '').toLowerCase();
  const allowedRoutes = ROLE_ROUTES[role] || ['/dashboard'];
  const isAllowed = allowedRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  if (loading || (user && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow animate-pulse">
            <Snowflake className="h-7 w-7 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Loading ThermaNeXus...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <DashboardShell>{children}</DashboardShell>;
}
