'use client';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';

export default function Topbar() {
  const { toggleMobile } = useSidebar();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="flex items-center gap-3">
        <button onClick={toggleMobile} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Department Budget Management</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Enterprise Expense Analytics & Reporting System</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1. 5 bg-brandNavy/5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-brandNavy flex items-center justify-center">
              <span className="text-xs font-bold text-white">{user.name[0]}</span>
            </div>
            <span className="text-sm font-medium text-brandNavy">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}