type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-slate-100 text-slate-800',
};

export default function Badge({ children, variant = 'default' }: { children:  React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2. 5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}