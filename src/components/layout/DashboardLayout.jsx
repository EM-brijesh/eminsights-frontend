'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  FileText,
  Inbox,
  Building2,
  Plug,
  Tag,
  UserPlus,
  User
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const isLoggedIn = typeof document !== 'undefined' && document.cookie.includes('auth=');

  // Compute user display name and initials
  const computeDisplayName = (user) => {
    if (!user) return "User";
    if (user.name && user.name.trim()) return user.name.trim();
    if (user.email) {
      const local = user.email.split("@")[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return "User";
  };

  const userDisplayName = computeDisplayName(currentUser);
  const userInitials = (userDisplayName || "U").slice(0, 2).toUpperCase();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch (err) {
      console.error("Failed to parse user from storage", err);
    }
  }, []);

  // Auto-open settings dropdown when on settings-related pages
  useEffect(() => {
    if (pathname === "/keywords" || pathname.startsWith("/settings/")) {
      setSettingsOpen(true);
    } else {
      setSettingsOpen(false);
    }
  }, [pathname]);

  const handleLogout = () => {
    document.cookie = "auth=; Max-Age=0; path=/";
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      if (typeof window !== "undefined") window.__authToken = "";
    } catch {}
    router.push("/");
  };

  const navigationItems = [
<<<<<<< Updated upstream
    { title: "Inbox", icon: Inbox, href: "/inbox", active: pathname === "/inbox" },
    { title: "Analytics", icon: BarChart3, href: "/analytics", active: pathname === "/analytics" },
    { 
      title: "Reports", 
      icon: FileText, 
      href: "/reports", 
      active: pathname.startsWith("/collection/"), 
      disabled: true 
=======
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
      title: 'Reports',
      icon: FileText,
      href: '/reports',
      active: pathname?.startsWith('/collection/'),
      disabled: true
>>>>>>> Stashed changes
    }
  ];

  const settingsNavActive = pathname === "/keywords" || pathname.startsWith("/settings/");

  return (
    <div className="flex min-h-dvh dark bg-black text-white">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-20 bg-black border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-center p-4 border-b border-gray-800 lg:hidden">
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-6 flex flex-col items-center">
          {navigationItems.map((item) => {
<<<<<<< Updated upstream
            const content = (
              <>
                <item.icon className={`w-6 h-6 flex-shrink-0 ${item.active ? "text-black" : "text-gray-300"}`} />
                <span className={`text-xs mt-2 font-medium ${item.active ? "text-black" : "text-gray-300"}`}>
                  {item.title}
                </span>
              </>
            );
=======
            const baseClasses = `flex flex-col items-center justify-center w-full py-3 rounded-lg transition-colors ${
              item.active
                ? 'bg-white text-black'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`;

            const content = (
              <>
                <item.icon className={`w-6 h-6 flex-shrink-0 ${item.active ? 'text-black' : 'text-gray-300'}`} />
                <span className={`text-xs mt-2 font-medium ${item.active ? 'text-black' : 'text-gray-300'}`}>{item.title}</span>
              </>
            );

            if (item.disabled) {
              return (
                <div
                  key={item.title}
                  title={`${item.title} (coming soon)`}
                  aria-disabled="true"
                  className={`${baseClasses} cursor-not-allowed opacity-60 focus-visible:outline-none`}
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
                className={`${baseClasses} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`}
              >
                {content}
              </Link>
            );
          })}
>>>>>>> Stashed changes

            if (item.disabled) {
              return (
                <div key={item.title} title={`${item.title} (Coming Soon)`} className="flex flex-col items-center justify-center w-full py-3 rounded-lg text-gray-500 opacity-50 cursor-not-allowed">
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-colors ${
                  item.active ? "bg-white text-black" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {content}
              </Link>
            );
          })}

          {/* Settings Section */}
          <div className="w-full">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-colors ${
                settingsNavActive ? "bg-white text-black" : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-xs mt-2 font-medium">Settings</span>
            </button>

            {settingsOpen && (
              <div className="mt-2 w-full space-y-2">
                <Link href="/keywords" className={`flex flex-col items-center justify-center w-full py-2 rounded-lg ${pathname === "/keywords" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
                  <Tag className="w-4 h-4 mb-1" />
                  <span className="text-[10px]">Keywords</span>
                </Link>
                <Link href="/settings/channel-config" className={`flex flex-col items-center justify-center w-full py-2 rounded-lg ${pathname === "/settings/channel-config" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
                  <Plug className="w-4 h-4 mb-1" />
                  <span className="text-[10px]">Channels</span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-800 flex flex-col items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors">
            <Bell className="w-6 h-6" />
          </button>
          
          {/* User Profile Section with Chevron Trigger */}
          <div className="relative w-full flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-bold shadow-md cursor-default"
            >
              {userInitials}
            </div>

            {/* THE ARROW (CHEVRON) BUTTON */}
            <button
              onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
              className="p-1 rounded hover:bg-gray-800 transition-colors focus:outline-none"
              aria-label="Toggle user menu"
            >
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  sidebarProfileOpen ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {sidebarProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSidebarProfileOpen(false)} />
                <div className="absolute left-full bottom-0 mb-2 ml-4 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                    <p className="font-semibold text-white truncate">{userDisplayName}</p>
                    <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
                    {currentUser?.role === 'admin' && (
                      <span className="mt-2 inline-block text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 font-medium uppercase tracking-wider">
                        Administrator
                      </span>
                    )}
                  </div>
                  
                  <div className="p-2 space-y-1">
                    <Link 
                      href="/brands" 
                      onClick={() => setSidebarProfileOpen(false)} 
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Building2 className="w-4 h-4" /> Manage Brands
                    </Link>

                    {/* ADMIN ONLY LOGIC */}
                    {currentUser?.role === 'admin' && (
                      <Link 
                        href="/settings/users" 
                        onClick={() => setSidebarProfileOpen(false)} 
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-4 h-4" /> Create User
                      </Link>
                    )}

                    <div className="my-1 border-t border-gray-800" />

                    <button 
                      onClick={handleLogout} 
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-20">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-black border-b border-gray-800 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xs text-gray-500 truncate max-w-[150px]">{currentUser?.email}</span>
        </header>
        
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
    </div>
  );
}