import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { capabilitiesRoutes } from '../../../src/routes/capabilities.js';

describe('capabilitiesRoutes', () => {
  it('returns the public capability payload expected by the frontend shell', async () => {
    const app = Fastify({ logger: false });
    await app.register(capabilitiesRoutes, { prefix: '/' });

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
});
