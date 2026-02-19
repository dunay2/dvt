import type { FastifyBaseLogger } from 'fastify';
import pino from 'pino';
import type { Env } from './env.js';

export function buildLoggerOptions(env: Env) {
  return {
    level: env.LOG_LEVEL,
    base: { service: env.SERVICE_NAME },
  };
}
