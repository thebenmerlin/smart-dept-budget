import { format, parseISO } from 'date-fns';

// Format currency in Indian Rupees
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format currency in Lakhs
export function formatInLakhs(amount: number): string {
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(2)}L`;
}

// Format date
export function formatDate(date: string | Date | null | undefined, formatStr: string = 'dd MMM yyyy'): string {
  if (!date) return '-';
  try {
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      if (isNaN(parsed.getTime())) return '-';
      return format(parsed, formatStr);
    }
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr);
  } catch {
    return '-';
  }
}

// Get current fiscal year
export function getCurrentFiscalYear(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Fiscal year starts in April
  if (month >= 3) { // April onwards
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

// Get fiscal year options
export function getFiscalYearOptions(count: number = 5): string[] {
  const options: string[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = -1; i < count; i++) {
    const year = currentYear - i;
    options.push(`${year}-${(year + 1).toString().slice(-2)}`);
  }

  return options;
}

// Calculate variance
export function calculateVariance(proposed: number, allotted: number): {
  amount: number;
  percentage: number;
  type: 'surplus' | 'deficit' | 'balanced';
} {
  const amount = allotted - proposed;
  const percentage = proposed > 0 ? (amount / proposed) * 100 : 0;

  let type: 'surplus' | 'deficit' | 'balanced';
  if (amount > 0) {
    type = 'surplus';
  } else if (amount < 0) {
    type = 'deficit';
  } else {
    type = 'balanced';
  }

  return { amount, percentage, type };
}

// Calculate budget utilization
export function calculateUtilization(spent: number, allotted: number): {
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  remaining: number;
} {
  const percentage = allotted > 0 ? (spent / allotted) * 100 : 0;
  const remaining = allotted - spent;

  let status: 'safe' | 'warning' | 'danger';
  if (percentage >= 100) {
    status = 'danger';
  } else if (percentage >= 85) {
    status = 'warning';
  } else {
    status = 'safe';
  }

  return { percentage, status, remaining };
}

// Slugify string
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Truncate string
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

// Parse number safely
export function parseNumber(value: any, defaultValue: number = 0): number {
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}