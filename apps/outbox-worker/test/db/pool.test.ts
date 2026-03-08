import assert from 'node:assert/strict';
import test from 'node:test';

import { closePgPool, getPgPool } from '../../src/db/pool.js';

await test('closePgPool ends and resets the shared pool', async () => {
  await closePgPool();

  const pool = getPgPool('postgresql://user:pass@localhost:5432/dvt');
  let endCalls = 0;
  const originalEnd = pool.end;

  pool.end = async function end(): Promise<void> {
    endCalls += 1;
  };

  try {
    await closePgPool();

    assert.equal(endCalls, 1);
    assert.notEqual(getPgPool('postgresql://user:pass@localhost:5432/dvt'), pool);
  } finally {
    pool.end = originalEnd;
    await closePgPool();
  }
});
