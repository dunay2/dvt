import { LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import { resolveTemporalProviderAdapterCapabilities } from '../modules/providerAdapters/createTemporalProviderAdapterFactory.js';
import type { Env } from '../plugins/env.js';

const OBJECT_FILE_POSTGRES_PLUGIN_ID = 'dvt.object-file-postgres';

const CAPABILITIES_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiVersion: { type: 'string' },
    minFrontendVersion: { type: 'string' },
    plugins: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        properties: {
          available: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['available'],
      },
    },
  },
  required: ['apiVersion', 'minFrontendVersion', 'plugins'],
} as const;

export async function capabilitiesRoutes(app: FastifyInstance, opts: { env: Env }): Promise<void> {
  const temporalCapabilities = new Set(resolveTemporalProviderAdapterCapabilities(opts.env));
  const objectFilePostgresAvailable = temporalCapabilities.has(
    LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY
  );

  app.get(
    '/capabilities',
    {
      schema: {
        response: {
          200: CAPABILITIES_RESPONSE_SCHEMA,
        },
      },
    },
    async () => ({
      apiVersion: '0.1.0',
      minFrontendVersion: '0.1.0',
      plugins: {
        [OBJECT_FILE_POSTGRES_PLUGIN_ID]: {
          available: objectFilePostgresAvailable,
          ...(objectFilePostgresAvailable
            ? {}
            : {
                reason: opts.env.TEMPORAL_ADDRESS
                  ? 'Temporal object-file PostgreSQL execution is disabled'
                  : 'Temporal runtime is not configured',
              }),
        },
        cost: {
          available: false,
          reason: 'Backend cost capability is not implemented yet',
        },
      },
    })
  );
}
