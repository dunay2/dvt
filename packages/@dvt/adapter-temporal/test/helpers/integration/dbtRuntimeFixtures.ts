import type { IRunExecutionContextReader } from '@dvt/artifacts';
import {
  parseDbtPluginContext,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  type DbtPluginContext,
  type PlanRef,
  type ResolvedRunContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256Hex, sha256HexUtf8 } from '@dvt/crypto';

import {
  createDbtStepActivityRegistry,
  type DbtPluginRunner,
} from '../../../../temporal-dbt-plugin/src/index.js';
import { type StepActivityRegistry } from '../../../src/index.js';

import type { TestOutbox, TestStateStore } from './runtimeState.js';
import { createActivityDeps, type TestActivityDeps } from './testActivities.js';

const DEFAULT_DBT_PLUGIN_RUNNER: DbtPluginRunner = {
  async execute(input) {
    return { stepId: input.step.stepId, status: 'COMPLETED' };
  },
};

export interface DbtRunExecutionBinding {
  ctx: ResolvedRunContext;
  planRef: PlanRef;
  planBytes: Uint8Array;
}

export interface CreateDbtActivityDepsArgs {
  store: TestStateStore;
  outbox: TestOutbox;
  bindings: readonly DbtRunExecutionBinding[];
  dbtPluginRunner?: DbtPluginRunner;
}

export interface TestDbtActivityDeps extends TestActivityDeps {
  dbtPluginRunner: DbtPluginRunner;
  runExecutionContextReader: IRunExecutionContextReader;
  stepActivitiesByKind: StepActivityRegistry;
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
        credentialRef: 'env:DVT_TEST_DBT_PROFILES',
        projectBundleRef: {
          uri: `s3://bundle-bucket/tenants/${ctx.tenantId}/${sha256Hex(
            Buffer.from(
              `dbt-project-bundle:${ctx.runId}:${planRef.planId}:${planRef.planVersion}`,
              'utf8'
            )
          )}`,
          kind: 'dbt-project-bundle',
          sha256: sha256Hex(
            Buffer.from(
              `dbt-project-bundle:${ctx.runId}:${planRef.planId}:${planRef.planVersion}`,
              'utf8'
            )
          ),
          tenantId: ctx.tenantId,
        },
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
    sha256: sha256HexUtf8(jcsCanonicalize(runExecutionContext)),
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

export function resolveDbtPluginContext(
  runExecutionContext: RunExecutionContext
): DbtPluginContext {
  const dbtPluginContext = runExecutionContext.pluginContexts['dbt'];
  if (dbtPluginContext === undefined) {
    throw new Error('RUN_EXECUTION_CONTEXT_DBT_PLUGIN_CONTEXT_REQUIRED');
  }
  return parseDbtPluginContext(dbtPluginContext);
}

export function createDbtActivityDeps(args: CreateDbtActivityDepsArgs): TestDbtActivityDeps {
  const bindings = assertDbtBindings(args.bindings);

  return createRegisteredDbtActivityDeps(
    args.store,
    args.outbox,
    bindings,
    args.dbtPluginRunner ?? DEFAULT_DBT_PLUGIN_RUNNER
  );
}

function createRegisteredDbtActivityDeps(
  store: TestStateStore,
  outbox: TestOutbox,
  bindings: readonly DbtRunExecutionBinding[],
  dbtPluginRunner: DbtPluginRunner
): TestDbtActivityDeps {
  const registry = registerBindings(bindings);
  const runExecutionContextReader = createRegisteredRunExecutionContextReader(
    registry.runExecutionContextsByRefKey
  );
  const [firstBinding] = bindings;
  if (firstBinding === undefined) {
    throw new TypeError('DBT_BINDINGS_REQUIRED');
  }

  const activityDeps = createActivityDeps(store, outbox, firstBinding.planBytes, {
    fetchPlanBytes: createRegisteredPlanBytesFetcher(registry.planBytesByRefKey),
  });
  const stepActivitiesByKind = createDbtStepActivityRegistry({
    runExecutionContextReader,
    dbtPluginRunner,
  });

  return {
    ...activityDeps,
    dbtPluginRunner,
    runExecutionContextReader,
    stepActivitiesByKind,
  };
}

function assertDbtBindings(
  bindings: readonly DbtRunExecutionBinding[]
): readonly DbtRunExecutionBinding[] {
  if (bindings.length === 0) {
    throw new TypeError('DBT_BINDINGS_REQUIRED');
  }

  return bindings.map((binding, index) => {
    if (!(binding.planBytes instanceof Uint8Array)) {
      throw new TypeError(`DBT_PLAN_BYTES_REQUIRED:${index}`);
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
