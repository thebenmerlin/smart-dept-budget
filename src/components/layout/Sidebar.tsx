'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';

const nav = [
  { label: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Budgets', href: '/budgets', icon:  'M12 8c-1.657 0-3 . 895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Expenses', href:  '/expenses', icon:  'M9 14l6-6m-5. 5.5h. 01m4. 99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { label: 'Receipts', href: '/receipts', icon:  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Reports', href: '/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

export default function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-slate-200 bg-white transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo & Header */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-200">
        <img src="/logo.jpg" alt="RSCOE Logo" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        {! isCollapsed && (
          <div className="min-w-0">
            <div className="text-xs font-bold text-brandNavy truncate">JSPM&apos;s RSCOE</div>
            <div className="text-[10px] text-slate-500 truncate">Computer Science & Business Systems</div>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-16 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 z-10"
      >
        <svg
          className={`w-4 h-4 text-slate-600 transition-transform ${isCollapsed ? 'rotate-180' :  ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {nav. map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item. href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brandNavy/10 text-brandNavy'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {! isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      {user && (
        <div className="border-t border-slate-200 p-3">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-brandNavy/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-brandNavy">{user.name[0]}</span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
                <div className="text-xs text-slate-500 capitalize">{user.role}</div>
              </div>
            )}
          </div>
          {! isCollapsed && (
            <button
              onClick={logout}
              className="mt-3 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      )}

      {/* Version */}
      {! isCollapsed && (
        <div className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-200">
          Enterprise Budget Suite v1.0
        </div>
      )}
    </aside>
  );
}