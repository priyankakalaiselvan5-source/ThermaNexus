'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth, getRoleRedirect } from '@/hooks/use-auth';
import { getNavForRole, ROLE_DASHBOARD_HREF, LANGUAGES } from '@/lib/nav';
import { useNotifications } from '@/hooks/use-notifications';
import { toast } from 'sonner';
import {
  Search, Bell, Mic, Globe, Sun, Moon, ChevronDown, Menu,
  Command, LogOut, Settings, CircleUser, Check, Siren,
} from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  hospital: 'Hospital',
};

export function Header({ onMenuClick, theme, toggleTheme }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useNotifications();
  const role = (profile?.role || 'administrator').toLowerCase();
  const navItems = getNavForRole(role);
  const homeHref = ROLE_DASHBOARD_HREF[role] || '/dashboard';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentItem = navItems.find((item) => pathname.startsWith(item.href));
  const breadcrumbs = currentItem
    ? [{ label: 'ThermaNeXus', href: homeHref }, { label: currentItem.label }]
    : [{ label: 'ThermaNeXus' }];

  const initials = (profile?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredNav = searchQuery
    ? navItems.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : navItems;

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setListening(false);
      handleVoiceCommand(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function handleVoiceCommand(cmd: string) {
    const match = navItems.find((item) => cmd.includes(item.label.toLowerCase()));
    if (match) {
      router.push(match.href);
      return;
    }
    if (cmd.includes('dark') || cmd.includes('light')) toggleTheme();
    if (cmd.includes('emergency')) router.push('/emergency');
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const recentNotifs = notifications.slice(0, 6);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border glass-strong px-4 lg:px-6">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden">
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 text-sm md:flex">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              <span className={cn(i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {bc.label}
              </span>
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted md:w-56 lg:w-64"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:flex">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>

          <button
            onClick={startVoice}
            className={cn(
              'rounded-xl border p-2.5 transition-colors',
              listening
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            )}
            title="Voice command"
          >
            <Mic className={cn('h-4 w-4', listening && 'animate-pulse')} />
          </button>

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:bg-muted"
              title="Language"
            >
              <Globe className="h-4 w-4" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-border bg-card p-2 shadow-premium-lg">
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Select Language</p>
                <div className="max-h-64 overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLangOpen(false)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="text-foreground">{lang.native}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:bg-muted"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-critical ring-2 ring-card" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border bg-card shadow-premium-lg">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <p className="text-sm font-semibold">Notifications</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-critical/10 px-2 py-0.5 text-xs font-semibold text-critical">{unreadCount} new</span>
                    )}
                    {unreadCount > 0 && (
                      <button onClick={() => markAllRead()} className="text-[10px] text-primary hover:underline">Mark all read</button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recentNotifs.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-xs text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className="border-b border-border/50 p-4 last:border-0 hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          n.severity === 'critical' ? 'bg-critical' :
                          n.severity === 'warning' ? 'bg-warning' : 'bg-primary'
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { router.push('/notifications'); setNotifOpen(false); }}
                  className="w-full border-t border-border p-3 text-center text-sm font-medium text-primary hover:bg-muted/50"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 pr-2 transition-colors hover:bg-muted"
            >
              <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg gradient-primary text-xs font-bold text-white">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile?.name || 'User'} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-xs font-semibold text-foreground">{profile?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[role] || role}</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground lg:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-border bg-card p-2 shadow-premium-lg">
                <div className="border-b border-border p-3">
                  <p className="text-sm font-semibold text-foreground">{profile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email || ''}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {ROLE_LABELS[role] || role}
                    </span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Active</span>
                  </div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => router.push(getRoleRedirect(role))}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                  >
                    <CircleUser className="h-4 w-4 text-muted-foreground" /> Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/settings')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/20 backdrop-blur-sm p-4 pt-[15vh]"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-premium-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border p-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, shipments, vehicles..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredNav.map((item) => (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); setSearchOpen(false); setSearchQuery(''); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{item.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{item.href}</span>
                </button>
              ))}
              {filteredNav.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">No results found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {listening && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-3 rounded-2xl border border-primary/20 bg-card px-4 py-3 shadow-premium-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Mic className="h-4 w-4 animate-pulse text-primary" />
          </div>
          <span className="text-sm font-medium">Listening...</span>
        </div>
      )}
    </>
  );
}
