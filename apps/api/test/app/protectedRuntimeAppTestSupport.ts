import { vi } from 'vitest';

import * as pgPool from '../../src/db/pool.js';
import { EmbeddedAccessDecisionService } from '../../src/infrastructure/auth/embeddedAccessDecisionService.js';
import { PostgresWorkspaceGraphDraftStore } from '../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';

import {
  BASE_APP_ENV,
  DATABASE_APP_ENV,
  OIDC_APP_ENV,
  TEMPORAL_APP_ENV,
  type AppEnvPatch,
  type BuiltApp,
  mergeEnv,
  withAppEnv,
} from './appEnvTestSupport.js';

const adapterPostgres = await import('@dvt/adapter-postgres');
const { PostgresPlanStore, PostgresStartRunIntentStore, PostgresStateStoreAdapter } =
  adapterPostgres;

type ProtectedRuntimeMigrationPatch = {
  restore(): void;
};

export type ProtectedRuntimeMigrationCalls = {
  readonly accessDecision: number;
  readonly planStore: number;
  readonly stateStore: number;
  readonly intentStore: number;
  readonly workspaceGraphDraftStore: number;
};

function patchProtectedRuntimeMigrations(): ProtectedRuntimeMigrationPatch {
  const originalAccessDecisionMigrate = EmbeddedAccessDecisionService.prototype.migrate;
  const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
  const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
  const originalWorkspaceGraphDraftStoreMigrate =
    PostgresWorkspaceGraphDraftStore.prototype.migrate;

  EmbeddedAccessDecisionService.prototype.migrate = async function migrate() {};
  PostgresPlanStore.prototype.migrate = async function migrate() {};
  PostgresStateStoreAdapter.prototype.migrate = async function migrate() {};
  PostgresStartRunIntentStore.prototype.migrate = async function migrate() {};
  PostgresWorkspaceGraphDraftStore.prototype.migrate = async function migrate() {};

  return {
    restore() {
      EmbeddedAccessDecisionService.prototype.migrate = originalAccessDecisionMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      PostgresWorkspaceGraphDraftStore.prototype.migrate = originalWorkspaceGraphDraftStoreMigrate;
    },
  };
}

function mockPgPool(queryMock = vi.fn(async () => ({ rows: [{ ok: 1 }] }))): {
  mockRestore(): void;
} {
  return vi.spyOn(pgPool, 'getPgPool').mockReturnValue({
    query: queryMock,
    end: vi.fn(async () => undefined),
  } as never);
}

export type PgQueryMock = Parameters<typeof mockPgPool>[0];

export async function withMockedPgPool<T>(
  queryMock: PgQueryMock,
  run: () => Promise<T>
): Promise<T> {
  const getPgPoolSpy = mockPgPool(queryMock);

  try {
    return await run();
  } finally {
    getPgPoolSpy.mockRestore();
  }
}

export async function withProtectedRuntimeApp<T>(
  run: (built: BuiltApp) => Promise<T>,
  options?: {
    readonly env?: AppEnvPatch;
    readonly queryMock?: PgQueryMock;
  }
): Promise<T> {
  const migrations = patchProtectedRuntimeMigrations();
  const getPgPoolSpy = mockPgPool(options?.queryMock);

  try {
    return await withAppEnv(
      mergeEnv(BASE_APP_ENV, DATABASE_APP_ENV, OIDC_APP_ENV, TEMPORAL_APP_ENV, options?.env ?? {}),
      run
    );
  } finally {
    getPgPoolSpy.mockRestore();
    migrations.restore();
  }
}

export async function withCapturedProtectedRuntimeMigrations<T>(
  run: (calls: () => ProtectedRuntimeMigrationCalls) => Promise<T>
): Promise<T> {
  const originalAccessDecisionMigrate = EmbeddedAccessDecisionService.prototype.migrate;
  const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
  const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
  const originalWorkspaceGraphDraftStoreMigrate =
    PostgresWorkspaceGraphDraftStore.prototype.migrate;
  const calls = {
    accessDecision: 0,
    planStore: 0,
    stateStore: 0,
    intentStore: 0,
    workspaceGraphDraftStore: 0,
  };

  EmbeddedAccessDecisionService.prototype.migrate = async function migrate() {
    calls.accessDecision += 1;
  };
  PostgresPlanStore.prototype.migrate = async function migrate() {
    calls.planStore += 1;
  };
  PostgresStateStoreAdapter.prototype.migrate = async function migrate() {
    calls.stateStore += 1;
  };
  PostgresStartRunIntentStore.prototype.migrate = async function migrate() {
    calls.intentStore += 1;
  };
  PostgresWorkspaceGraphDraftStore.prototype.migrate = async function migrate() {
    calls.workspaceGraphDraftStore += 1;
  };

  try {
    return await run(() => ({ ...calls }));
  } finally {
    EmbeddedAccessDecisionService.prototype.migrate = originalAccessDecisionMigrate;
    PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
    PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
    PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
    PostgresWorkspaceGraphDraftStore.prototype.migrate = originalWorkspaceGraphDraftStoreMigrate;
  }
}
