import type { FastifyInstance } from 'fastify';

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

export async function capabilitiesRoutes(app: FastifyInstance): Promise<void> {
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
        cost: {
          available: false,
          reason: 'Backend cost capability is not implemented yet',
        },
      },
    })
  );
}
