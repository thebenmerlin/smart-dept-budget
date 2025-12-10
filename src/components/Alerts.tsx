interface AlertsProps {
  utilization: number;
}

export default function Alerts({ utilization }: AlertsProps) {
  const nearing = utilization > 85 && utilization < 100;
  const over = utilization >= 100;

  if (! nearing && !over) return null;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${
        over ? 'border-brandPrimary bg-brandPrimary/5' : 'border-amber-500 bg-amber-50'
      }`}
    >
      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${over ? 'text-brandPrimary' :  'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="font-semibold text-slate-900">{over ? 'Budget Overrun Detected!' : 'Approaching Budget Limit'}</p>
        <p className="text-sm text-slate-600 mt-1">
          Current utilization is at <span className="font-medium">{utilization. toFixed(1)}%</span>. 
          {over ?  ' Immediate review required.' : ' Consider reviewing upcoming expenses.'}
        </p>
      </div>
    </div>
  );
}