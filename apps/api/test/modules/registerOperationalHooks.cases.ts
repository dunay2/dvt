import type { FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';

import { registerOperationalHooks } from '../../src/modules/registerOperationalHooks.js';

/**
 * Operational-hook cases.
 * The module under test is stateless, so a focused function suite documents the
 * lifecycle contract more clearly than a catch-all `modules.test.ts`.
 */
export function describeRegisterOperationalHooksCases(): void {
  describe('registerOperationalHooks', () => {
    it('wires migrate and close hooks', async () => {
      const hooks = new Map<string, () => Promise<void>>();
      let migrateCalls = 0;
      let closeCalls = 0;

      const fakeApp = {
        addHook(name: string, hook: () => Promise<void>) {
          hooks.set(name, hook);
        },
      } as unknown as FastifyInstance;

      registerOperationalHooks(fakeApp, {
        facade: {} as never,
        authenticator: {} as never,
        authorizer: {} as never,
        engine: {} as never,
        runEnrichmentService: {} as never,
        runHealthService: {} as never,
        adapters: new Map(),
        startRunTargetAdapterRegistry: {
          isSupported(_value: string): _value is 'mock' | 'temporal' {
            return false;
          },
          listSupported(): ReadonlyArray<'mock' | 'temporal'> {
            return [];
          },
        },
        stateStore: {
          read: {} as never,
          write: {} as never,
          maintenance: {} as never,
          snapshotStaleness: {} as never,
        },
        planner: {} as never,
        planCompilePlanner: {} as never,
        planStore: {} as never,
        planValidator: {} as never,
        executablePlanResolver: { fetch: async () => ({}) } as never,
        workspaceGraphDraftStore: {
          async migrate() {},
          async close() {},
          async read() {
            return null;
          },
          async save() {
            return { kind: 'idempotency_mismatch' as const };
          },
        },
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
      });

      await hooks.get('onReady')?.();
      await hooks.get('onClose')?.();

      expect(migrateCalls).toBe(1);
      expect(closeCalls).toBe(1);
    });
  });
}
