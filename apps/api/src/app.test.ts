import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp } from './app.js';

test('buildApp wires observability and health endpoint works', async () => {
  process.env.OBS_ENABLED = 'false';
  process.env.NODE_ENV = 'test';

  const { app, ctx } = buildApp();
  assert.ok(ctx.observability);

  const res = await app.inject({
    method: 'GET',
    url: '/healthz',
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });

  await app.close();
});
