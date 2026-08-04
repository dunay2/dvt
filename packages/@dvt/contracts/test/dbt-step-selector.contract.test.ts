import { describe, expect, it } from 'vitest';

import { DBT_STEP_SELECTOR_CUSTOM_KEY, resolveDbtStepSelector } from '../src/index.js';

describe('DBT step selector contract', () => {
  it('resolves a bounded selector independently from the graph step identity', () => {
    expect(
      resolveDbtStepSelector({
        custom: {
          [DBT_STEP_SELECTOR_CUSTOM_KEY]: {
            version: 'v1',
            selector: 'not_null_orders_order_id',
          },
        },
      })
    ).toEqual({
      status: 'valid',
      target: { version: 'v1', selector: 'not_null_orders_order_id' },
    });
  });

  it('distinguishes absent selector metadata from malformed selector metadata', () => {
    expect(resolveDbtStepSelector({ custom: {} })).toEqual({ status: 'absent' });
    expect(
      resolveDbtStepSelector({
        custom: {
          [DBT_STEP_SELECTOR_CUSTOM_KEY]: { version: 'v1', selector: '  ' },
        },
      })
    ).toEqual({ status: 'invalid' });
  });
});
