import assert from 'node:assert/strict';

import { it, vi } from 'vitest';

import { DuckDbLocalDataRuntime } from '../../src/infrastructure/duckdb/DuckDbLocalDataRuntime.js';
import { buildLocalDataCaptureRuntime } from '../../src/modules/localData/buildLocalDataCaptureRuntime.js';

it('keeps disabled LOCAL capability absent without consulting authorization, catalog or credentials', async () => {
  const configuration = { kind: 'disabled' as const };
  const runtime = new DuckDbLocalDataRuntime(configuration);
  const authorizeMany = vi.fn(async () => []);
  const getConnection = vi.fn();
  const resolveCredential = vi.fn(async () => null);
  const module = buildLocalDataCaptureRuntime({
    configuration,
    runtime,
    authorizer: { authorizeMany },
    catalog: { getConnection },
    credentials: { resolveCredential },
    clock: () => new Date(),
    capture: {
      limits: { maxRows: 4096, maxLogicalBytes: 4194304 },
      batchRows: 1024,
      timeoutMs: 20000,
    },
  });
  assert.equal(module, undefined);
  assert.equal(authorizeMany.mock.calls.length, 0);
  assert.equal(getConnection.mock.calls.length, 0);
  assert.equal(resolveCredential.mock.calls.length, 0);
  await runtime.close();
});
