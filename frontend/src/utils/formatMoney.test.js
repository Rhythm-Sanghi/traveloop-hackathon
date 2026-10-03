import { describe, expect, it } from 'vitest';
import { formatMoney } from './formatMoney';

describe('formatMoney', () => {
  it.each([
    ['USD', '$1,234.50'],
    ['INR', '₹1,234.50'],
    ['EUR', '€1,234.50'],
  ])('formats %s amounts without changing the currency', (currency, expected) => {
    expect(formatMoney(1234.5, currency)).toBe(expected);
  });
});
