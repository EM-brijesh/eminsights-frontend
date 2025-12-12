"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const isLoggedIn = typeof document !== 'undefined' && document.cookie.includes('auth=');

  // Compute user display name
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
    } catch {}
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
    {
      title: "Inbox",
      icon: Inbox,
      href: "/inbox",
      active: pathname === "/inbox",
      disabled: false
    },
    {
      title: "Analytics",
      icon: BarChart3,
      href: "/analytics",
      active: pathname === "/analytics",
      disabled: false
    },
    {
      title: "Reports",
      icon: FileText,
      href: "/reports",
      active: pathname.startsWith("/collection/"),
      disabled: true
    }
  ];

  const settingsNavActive =
    pathname === "/keywords" || pathname.startsWith("/settings/");

  return (
    <div className="flex min-h-dvh dark">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-20 bg-black border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >

        {/* Mobile Close */}
        <div className="flex items-center justify-center p-4 border-b border-gray-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-2 space-y-6 flex flex-col items-center">
          {navigationItems.map((item) => {
            const content = (
              <>
                <item.icon
                  className={`w-6 h-6 flex-shrink-0 ${
                    item.active ? "text-black" : "text-gray-300"
                  }`}
                />
                <span
                  className={`text-xs mt-2 font-medium ${
                    item.active ? "text-black" : "text-gray-300"
                  }`}
                >
                  {item.title}
                </span>
              </>
            );

            // disabled items
            if (item.disabled) {
              return (
                <div
                  key={item.title}
                  title={`${item.title} (coming soon)`}
                  className="flex flex-col items-center justify-center w-full py-3 rounded-lg text-gray-500 opacity-60 cursor-not-allowed"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={item.title}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-colors ${
                  item.active
                    ? "bg-white text-black"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {content}
              </Link>
            );
          })}

          {/* Settings Button */}
          <div className="w-full">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Settings"
              className={`flex flex-col items-center justify-center w-full py-3 rounded-lg transition-colors ${
                settingsNavActive
                  ? "bg-white text-black"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Settings
                className={`w-6 h-6 ${
                  settingsNavActive ? "text-black" : "text-gray-300"
                }`}
              />
              <span className="text-xs mt-2 font-medium">Settings</span>
            </button>

            {/* Settings Dropdown */}
            {settingsOpen && (
              <div className="mt-2 w-full space-y-2">

                {/* Keywords */}
                <Link
                  href="/keywords"
                  className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors ${
                    pathname === "/keywords"
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Tag className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium">Keywords</span>
                </Link>

                {/* UPDATED — Channel Config (CLICKABLE) */}
                <Link
                  href="/settings/channel-config"
                  title="Channel Configuration"
                  className="flex flex-col items-center justify-center w-full py-2 rounded-lg opacity-80 hover:opacity-100 transition-colors text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Plug className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium text-center">
                    Channel Configuration
                  </span>
                </Link>

                {/* Category Mapping */}
                <Link
                  href="/settings/category"
                  className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors ${
                    pathname === "/settings/category"
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Building2 className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium">Category</span>
                </Link>

                {/* Alerts */}
                <Link
                  href="/settings/alert"
                  className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors ${
                    pathname === "/settings/alert"
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Bell className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-medium">Alerts</span>
                </Link>

              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Bottom — User Menu */}
        <div className="p-4 border-t border-gray-800 flex flex-col items-center gap-4">
          <button className="flex flex-col items-center justify-center w-full py-2 text-gray-300 hover:bg-gray-800 rounded-lg">
            <Bell className="w-6 h-6" />
          </button>

          {/* User Avatar */}
          <div className="relative w-full flex flex-col items-center">
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center"
              >
                {userInitials}
              </button>

              <button
                onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                className="p-1 rounded hover:bg-gray-800/60"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                    sidebarProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Profile Dropdown */}
            {sidebarProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSidebarProfileOpen(false)} />

                <div className="absolute left-full bottom-0 mb-4 ml-3 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                  <div className="p-3 border-b border-gray-700">
                    <div className="font-medium text-white">{userDisplayName}</div>
                    <div className="text-sm text-gray-400">{currentUser?.email}</div>
                  </div>

                  <div className="p-2">
                    <Link href="/brands" className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded">
                      <Building2 className="w-4 h-4" />
                      Manage Brands
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-gray-700 rounded"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
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
        <div className="lg:hidden sticky top-0 z-40 bg-black/80 border-b border-gray-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-300 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-sm text-gray-400">{currentUser?.email}</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
