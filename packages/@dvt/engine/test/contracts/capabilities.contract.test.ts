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
 *   - Engine skips validation when executionPolicy has no requiresCapabilities.
 *   - Engine skips validation when adapter omits capabilities() (graceful degradation).
 *   - Matrix drift gate: adapter.capabilities() must match adapters.capabilities.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  type PlanRef,
  type RunExecutionPolicy,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import { ConductorAdapterStub } from '../../src/adapters/conductor/ConductorAdapterStub.js';
import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import { ENGINE_ERROR_MESSAGE_KEY } from '../../src/contracts/errors.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import {
  createWorkflowEngineFixture,
  makeDefaultExecutionPlan,
  makePlanFetcherForPlan,
  makePlanRefForPlan,
  makeProviderMap,
} from '../helpers/workflowEngine.fixture.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATRIX_PATH_CANDIDATES = [
  path.resolve(
    __dirname,
    '../../../../../docs/architecture/components/engine/contracts/capabilities/adapters.capabilities.json'
  ),
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

function makePlanRef(): PlanRef {
  return makePlanRefForPlan(CAPABILITY_PLAN, 'https://plans.example.com/cap-test.json');
}

const CAPABILITY_PLAN = makeDefaultExecutionPlan();

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

function createEngine(
  adapter?: IProviderAdapter,
  executionPolicy: RunExecutionPolicy = {}
): {
  engine: ReturnType<typeof createWorkflowEngineFixture>['engine'];
  mock: MockAdapter;
} {
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const clock = { nowIsoUtc: () => '2026-02-12T00:00:00.000Z' };

  const mock = new MockAdapter({ stateStore: store, projector, clock });
  const effective = adapter ?? mock;

  const { engine } = createWorkflowEngineFixture({
    stateStore: store,
    projector,
    observability: createNoopObservability(),
    adapters: makeProviderMap(effective),
    planFetcher: makePlanFetcherForPlan(CAPABILITY_PLAN, executionPolicy),
  });

  return { engine, mock };
}

// ─── Engine capability gate ───────────────────────────────────────────────────

describe('capability gate — engine enforces requiresCapabilities', () => {
  it('accepts a run when executionPolicy has no requiresCapabilities', async () => {
    const { engine } = createEngine();
    await expect(engine.startRun(makePlanRef(), makeCtx('cap-none-1'))).resolves.toMatchObject({
      provider: 'mock',
    });
  });

  it('accepts a run when executionPolicy.requiresCapabilities is empty', async () => {
    const { engine } = createEngine(undefined, { requiresCapabilities: [] });
    await expect(engine.startRun(makePlanRef(), makeCtx('cap-empty-1'))).resolves.toMatchObject({
      provider: 'mock',
    });
  });

  it('accepts a run when adapter supports all required capabilities', async () => {
    const { engine } = createEngine(undefined, {
      requiresCapabilities: ['basic-execution', 'workflow.fan.parallel'],
    });
    await expect(engine.startRun(makePlanRef(), makeCtx('cap-ok-1'))).resolves.toMatchObject({
      provider: 'mock',
    });
  });

  it('rejects with CAPABILITIES_NOT_SUPPORTED when adapter lacks a required capability', async () => {
    const { engine } = createEngine(undefined, {
      requiresCapabilities: ['signal.pause.emulated'],
    });
    await expect(engine.startRun(makePlanRef(), makeCtx('cap-bad-1'))).rejects.toMatchObject({
      code: 'CAPABILITIES_NOT_SUPPORTED',
    });
  });

  it('exposes i18n key and params for unsupported capability errors', async () => {
    const { engine } = createEngine(undefined, {
      requiresCapabilities: ['query.workflow.state'],
    });
    const err = await engine.startRun(makePlanRef(), makeCtx('cap-bad-2')).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'CAPABILITIES_NOT_SUPPORTED' });
    expect((err as { messageKey?: string }).messageKey).toBe(
      ENGINE_ERROR_MESSAGE_KEY.CAPABILITIES_NOT_SUPPORTED
    );
    expect((err as { messageParams?: Record<string, unknown> }).messageParams).toMatchObject({
      capabilities: ['query.workflow.state'],
      provider: 'mock',
    });
  });

  it('skips validation when adapter omits capabilities() (graceful degradation)', async () => {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const clock = { nowIsoUtc: () => '2026-02-12T00:00:00.000Z' };
    const base = new MockAdapter({ stateStore: store, projector, clock });
    // Build an adapter that explicitly omits the capabilities() method.
    const noCapAdapter: IProviderAdapter = {
      provider: 'mock',
      startRun: base.startRun.bind(base),
      cancelRun: base.cancelRun.bind(base),
      getRunStatus: base.getRunStatus.bind(base),
      signal: base.signal.bind(base),
      signalSemanticsVersions: () => [CURRENT_SIGNAL_SEMANTICS_VERSION],
      // capabilities intentionally absent
    };
    const { engine } = createEngine(noCapAdapter, {
      requiresCapabilities: ['any.capability.whatsoever'],
    });
    // Engine should skip the capability check and proceed normally.
    await expect(engine.startRun(makePlanRef(), makeCtx('cap-skip-1'))).resolves.toMatchObject({
      provider: 'mock',
    });
  });
});

// ─── Adapter capabilities() declarations ─────────────────────────────────────

describe('adapter capabilities() declarations', () => {
  it('MockAdapter.capabilities() includes basic-execution', () => {
    const store = new InMemoryTxStore();
    const mock = new MockAdapter({
      stateStore: store,
      projector: new SnapshotProjector(),
      clock: { nowIsoUtc: () => '2026-02-12T00:00:00.000Z' },
    });
    expect(mock.capabilities()).toContain('basic-execution');
  });

  it('MockAdapter.capabilities() includes workflow.fan.parallel', () => {
    const store = new InMemoryTxStore();
    const mock = new MockAdapter({
      stateStore: store,
      projector: new SnapshotProjector(),
      clock: { nowIsoUtc: () => '2026-02-12T00:00:00.000Z' },
    });
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
    const mock = new MockAdapter({
      stateStore: store,
      projector: new SnapshotProjector(),
      clock: { nowIsoUtc: () => '2026-02-12T00:00:00.000Z' },
    });
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
