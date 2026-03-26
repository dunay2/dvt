import { getPgPool } from '../db/pool.js';

export const READINESS_PROBE_STATUS = Object.freeze({
  ready: 'ready',
  unavailable: 'unavailable',
  notConfigured: 'not_configured',
} as const);

export const HEALTH_READINESS_EVENTS = Object.freeze({
  databaseProbeFailed: 'api.health.readiness.database_probe_failed',
} as const);

export type ReadinessProbeStatus =
  (typeof READINESS_PROBE_STATUS)[keyof typeof READINESS_PROBE_STATUS];

type RuntimeAdaptersReadinessProbe = () => ReadinessProbeStatus | Promise<ReadinessProbeStatus>;
type DatabaseReadinessProbe = (databaseUrl: string) => Promise<ReadinessProbeStatus>;

export type HealthReadinessPorts = {
  checkDatabaseReady: () => Promise<ReadinessProbeStatus>;
  checkRuntimeAdaptersReady: () => Promise<ReadinessProbeStatus>;
};

type CreateHealthReadinessPortsInput = {
  databaseUrl: string | undefined;
  checkRuntimeAdaptersReady: RuntimeAdaptersReadinessProbe;
  probeDatabaseReadiness?: DatabaseReadinessProbe;
  onDatabaseProbeFailure?: (error: unknown) => void;
};

async function probeDatabaseReadiness(databaseUrl: string): Promise<ReadinessProbeStatus> {
  const result = await getPgPool(databaseUrl).query('SELECT 1 AS ok');
  return result.rows?.[0]?.ok === 1
    ? READINESS_PROBE_STATUS.ready
    : READINESS_PROBE_STATUS.unavailable;
}

export function createHealthReadinessPorts(
  input: CreateHealthReadinessPortsInput
): HealthReadinessPorts {
  return {
    checkDatabaseReady: async () => {
      if (!input.databaseUrl) {
        return READINESS_PROBE_STATUS.notConfigured;
      }
      try {
        return await (input.probeDatabaseReadiness ?? probeDatabaseReadiness)(input.databaseUrl);
      } catch (error) {
        input.onDatabaseProbeFailure?.(error);
        return READINESS_PROBE_STATUS.unavailable;
      }
    },
    checkRuntimeAdaptersReady: async () => input.checkRuntimeAdaptersReady(),
  };
}
