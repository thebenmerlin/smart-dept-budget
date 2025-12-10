import './globals.css';
import { ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SidebarProvider } from '../context/SidebarContext';
import AppShell from '../components/layout/AppShell';

export const metadata = {
  title: 'RSCOE CSBS | Budget Management System',
  description: 'Smart Department Budget Management & Expense Analytics System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SidebarProvider>
            <AppShell>{children}</AppShell>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}