import { money, formatDate } from '../src/lib/utils';

describe('utils', () => {
  test('money formats INR', () => {
    expect(money(1234.56)).toContain('₹');
  });
  test('formatDate outputs ISO', () => {
    expect(formatDate('2024-01-02')).toBe('2024-01-02');
  });
});