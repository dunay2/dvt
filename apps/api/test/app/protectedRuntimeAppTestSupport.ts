import { vi } from 'vitest';

import * as pgPool from '../../src/db/pool.js';
import { EmbeddedAccessDecisionService } from '../../src/infrastructure/auth/embeddedAccessDecisionService.js';
import { EmbeddedProjectOnboardingRepository } from '../../src/infrastructure/auth/embeddedProjectOnboardingRepository.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';
import { PostgresDbtProjectImportProcessStore } from '../../src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.js';
import { PostgresWorkspaceGraphDraftStore } from '../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import { EmbeddedWorkspacePluginCatalogRepository } from '../../src/infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.js';

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
  readonly projectOnboarding: number;
  readonly workspacePluginCatalog: number;
  readonly planStore: number;
  readonly stateStore: number;
  readonly intentStore: number;
  readonly workspaceGraphDraftStore: number;
  readonly canvasAuthoringAuthorityStore: number;
  readonly dbtProjectImportProcessStore: number;
};

function patchProtectedRuntimeMigrations(): ProtectedRuntimeMigrationPatch {
  const originalAccessDecisionMigrate = EmbeddedAccessDecisionService.prototype.migrate;
  const originalProjectOnboardingMigrate = EmbeddedProjectOnboardingRepository.prototype.migrate;
  const originalWorkspacePluginCatalogMigrate =
    EmbeddedWorkspacePluginCatalogRepository.prototype.migrate;
  const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
  const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
  const originalWorkspaceGraphDraftStoreMigrate =
    PostgresWorkspaceGraphDraftStore.prototype.migrate;
  const originalCanvasAuthoringAuthorityStoreMigrate =
    PostgresCanvasAuthoringAuthorityStore.prototype.migrate;
  const originalDbtProjectImportProcessStoreMigrate =
    PostgresDbtProjectImportProcessStore.prototype.migrate;

  EmbeddedAccessDecisionService.prototype.migrate = async function migrate() {};
  EmbeddedProjectOnboardingRepository.prototype.migrate = async function migrate() {};
  EmbeddedWorkspacePluginCatalogRepository.prototype.migrate = async function migrate() {};
  PostgresPlanStore.prototype.migrate = async function migrate() {};
  PostgresStateStoreAdapter.prototype.migrate = async function migrate() {};
  PostgresStartRunIntentStore.prototype.migrate = async function migrate() {};
  PostgresWorkspaceGraphDraftStore.prototype.migrate = async function migrate() {};
  PostgresCanvasAuthoringAuthorityStore.prototype.migrate = async function migrate() {};
  PostgresDbtProjectImportProcessStore.prototype.migrate = async function migrate() {};

  return {
    restore() {
      EmbeddedAccessDecisionService.prototype.migrate = originalAccessDecisionMigrate;
      EmbeddedProjectOnboardingRepository.prototype.migrate = originalProjectOnboardingMigrate;
      EmbeddedWorkspacePluginCatalogRepository.prototype.migrate =
        originalWorkspacePluginCatalogMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      PostgresWorkspaceGraphDraftStore.prototype.migrate = originalWorkspaceGraphDraftStoreMigrate;
      PostgresCanvasAuthoringAuthorityStore.prototype.migrate =
        originalCanvasAuthoringAuthorityStoreMigrate;
      PostgresDbtProjectImportProcessStore.prototype.migrate =
        originalDbtProjectImportProcessStoreMigrate;
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
  const originalProjectOnboardingMigrate = EmbeddedProjectOnboardingRepository.prototype.migrate;
  const originalWorkspacePluginCatalogMigrate =
    EmbeddedWorkspacePluginCatalogRepository.prototype.migrate;
  const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
  const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
  const originalWorkspaceGraphDraftStoreMigrate =
    PostgresWorkspaceGraphDraftStore.prototype.migrate;
  const originalCanvasAuthoringAuthorityStoreMigrate =
    PostgresCanvasAuthoringAuthorityStore.prototype.migrate;
  const originalDbtProjectImportProcessStoreMigrate =
    PostgresDbtProjectImportProcessStore.prototype.migrate;
  const calls = {
    accessDecision: 0,
    projectOnboarding: 0,
    workspacePluginCatalog: 0,
    planStore: 0,
    stateStore: 0,
    intentStore: 0,
    workspaceGraphDraftStore: 0,
    canvasAuthoringAuthorityStore: 0,
    dbtProjectImportProcessStore: 0,
  };

  EmbeddedAccessDecisionService.prototype.migrate = async function migrate() {
    calls.accessDecision += 1;
  };
  EmbeddedProjectOnboardingRepository.prototype.migrate = async function migrate() {
    calls.projectOnboarding += 1;
  };
  EmbeddedWorkspacePluginCatalogRepository.prototype.migrate = async function migrate() {
    calls.workspacePluginCatalog += 1;
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
  PostgresCanvasAuthoringAuthorityStore.prototype.migrate = async function migrate() {
    calls.canvasAuthoringAuthorityStore += 1;
  };
  PostgresDbtProjectImportProcessStore.prototype.migrate = async function migrate() {
    calls.dbtProjectImportProcessStore += 1;
  };

  try {
    return await run(() => ({ ...calls }));
  } finally {
    EmbeddedAccessDecisionService.prototype.migrate = originalAccessDecisionMigrate;
    EmbeddedProjectOnboardingRepository.prototype.migrate = originalProjectOnboardingMigrate;
    EmbeddedWorkspacePluginCatalogRepository.prototype.migrate =
      originalWorkspacePluginCatalogMigrate;
    PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
    PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
    PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
    PostgresWorkspaceGraphDraftStore.prototype.migrate = originalWorkspaceGraphDraftStoreMigrate;
    PostgresCanvasAuthoringAuthorityStore.prototype.migrate =
      originalCanvasAuthoringAuthorityStoreMigrate;
    PostgresDbtProjectImportProcessStore.prototype.migrate =
      originalDbtProjectImportProcessStoreMigrate;
  }
}
