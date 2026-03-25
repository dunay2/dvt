/**
 * @file packages/@dvt/engine/test/contracts/capabilities.contract.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline PR-3: Capability gating and compatibility matrix
 *
 * Contract tests for IProviderAdapter.capabilities() and engine enforcement.
 *
 * Scope:
 *   - Engine rejects runs when adapter does not support required capabilities.
 *   - Engine accepts runs when adapter supports all required capabilities.
 *   - Engine skips validation when PlanRef has no requiresCapabilities.
 *   - Engine skips validation when adapter omits capabilities() (graceful degradation).
 *   - Matrix drift gate: adapter.capabilities() must match adapters.capabilities.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { EngineRunRef, PlanRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import { ConductorAdapterStub } from '../../src/adapters/conductor/ConductorAdapterStub.js';
import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { sha256Hex } from '../../src/utils/sha256.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATRIX_PATH_CANDIDATES = [
  path.resolve(
    __dirname,
    '../../../../../docs/architecture/engine/contracts/capabilities/adapters.capabilities.json'
  ),
  path.resolve(__dirname, '../../../../../specs/contracts/capabilities/adapters.capabilities.json'),
];

function resolveMatrixPath(): string {
  const found = MATRIX_PATH_CANDIDATES.find((p) => fs.existsSync(p));
  return found ?? MATRIX_PATH_CANDIDATES[0]!;
}

const MATRIX_PATH = resolveMatrixPath();

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function makePlanRef(requiresCapabilities?: string[]): PlanRef {
  const body = JSON.stringify({ id: 'cap-test' });
  const bytes = utf8(body);
  return {
    uri: 'https://plans.example.com/cap-test.json',
    sha256: sha256Hex(bytes),
    schemaVersion: 'v1.2',
    planId: 'cap-test',
    planVersion: '2.3',
    sizeBytes: bytes.byteLength,
    ...(requiresCapabilities === undefined ? {} : { requiresCapabilities }),
  };
}

function makeCtx(runId: string): {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: 'mock';
} {
  return {
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    runId,
    targetAdapter: 'mock' as const,
  };
}

function createEngine(adapter?: IProviderAdapter): { engine: WorkflowEngine; mock: MockAdapter } {
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();

  const mock = new MockAdapter({ stateStore: store, projector });
  const effective = adapter ?? mock;

  const engine = new WorkflowEngine({
    stateStoreRead: store,
    stateStoreWrite: store,

    projector,
    idempotency: new IdempotencyKeyBuilder(),
    clock: new SequenceClock('2026-02-23T00:00:00.000Z'),
    policy: new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    intentStore: new InMemoryStartRunIntentStore(),
    observability: createNoopObservability(),
    adapters: new Map<EngineRunRef['provider'], IProviderAdapter>([['mock', effective]]),
  });

  return { engine, mock };
}

// ─── Engine capability gate ───────────────────────────────────────────────────

describe('capability gate — engine enforces requiresCapabilities', () => {
  it('accepts a run when PlanRef has no requiresCapabilities', async () => {
    const { engine } = createEngine();
    await expect(engine.startRun(makePlanRef(), makeCtx('cap-none-1'))).resolves.toMatchObject({
      provider: 'mock',
    });
  });

  it('accepts a run when PlanRef.requiresCapabilities is empty', async () => {
    const { engine } = createEngine();
    await expect(engine.startRun(makePlanRef([]), makeCtx('cap-empty-1'))).resolves.toMatchObject({
      provider: 'mock',
    });
  });

  it('accepts a run when adapter supports all required capabilities', async () => {
    const { engine } = createEngine();
    await expect(
      engine.startRun(
        makePlanRef(['basic-execution', 'workflow.fan.parallel']),
        makeCtx('cap-ok-1')
      )
    ).resolves.toMatchObject({ provider: 'mock' });
  });

  it('rejects with CAPABILITIES_NOT_SUPPORTED when adapter lacks a required capability', async () => {
    const { engine } = createEngine();
    await expect(
      engine.startRun(makePlanRef(['signal.pause.emulated']), makeCtx('cap-bad-1'))
    ).rejects.toMatchObject({ code: 'CAPABILITIES_NOT_SUPPORTED' });
  });

  it('error message names the unsupported capability and adapter', async () => {
    const { engine } = createEngine();
    const err = await engine
      .startRun(makePlanRef(['query.workflow.state']), makeCtx('cap-bad-2'))
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'CAPABILITIES_NOT_SUPPORTED' });
    expect((err as Error).message).toContain('query.workflow.state');
    expect((err as Error).message).toContain("adapter 'mock'");
  });

  it('skips validation when adapter omits capabilities() (graceful degradation)', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const base = new MockAdapter({ stateStore: store, projector });
    // Build an adapter that explicitly omits the capabilities() method.
    const noCapAdapter: IProviderAdapter = {
      provider: 'mock',
      startRun: base.startRun.bind(base),
      cancelRun: base.cancelRun.bind(base),
      getRunStatus: base.getRunStatus.bind(base),
      signal: base.signal.bind(base),
      // capabilities intentionally absent
    };
    const { engine } = createEngine(noCapAdapter);
    // Engine should skip the capability check and proceed normally.
    await expect(
      engine.startRun(makePlanRef(['any.capability.whatsoever']), makeCtx('cap-skip-1'))
    ).resolves.toMatchObject({ provider: 'mock' });
  });
});

// ─── Adapter capabilities() declarations ─────────────────────────────────────

describe('adapter capabilities() declarations', () => {
  it('MockAdapter.capabilities() includes basic-execution', () => {
    const store = new InMemoryTxStore();
    const mock = new MockAdapter({ stateStore: store, projector: new SnapshotProjector() });
    expect(mock.capabilities()).toContain('basic-execution');
  });

  it('MockAdapter.capabilities() includes workflow.fan.parallel', () => {
    const store = new InMemoryTxStore();
    const mock = new MockAdapter({ stateStore: store, projector: new SnapshotProjector() });
    expect(mock.capabilities()).toContain('workflow.fan.parallel');
  });

  it('ConductorAdapterStub.capabilities() includes basic-execution', () => {
    expect(new ConductorAdapterStub().capabilities()).toContain('basic-execution');
  });

  it('ConductorAdapterStub.capabilities() does NOT include signal.pause.native', () => {
    expect(new ConductorAdapterStub().capabilities()).not.toContain('signal.pause.native');
  });
});

// ─── Matrix drift gate (CI) ───────────────────────────────────────────────────

describe('adapters.capabilities.json matrix drift gate', () => {
  interface CapabilityMatrix {
    adapters: Record<string, { capabilities: string[] }>;
  }

  function loadMatrix(): CapabilityMatrix {
    return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')) as CapabilityMatrix;
  }

  it('matrix file exists at expected path', () => {
    expect(fs.existsSync(MATRIX_PATH)).toBe(true);
  });

  it('mock adapter capabilities match the matrix', () => {
    const store = new InMemoryTxStore();
    const mock = new MockAdapter({ stateStore: store, projector: new SnapshotProjector() });
    const declared = [...mock.capabilities()].sort((a, b) => a.localeCompare(b));
    const matrix =
      loadMatrix()
        .adapters['mock']?.capabilities.slice()
        .sort((a, b) => a.localeCompare(b)) ?? [];
    expect(declared).toEqual(matrix);
  });

  it('conductor adapter capabilities match the matrix', () => {
    const declared = [...new ConductorAdapterStub().capabilities()].sort((a, b) =>
      a.localeCompare(b)
    );
    const matrix =
      loadMatrix()
        .adapters['conductor']?.capabilities.slice()
        .sort((a, b) => a.localeCompare(b)) ?? [];
    expect(declared).toEqual(matrix);
  });
});
