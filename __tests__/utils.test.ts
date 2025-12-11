import { formatCurrency, formatDate } from '../src/lib/utils';

describe('utils', () => {
  test('formatCurrency formats INR', () => {
    expect(formatCurrency(1234.56)).toContain('₹');
    expect(formatCurrency(1234.56)).toContain('1,234.56');
  });
  test('formatDate outputs formatted date', () => {
    expect(formatDate('2024-01-02')).toBe('02 Jan 2024');
    expect(formatDate('2024-01-02', 'yyyy-MM-dd')).toBe('2024-01-02');
  });
});