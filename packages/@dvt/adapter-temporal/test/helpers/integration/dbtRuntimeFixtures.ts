import type { IRunExecutionContextReader } from '@dvt/artifacts';
import {
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  type PlanRef,
  type ResolvedRunContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256Hex } from '@dvt/crypto';

import type { DbtPluginRunner } from '../../../src/activities/stepActivities.js';

import type { TestOutbox, TestStateStore } from './runtimeState.js';
import { createActivityDeps } from './testActivities.js';

const DEFAULT_DBT_PLUGIN_RUNNER: DbtPluginRunner = {
  async execute(input) {
    return { stepId: input.step.stepId, status: 'COMPLETED' };
  },
};

interface DbtRunExecutionBinding {
  ctx: ResolvedRunContext;
  planRef: PlanRef;
  planBytes: Uint8Array;
}

interface RegisteredDbtExecutionArtifacts {
  readonly planBytesByRefKey: ReadonlyMap<string, Uint8Array>;
  readonly runExecutionContextsByRefKey: ReadonlyMap<string, RunExecutionContext>;
}

export function createDbtRunExecutionContext(
  ctx: ResolvedRunContext,
  planRef: PlanRef
): RunExecutionContext {
  return parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    planSha256: planRef.sha256,
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    environmentId: ctx.environmentId,
    targetAdapter: ctx.targetAdapter,
    createdAtIso: '2026-04-14T00:00:00.000Z',
    createdBy: 'integration-test',
    pluginContexts: {
      dbt: {
        projectBundleRef: `artifacts://runs/${ctx.runId}/project.tgz`,
        targetProfile: 'dbt-dev',
      },
    },
  });
}

export function createDbtRunExecutionContextRef(
  ctx: ResolvedRunContext,
  planRef: PlanRef
): ReturnType<typeof parseRunExecutionContextRef> {
  const runExecutionContext = createDbtRunExecutionContext(ctx, planRef);
  return parseRunExecutionContextRef({
    uri: `s3://bucket/runctx/${ctx.runId}/${planRef.planId}.json`,
    sha256: sha256Hex(jcsCanonicalize(runExecutionContext)),
    schemaVersion: runExecutionContext.schemaVersion,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    ...(runExecutionContext.pluginCompatibilityFingerprint === undefined
      ? {}
      : { pluginCompatibilityFingerprint: runExecutionContext.pluginCompatibilityFingerprint }),
  });
}

export function withDbtRunExecutionContext(
  ctx: ResolvedRunContext,
  planRef: PlanRef
): ResolvedRunContext {
  return {
    ...ctx,
    runExecutionContextRef: createDbtRunExecutionContextRef(ctx, planRef),
  };
}

export function createDbtActivityDeps(
  store: TestStateStore,
  outbox: TestOutbox,
  planBytes: Uint8Array,
  ctx: ResolvedRunContext,
  planRef: PlanRef,
  dbtPluginRunner: DbtPluginRunner = DEFAULT_DBT_PLUGIN_RUNNER
): ReturnType<typeof createActivityDeps> {
  return createRegisteredDbtActivityDeps(
    store,
    outbox,
    [
      {
        ctx,
        planRef,
        planBytes,
      },
    ],
    dbtPluginRunner
  );
}

export function createMultiRunDbtActivityDeps(
  store: TestStateStore,
  outbox: TestOutbox,
  bindings: readonly DbtRunExecutionBinding[],
  dbtPluginRunner: DbtPluginRunner = DEFAULT_DBT_PLUGIN_RUNNER
): ReturnType<typeof createActivityDeps> {
  return createRegisteredDbtActivityDeps(
    store,
    outbox,
    assertMultiRunBindings(bindings),
    dbtPluginRunner
  );
}

function createRegisteredDbtActivityDeps(
  store: TestStateStore,
  outbox: TestOutbox,
  bindings: readonly DbtRunExecutionBinding[],
  dbtPluginRunner: DbtPluginRunner
): ReturnType<typeof createActivityDeps> {
  const registry = registerBindings(bindings);

  return createActivityDeps(store, outbox, bindings[0].planBytes, {
    fetchPlanBytes: createRegisteredPlanBytesFetcher(registry.planBytesByRefKey),
    runExecutionContextReader: createRegisteredRunExecutionContextReader(
      registry.runExecutionContextsByRefKey
    ),
    dbtPluginRunner,
  });
}

function assertMultiRunBindings(
  bindings: readonly DbtRunExecutionBinding[]
): readonly DbtRunExecutionBinding[] {
  if (bindings.length === 0) {
    throw new TypeError('DBT_MULTI_RUN_BINDINGS_REQUIRED');
  }

  return bindings.map((binding, index) => {
    if (!(binding.planBytes instanceof Uint8Array)) {
      throw new TypeError(`DBT_MULTI_RUN_PLAN_BYTES_REQUIRED:${index}`);
    }

    return binding;
  });
}

function resolveRegisteredRunExecutionContextRef(
  binding: DbtRunExecutionBinding
): ReturnType<typeof parseRunExecutionContextRef> {
  const expectedRef = createDbtRunExecutionContextRef(binding.ctx, binding.planRef);
  const registeredRef = binding.ctx.runExecutionContextRef;

  if (registeredRef === undefined) {
    return expectedRef;
  }

  if (toRunExecutionContextRefKey(registeredRef) !== toRunExecutionContextRefKey(expectedRef)) {
    throw new Error(
      `RUN_EXECUTION_CONTEXT_PLAN_REF_MISMATCH:${binding.ctx.runId}:${binding.planRef.planId}`
    );
  }

  return registeredRef;
}

function registerBindings(
  bindings: readonly DbtRunExecutionBinding[]
): RegisteredDbtExecutionArtifacts {
  const runExecutionContextsByRefKey = new Map<string, RunExecutionContext>();
  const planBytesByRefKey = new Map<string, Uint8Array>();

  for (const binding of bindings) {
    const ref = resolveRegisteredRunExecutionContextRef(binding);
    runExecutionContextsByRefKey.set(
      toRunExecutionContextRefKey(ref),
      createDbtRunExecutionContext(binding.ctx, binding.planRef)
    );
    planBytesByRefKey.set(toPlanRefKey(binding.planRef), binding.planBytes);
  }

  return {
    planBytesByRefKey,
    runExecutionContextsByRefKey,
  };
}

function createRegisteredPlanBytesFetcher(
  planBytesByRefKey: ReadonlyMap<string, Uint8Array>
): (requestedPlanRef: PlanRef) => Promise<Uint8Array> {
  return async (requestedPlanRef: PlanRef) => {
    return getRegisteredPlanBytesOrThrow(planBytesByRefKey, requestedPlanRef);
  };
}

function getRegisteredPlanBytesOrThrow(
  planBytesByRefKey: ReadonlyMap<string, Uint8Array>,
  requestedPlanRef: PlanRef
): Uint8Array {
  const registeredPlanBytes = planBytesByRefKey.get(toPlanRefKey(requestedPlanRef));
  if (registeredPlanBytes === undefined) {
    throw new Error(`PLAN_BYTES_NOT_REGISTERED:${requestedPlanRef.uri}`);
  }
  return registeredPlanBytes;
}

function createRegisteredRunExecutionContextReader(
  runExecutionContextsByRefKey: ReadonlyMap<string, RunExecutionContext>
): IRunExecutionContextReader {
  return {
    async resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext> {
      return getRegisteredRunExecutionContextOrThrow(runExecutionContextsByRefKey, ref);
    },
  };
}

function getRegisteredRunExecutionContextOrThrow(
  runExecutionContextsByRefKey: ReadonlyMap<string, RunExecutionContext>,
  ref: RunExecutionContextRef
): RunExecutionContext {
  const resolved = runExecutionContextsByRefKey.get(toRunExecutionContextRefKey(ref));
  if (resolved === undefined) {
    throw new Error(`RUN_EXECUTION_CONTEXT_NOT_REGISTERED:${ref.uri}`);
  }
  return resolved;
}

function toRunExecutionContextRefKey(ref: RunExecutionContextRef): string {
  return [
    ref.uri,
    ref.sha256,
    ref.schemaVersion,
    ref.planId,
    ref.planVersion,
    ref.pluginCompatibilityFingerprint ?? '',
  ].join('|');
}

function toPlanRefKey(ref: PlanRef): string {
  return [ref.uri, ref.sha256, ref.schemaVersion, ref.planId, ref.planVersion].join('|');
}
