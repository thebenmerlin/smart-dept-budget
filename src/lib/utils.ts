import { format } from 'date-fns';

export const money = (value: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);

export const formatDate = (d: string | Date) =>
  format(new Date(d), 'yyyy-MM-dd');

export const parseNumber = (v: any) => Number(v) || 0;