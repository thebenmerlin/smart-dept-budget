'use client';
import { useAuth } from '../../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileSidebar from './MobileSidebar';

export default function AppShell({ children }:  { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (! isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brandNavy border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login page doesn't need shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <MobileSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}