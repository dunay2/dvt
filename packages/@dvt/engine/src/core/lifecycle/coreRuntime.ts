import { parseEngineRunRef, parseSignalRequest } from '@dvt/contracts';
import type {
  EngineRunRef,
  EventType,
  RunEventInput,
  RunMetadata,
  SignalRequest,
} from '@dvt/contracts';

import { AdapterNotRegisteredError, RunMetadataNotFoundError } from '../../contracts/errors.js';
import type { IClock } from '../../utils/clock.js';
import { toErrorMessage } from '../../utils/errorUtils.js';
import type { IdempotencyKeyBuilder } from '../idempotency.js';

import {
  CORE_ERROR_MESSAGE,
  RUN_EVENT_CONSTANTS,
  TRACEABLE_ADAPTERS,
} from './coreDomainConstants.js';
import type { StartRunTraceContext } from './StartRunTraceContext.js';

type IProviderAdapter = import('../../adapters/IProviderAdapter.js').IProviderAdapter;
type IRunStateStoreRead = import('../../ports/IRunStateStore.js').IRunStateStoreRead;
type IRunStateStoreWrite = import('../../ports/IRunStateStore.js').IRunStateStoreWrite;

export function getAdapterOrThrow(
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>,
  provider: EngineRunRef['provider']
): IProviderAdapter {
  const adapter = adapters.get(provider);
  if (adapter === undefined) throw new AdapterNotRegisteredError(provider);
  return adapter;
}

export async function resolveMetaOrThrow(
  stateStoreRead: IRunStateStoreRead,
  runRef: EngineRunRef
): Promise<RunMetadata> {
  const m = await stateStoreRead.getRunMetadataByRunId(runRef.tenantId, runRef.runId);
  if (!m) throw new RunMetadataNotFoundError(runRef.runId);
  return m;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(CORE_ERROR_MESSAGE.timeout(operation, timeoutMs)));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function buildMetricTags(
  provider: EngineRunRef['provider'],
  tenantId: string,
  extras?: Record<string, string>
): Record<string, string> {
  return extras ? { provider, tenantId, ...extras } : { provider, tenantId };
}

export function buildTraceContext(
  input: Pick<RunMetadata, 'tenantId' | 'projectId' | 'environmentId' | 'runId'> & {
    targetAdapter?: EngineRunRef['provider'];
    provider?: EngineRunRef['provider'];
    providerRef?: EngineRunRef;
  },
  planId?: string
): StartRunTraceContext {
  const raw = input.targetAdapter ?? input.provider ?? input.providerRef?.provider;
  const adapter = TRACEABLE_ADAPTERS.find((value) => value === raw);
  return {
    tenantId: input.tenantId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    ...(planId ? { planId } : {}),
    ...(adapter ? { adapter } : {}),
  };
}

export function normalizeEngineRunRef(input: ReturnType<typeof parseEngineRunRef>): EngineRunRef {
  const normalizer = ENGINE_RUN_REF_NORMALIZER_BY_PROVIDER[input.provider];
  if (normalizer === undefined) {
    return throwUnsupportedProvider(input.provider);
  }
  return normalizer(input as never);
}

export function normalizeSignalRequest(
  input: ReturnType<typeof parseSignalRequest>
): SignalRequest {
  const request: SignalRequest = {
    signalId: input.signalId,
    type: input.type,
  };
  if (input.reason !== undefined) request.reason = input.reason;
  if (input.requestedAt !== undefined) request.requestedAt = input.requestedAt;
  return request;
}

export async function emitRunEvent(input: {
  stateStoreWrite: IRunStateStoreWrite;
  idempotency: IdempotencyKeyBuilder;
  clock: Pick<IClock, 'nowIsoUtc'>;
  meta: RunMetadata;
  eventType: EventType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await input.stateStoreWrite.appendAndEnqueueTx(
    input.meta.runId,
    buildRunEvents([
      {
        idempotency: input.idempotency,
        clock: input.clock,
        meta: input.meta,
        eventType: input.eventType,
        ...(input.payload === undefined ? {} : { payload: input.payload }),
      },
    ])
  );
}

export async function emitSignalDerivedRunEvent(input: {
  stateStoreWrite: IRunStateStoreWrite;
  idempotency: IdempotencyKeyBuilder;
  clock: Pick<IClock, 'nowIsoUtc'>;
  meta: RunMetadata;
  req: SignalRequest;
  eventType: EventType;
}): Promise<void> {
  const event = buildSignalDerivedRunEventInput(input);
  await input.stateStoreWrite.appendAndEnqueueTx(input.meta.runId, [event]);
}

export function buildSignalDerivedRunEventInput(input: {
  idempotency: IdempotencyKeyBuilder;
  clock: Pick<IClock, 'nowIsoUtc'>;
  meta: RunMetadata;
  req: SignalRequest;
  eventType: EventType;
}): RunEventInput {
  return {
    eventId: input.idempotency.eventId(),
    eventType: input.eventType,
    payloadVersion: RUN_EVENT_CONSTANTS.payloadVersion,
    emittedAt: input.clock.nowIsoUtc(),
    tenantId: input.meta.tenantId,
    projectId: input.meta.projectId,
    environmentId: input.meta.environmentId,
    runId: input.meta.runId,
    planId: input.meta.planId,
    planVersion: input.meta.planVersion,
    engineAttemptId: RUN_EVENT_CONSTANTS.engineAttemptId,
    logicalAttemptId: input.meta.logicalAttemptId,
    idempotencyKey: input.idempotency.signalKey(
      {
        runId: input.meta.runId,
        logicalAttemptId: input.meta.logicalAttemptId,
        planId: input.meta.planId,
        planVersion: input.meta.planVersion,
      },
      input.req
    ),
  };
}

export function buildRunEvents(
  inputs: Array<{
    idempotency: IdempotencyKeyBuilder;
    clock: Pick<IClock, 'nowIsoUtc'>;
    meta: RunMetadata;
    eventType: EventType;
    payload?: Record<string, unknown>;
  }>
): RunEventInput[] {
  return inputs.map((input) =>
    buildRunEvent({
      idempotency: input.idempotency,
      clock: input.clock,
      meta: input.meta,
      eventType: input.eventType,
      ...(input.payload === undefined ? {} : { payload: input.payload }),
    })
  );
}

function buildRunEvent(input: {
  idempotency: IdempotencyKeyBuilder;
  clock: Pick<IClock, 'nowIsoUtc'>;
  meta: RunMetadata;
  eventType: EventType;
  payload?: Record<string, unknown>;
}): RunEventInput {
  return {
    eventId: input.idempotency.eventId(),
    eventType: input.eventType,
    payloadVersion: RUN_EVENT_CONSTANTS.payloadVersion,
    emittedAt: input.clock.nowIsoUtc(),
    tenantId: input.meta.tenantId,
    projectId: input.meta.projectId,
    environmentId: input.meta.environmentId,
    runId: input.meta.runId,
    planId: input.meta.planId,
    planVersion: input.meta.planVersion,
    engineAttemptId: RUN_EVENT_CONSTANTS.engineAttemptId,
    logicalAttemptId: input.meta.logicalAttemptId,
    idempotencyKey: input.idempotency.runEventKey({
      eventType: input.eventType,
      runId: input.meta.runId,
      logicalAttemptId: input.meta.logicalAttemptId,
      planId: input.meta.planId,
      planVersion: input.meta.planVersion,
    }),
    ...(input.payload ? { payload: input.payload } : {}),
  };
}

type ParsedEngineRunRef = ReturnType<typeof parseEngineRunRef>;
type ParsedProvider = ParsedEngineRunRef['provider'];
type ParsedEngineRunRefByProvider<P extends ParsedProvider> = Extract<
  ParsedEngineRunRef,
  { provider: P }
>;
type EngineRunRefNormalizer<P extends ParsedProvider> = (
  input: ParsedEngineRunRefByProvider<P>
) => EngineRunRef;

const normalizeTemporalRunRef: EngineRunRefNormalizer<'temporal'> = (input) => {
  const runRef: EngineRunRef = {
    provider: 'temporal',
    tenantId: input.tenantId,
    namespace: input.namespace,
    workflowId: input.workflowId,
    runId: input.runId,
  };
  if (input.taskQueue !== undefined) runRef.taskQueue = input.taskQueue;
  return runRef;
};

const normalizeConductorRunRef: EngineRunRefNormalizer<'conductor'> = (input) => ({
  provider: 'conductor',
  tenantId: input.tenantId,
  workflowId: input.workflowId,
  runId: input.runId,
  conductorUrl: input.conductorUrl,
});

const normalizeMockRunRef: EngineRunRefNormalizer<'mock'> = (input) => ({
  provider: 'mock',
  tenantId: input.tenantId,
  workflowId: input.workflowId,
  runId: input.runId,
});

const ENGINE_RUN_REF_NORMALIZER_BY_PROVIDER: {
  [K in ParsedProvider]: EngineRunRefNormalizer<K>;
} = {
  temporal: normalizeTemporalRunRef,
  conductor: normalizeConductorRunRef,
  mock: normalizeMockRunRef,
};

function throwUnsupportedProvider(provider: unknown): never {
  throw new Error(`Unsupported provider: ${toErrorMessage(provider)}`);
}
