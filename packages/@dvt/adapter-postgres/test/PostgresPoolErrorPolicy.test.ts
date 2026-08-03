import { describe, expect, it, vi } from 'vitest';

import { createObservedPostgresPool } from '../src/PostgresPoolErrorPolicy.js';

describe('PostgresPoolErrorPolicy', () => {
  it('reports idle-client errors without leaving the pool error event unhandled', async () => {
    const report = vi.fn();
    const pool = createObservedPostgresPool(
      { connectionString: 'postgresql://user:pass@localhost:5432/dvt' },
      report
    );
    const failure = Object.assign(new Error('database interrupted'), { code: '57P01' });

    expect(() => pool.emit('error', failure, undefined as never)).not.toThrow();
    expect(report).toHaveBeenCalledWith({
      code: '57P01',
      message: 'database interrupted',
    });

    await pool.end();
  });
});
