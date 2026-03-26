import { getPgPool } from '../db/pool.js';
import type { Env } from '../plugins/env.js';

type RuntimeAdaptersReadinessProbe = () => boolean | Promise<boolean>;

export type HealthReadinessPorts = {
  checkDatabaseReady: () => Promise<boolean>;
  checkRuntimeAdaptersReady: () => Promise<boolean>;
};

export function createHealthReadinessPorts(
  env: Env,
  checkRuntimeAdaptersReady: RuntimeAdaptersReadinessProbe
): HealthReadinessPorts {
  return {
    checkDatabaseReady: async () => {
      if (!env.DATABASE_URL) {
        return true;
      }
      try {
        const result = await getPgPool(env.DATABASE_URL).query('SELECT 1 AS ok');
        return result.rows?.[0]?.ok === 1;
      } catch {
        return false;
      }
    },
    checkRuntimeAdaptersReady: async () => checkRuntimeAdaptersReady(),
  };
}
