'use client';

import { usePathname } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AppShell({ children }) {
  const pathname = usePathname() || '/';
  const isPublic = pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/test-api');

  if (isPublic) return children;
  return <DashboardLayout>{children}</DashboardLayout>;
}


