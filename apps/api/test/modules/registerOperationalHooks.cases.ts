import type { FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';

import { registerOperationalHooks } from '../../src/modules/registerOperationalHooks.js';
import type { StateStoreRoleSource } from '../../src/modules/stateStoreRoles.js';
import { bindStateStoreRoles } from '../../src/modules/stateStoreRoles.js';
import type { ProtectedRuntimeModule } from '../../src/modules/types.js';

/**
 * Operational-hook cases.
 * The module under test is stateless, so a focused function suite documents the
 * lifecycle contract more clearly than a catch-all `modules.test.ts`.
 */
export function describeRegisterOperationalHooksCases(): void {
  describe('registerOperationalHooks', () => {
    it('wires migrate and close hooks', async () => {
      const app = createOperationalHookApp();
      const module = createProtectedRuntimeModuleHarness();

      registerOperationalHooks(app.fastify, module.runtime);

      await app.runHook('onReady');
      await app.runHook('onClose');

      expect(module.migrateCalls()).toBe(1);
      expect(module.closeCalls()).toBe(1);
    });
  });
}

function createOperationalHookApp(): {
  fastify: FastifyInstance;
  runHook(name: string): Promise<void>;
} {
  const hooks = new Map<string, () => Promise<void>>();
  const fastify = {
    addHook(name: string, hook: () => Promise<void>) {
      hooks.set(name, hook);
    },
  } as unknown as FastifyInstance;

  return {
    fastify,
    async runHook(name: string): Promise<void> {
      await hooks.get(name)?.();
    },
  };
}

function createStateStoreRoleSource(): StateStoreRoleSource {
  return {
    bootstrapRunTx: async () => null as never,
    appendAndEnqueueTx: async () => null as never,
    saveProviderRef: async () => null as never,
    reserveRetryAttempt: async () => null as never,
    getRunMetadataByRunId: async () => null,
    listEvents: async () => [],
    listRuns: async () => [],
    getSnapshot: async () => null,
    rebuildSnapshot: async () => null as never,
    isSnapshotStale: async () => false,
  };
}

function createWorkspaceGraphDraftStore(): ProtectedRuntimeModule['workspaceGraphDraftStore'] {
  return {
    async migrate() {},
    async close() {},
    async read() {
      return null;
    },
    async save() {
      return { kind: 'idempotency_mismatch' as const };
    },
  };
}

function createProtectedRuntimeModuleHarness(): {
  runtime: ProtectedRuntimeModule;
  migrateCalls(): number;
  closeCalls(): number;
} {
  let migrateCalls = 0;
  let closeCalls = 0;

  return {
    runtime: {
      facade: {} as never,
      authenticator: {} as never,
      authorizer: {} as never,
      engine: {} as never,
      runEnrichmentService: {} as never,
      runHealthService: {} as never,
      adapters: new Map(),
      startRunTargetAdapterRegistry: {
        isSupported(_value: string): _value is 'temporal' {
          return false;
        },
        listSupported(): ReadonlyArray<'temporal'> {
          return [];
        },
      },
      stateStore: bindStateStoreRoles(createStateStoreRoleSource()),
      planner: {} as never,
      planCompilePlanner: {} as never,
      planStore: {} as never,
      planValidator: {} as never,
      executablePlanResolver: { fetch: async () => ({}) } as never,
      workspaceContextQuery: {
        async getEffectiveWorkspaceContext() {
          return null;
        },
      },
      workspaceGraphDraftStore: createWorkspaceGraphDraftStore(),
      workspaceGraphDraftCapabilityService: {
        async authorize() {
          return {} as never;
        },
      } as never,
      getWorkspaceGraphDraftUseCase: {
        async execute() {
          return { kind: 'not_found' as const };
        },
      } as never,
      saveWorkspaceGraphDraftUseCase: {
        async execute() {
          return { kind: 'unsupported_schema_version' as const };
        },
      } as never,
      async migrate() {
        migrateCalls += 1;
      },
      async close() {
        closeCalls += 1;
      },
    },
    migrateCalls: () => migrateCalls,
    closeCalls: () => closeCalls,
  };
}
