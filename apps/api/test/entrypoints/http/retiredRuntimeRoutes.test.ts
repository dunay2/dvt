import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registerProtectedRunRoutes } from '../../../src/entrypoints/http/protectedRuntimeRunRoutes.js';

describe('retired runtime routes', () => {
  const app = Fastify();

  afterEach(async () => app.close());

  it('does not expose the SQL-first materialization rows query', async () => {
    registerProtectedRunRoutes(
      app,
      {
        DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX: 100,
        DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS: 60_000,
      } as never,
      {} as never,
      { runtimeAuth: {} } as never
    );

    const response = await app.inject({
      method: 'GET',
      url: '/runs/run-1/materialization-rows',
    });

    expect(response.statusCode).toBe(404);
  });
});
