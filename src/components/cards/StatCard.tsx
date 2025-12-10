interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?:  React.ReactNode;
  trend?: { value: number; label:  string };
  accent?: boolean;
}

export default function StatCard({ title, value, subtitle, icon, trend, accent }:  StatCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        accent ? 'border-brandPrimary/30 ring-1 ring-brandPrimary/10' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend.value >= 0 ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
              </svg>
              <span>{Math.abs(trend. value)}% {trend.label}</span>
            </div>
          )}
        </div>
        {icon && <div className="p-2 rounded-lg bg-brandNavy/5 text-brandNavy">{icon}</div>}
      </div>
    </div>
  );
}