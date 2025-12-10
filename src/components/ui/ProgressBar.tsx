interface ProgressBarProps {
  value: number;
  max?:  number;
  label?: string;
  showPercent?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'navy' | 'success' | 'warning' | 'danger';
}

const colors = {
  primary: 'bg-brandPrimary',
  navy: 'bg-brandNavy',
  success: 'bg-green-500',
  warning:  'bg-amber-500',
  danger: 'bg-red-500',
};

const sizes = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export default function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  size = 'md',
  color = 'navy',
}: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  const dynamicColor = percent >= 100 ? 'danger' : percent >= 85 ? 'warning' : color;

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-slate-600">{label}</span>}
          {showPercent && <span className="text-sm font-medium text-slate-700">{percent. toFixed(1)}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${colors[dynamicColor]} ${sizes[size]} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}