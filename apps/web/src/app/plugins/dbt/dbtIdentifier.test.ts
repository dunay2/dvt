import { describe, expect, it } from 'vitest';

import { normalizeDbtIdentifier } from './dbtIdentifier';

describe('dbt identifier spelling', () => {
  it.each([
    { value: undefined, expected: 'Fallback-ID' },
    { value: '', expected: 'Fallback-ID' },
    { value: ' \t\n ', expected: 'Fallback-ID' },
    { value: ' ___ !!! ', expected: 'Fallback-ID' },
    { value: '订单', expected: 'Fallback-ID' },
    { value: ' OrderItems / v2 ', expected: 'order_items_v2' },
    { value: '__already_named__', expected: 'already_named' },
    { value: 'HTTPOrders', expected: 'httporders' },
    { value: 'v2Orders', expected: 'v2_orders' },
    { value: 'Métric 名', expected: 'm_tric' },
  ])('normalizes $value to $expected', ({ value, expected }) => {
    expect(normalizeDbtIdentifier(value, 'Fallback-ID')).toBe(expected);
  });
});
