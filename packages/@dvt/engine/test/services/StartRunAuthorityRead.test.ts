import { describe, expect, it } from 'vitest';

import { readStartRunAuthority } from '../../src/services/startRun/readStartRunAuthority.js';

describe('start-run authority observation', () => {
  it('distinguishes a found value from confirmed missing', async () => {
    const value = { status: 'PENDING' };
    await expect(readStartRunAuthority(async () => value)).resolves.toEqual({
      kind: 'found',
      value,
    });
    await expect(readStartRunAuthority(async () => null)).resolves.toEqual({ kind: 'missing' });
  });

  it.each([new Error('read unavailable'), 'transport rejection', undefined, null])(
    'preserves rejected values as failed observations, never missing',
    async (error) => {
      await expect(readStartRunAuthority(() => Promise.reject(error))).resolves.toEqual({
        kind: 'failed',
        error,
      });
    }
  );

  it('also captures a read that throws synchronously', async () => {
    const error = new Error('client unavailable');
    await expect(
      readStartRunAuthority(() => {
        throw error;
      })
    ).resolves.toEqual({ kind: 'failed', error });
  });
});
