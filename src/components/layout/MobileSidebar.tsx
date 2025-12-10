'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';

const nav = [
  { label: 'Dashboard', href: '/' },
  { label: 'Budgets', href: '/budgets' },
  { label: 'Expenses', href: '/expenses' },
  { label:  'Receipts', href: '/receipts' },
  { label: 'Reports', href: '/reports' },
];

export default function MobileSidebar() {
  const { isMobileOpen, closeMobile } = useSidebar();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={closeMobile} />
      <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
          <div>
            <div className="text-sm font-bold text-brandNavy">JSPM&apos;s RSCOE</div>
            <div className="text-xs text-slate-500">CSBS Department</div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item. href}
              onClick={closeMobile}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
                pathname === item.href ?  'bg-brandNavy/10 text-brandNavy' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
            <div className="text-sm font-medium text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500 capitalize mb-3">{user.role}</div>
            <button onClick={logout} className="text-sm text-red-600 hover:underline">
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}