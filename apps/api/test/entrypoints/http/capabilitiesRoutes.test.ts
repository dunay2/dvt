import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../../src/plugins/env.js';
import { capabilitiesRoutes } from '../../../src/routes/capabilities.js';

describe('capabilitiesRoutes', () => {
  it('returns the public capability payload expected by the frontend shell', async () => {
    const app = Fastify({ logger: false });
    await app.register(capabilitiesRoutes, { prefix: '/', env: loadEnv({}) });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/capabilities',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        apiVersion: '0.1.0',
        minFrontendVersion: '0.1.0',
        plugins: {
          'dvt.http-json': {
            available: false,
            reason: 'Temporal runtime is not configured',
          },
          'dvt.object-file-postgres': {
            available: false,
            reason: 'Temporal runtime is not configured',
          },
          cost: {
            available: false,
            reason: 'Backend cost capability is not implemented yet',
          },
        },
      });
    } finally {
      await app.close();
    }
  });

  it('publishes object-file PostgreSQL availability from the Temporal adapter capability set', async () => {
    const app = Fastify({ logger: false });
    await app.register(capabilitiesRoutes, {
      prefix: '/',
      env: loadEnv({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
      }),
    });

    try {
      const response = await app.inject({ method: 'GET', url: '/capabilities' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        plugins: {
          'dvt.object-file-postgres': {
            available: true,
          },
        },
      });
    } finally {
      await app.close();
    }
  });

  it('publishes HTTP JSON availability from the Temporal adapter capability set', async () => {
    const app = Fastify({ logger: false });
    await app.register(capabilitiesRoutes, {
      prefix: '/',
      env: loadEnv({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        DVT_TEMPORAL_HTTP_JSON_ENABLED: 'true',
      }),
    });

    try {
      const response = await app.inject({ method: 'GET', url: '/capabilities' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        plugins: {
          'dvt.http-json': {
            available: true,
          },
        },
      });
    } finally {
      await app.close();
    }
  });
});
