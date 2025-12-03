'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Bell,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  FileText,
  Inbox,
  Building2,
  Plug,
  Tag
} from 'lucide-react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const isLoggedIn = typeof document !== 'undefined' && document.cookie.includes('auth=');

  const computeDisplayName = (user) => {
    if (!user) return 'User';
    if (user.name && String(user.name).trim()) return String(user.name).trim();
    if (user.email) {
      const localPart = String(user.email).split('@')[0] || '';
      if (localPart) {
        return localPart.charAt(0).toUpperCase() + localPart.slice(1);
      }
    }
    return 'User';
  };

  const userDisplayName = computeDisplayName(currentUser);
  const userInitials = (userDisplayName || currentUser?.email || 'U').slice(0, 2).toUpperCase();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}
  }, []);

  // Auto-open settings dropdown if on settings pages
  useEffect(() => {
    if (pathname === '/keywords' || pathname === '/settings/channel-config') {
      setSettingsOpen(true);
    }
  }, [pathname]);
  const handleLogout = () => {
    // Clear auth cookie and redirect to login
    document.cookie = 'auth=; Max-Age=0; path=/';
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      if (typeof window !== 'undefined') {
        window.__authToken = '';
      }
    } catch {}
    router.push('/');
  };

  const navigationItems = [
    {
      title: 'Inbox',
      icon: Inbox,
      href: '/inbox',
      active: pathname === '/inbox'
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      active: pathname === '/analytics'
    },
    {
      title: '',
      icon: FileText,
      href: '/reports',
      active: pathname?.startsWith('/collection/'),
      disabled: true
    }
  ];

  const settingsItems = [
    {
      title: 'Settings',
      icon: Settings,
      items: [
        { title: 'Keywords Configuration', href: '/keywords' },
        { title: 'Channel Configuration', href: '/settings/channel-config' },
        { title: 'Category Mapping', href: '/settings/category' },
        { title: 'Alert', href: '/settings/alert' }
      ]
    }
  ];

  const settingsNavActive = pathname === '/keywords' || pathname === '/settings/channel-config';

  return (
    <div className={`flex min-h-dvh dark`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-20 bg-black border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo - Mobile toggle */}
        <div className="flex items-center justify-center p-4 border-b border-gray-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-6 flex flex-col items-center">
          {navigationItems.map((item) => {
            const content = (
              <>
                <item.icon className={`w-6 h-6 flex-shrink-0 ${item.active ? 'text-black' : 'text-gray-300'}`} />
                <span
                  className={`text-xs mt-2 font-medium ${
                    item.active ? 'text-black' : 'text-gray-300'
                  }`}
                >
                  {item.title}
                </span>
              </>
            );

            if (item.disabled) {
              return (
                <div
                  key={item.title}
                  title={`${item.title} (coming soon)`}
                  className="flex flex-col items-center justify-center w-full py-3 rounded-lg text-gray-500 cursor-not-allowed opacity-50"
                  aria-disabled="true"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  item.active ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {content}
              </Link>
            );
          })}

          {/* Settings Button with Dropdown */}
          <div className="w-full">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Settings"
              className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                settingsNavActive ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Settings className={`w-6 h-6 flex-shrink-0 ${settingsNavActive ? 'text-black' : 'text-gray-300'}`} />
              <span className={`text-xs mt-2 font-medium ${settingsNavActive ? 'text-black' : 'text-gray-300'}`}>Settings</span>
            </button>

            {/* Settings Dropdown Menu */}
            {settingsOpen && (
              <div className="mt-2 w-full space-y-2">
                <Link
                  href="/keywords"
                  className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                    pathname === '/keywords' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Tag className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium">Keywords</span>
                </Link>
                <Link
                  href="/settings/channel-config"
                  className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                    pathname === '/settings/channel-config' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Plug className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium text-center">Coming Soon</span>
                </Link>
              </div>
            )}
          </div>

        </nav>

        {/* User Section - Bottom */}
        <div className="p-4 border-t border-gray-800 flex flex-col items-center gap-4 mt-auto">
          {/* Notification Bell */}
          <button className="flex flex-col items-center justify-center w-full py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
            <Bell className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium text-gray-300"></span>
          </button>

          {/* User Avatar with dropdown (same as top-right) */}
          <div className="relative w-full flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="User menu (sidebar)"
                title="User menu"
              >
                <span className="font-semibold text-sm">{userInitials}</span>
              </button>
              <button
                onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                aria-label="Toggle user menu"
                className="p-1 rounded hover:bg-gray-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                title="Toggle user menu"
              >
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${sidebarProfileOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {/* Name hidden as requested */}

            {sidebarProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSidebarProfileOpen(false)} />
                <div className="absolute left-full bottom-0 mb-4 ml-3 w-64 max-h-[70vh] overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  {isLoggedIn ? (
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 dark:text-white">{userDisplayName}</div>
                        {currentUser?.role && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${currentUser.role === 'admin' ? 'border-purple-300 text-purple-200' : 'border-white/40 text-white/80'}`}>
                            {currentUser.role}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email || 'Signed in'}</div>
                    </div>
                  ) : (
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="font-medium text-gray-900 dark:text-white">Guest</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Not signed in</div>
                    </div>
                  )}
                  <div className="p-2">
                    <button onClick={() => setSidebarProfileOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <Link href="/brands" onClick={() => setSidebarProfileOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                      <Building2 className="w-4 h-4" />
                      Manage Brands
                    </Link>
                    {currentUser?.role === 'admin' && (
                      <Link href="/settings/users" onClick={() => setSidebarProfileOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                        <UserPlus className="w-4 h-4" />
                        Create User
                      </Link>
                    )}
                    <button onClick={() => setSidebarProfileOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    {isLoggedIn ? (
                      <button onClick={() => { setSidebarProfileOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    ) : (
                      <Link href="/" onClick={() => setSidebarProfileOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                        <User className="w-4 h-4" />
                        Login
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-20">
        {/* Mobile Top Bar */}
        <div className="lg:hidden sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-sm text-gray-400">
              {currentUser?.email || ''}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

