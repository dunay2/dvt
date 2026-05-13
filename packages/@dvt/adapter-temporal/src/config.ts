/**
 * @file packages/@dvt/adapter-temporal/src/config.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 1 â€” Enforce explicit Temporal runtime configuration preconditions
 * @consequence Invalid Temporal runtime settings fail fast before adapter/client lifecycle starts
 * @version 1.0.0
 * @date 2026-02-21
 */
import { asNonBlankString, type NonBlankString } from '@dvt/contracts';

export type TemporalAddress = NonBlankString & { readonly __brand: 'TemporalAddress' };
export type TemporalNamespace = NonBlankString & { readonly __brand: 'TemporalNamespace' };
export type TemporalTaskQueueName = NonBlankString & { readonly __brand: 'TemporalTaskQueueName' };
export type TemporalIdentity = NonBlankString & { readonly __brand: 'TemporalIdentity' };
export type PositiveMilliseconds = number & { readonly __brand: 'PositiveMilliseconds' };
export type PositivePayloadBytes = number & { readonly __brand: 'PositivePayloadBytes' };
export type ContinueAsNewLayerCount = number & { readonly __brand: 'ContinueAsNewLayerCount' };
export type TemporalStepCapability = NonBlankString & {
  readonly __brand: 'TemporalStepCapability';
};
export type TemporalStepKindName = NonBlankString & { readonly __brand: 'TemporalStepKindName' };

export interface TemporalConnectionConfig {
  address: TemporalAddress;
  namespace: TemporalNamespace;
  taskQueue: TemporalTaskQueueName;
  identity?: TemporalIdentity;
}

export interface TemporalTimeoutConfig {
  connectTimeoutMs: PositiveMilliseconds;
  requestTimeoutMs: PositiveMilliseconds;
}

export interface TemporalWorkflowBudgetConfig {
  /**
   * Maximum serialized workflow start payload size accepted by the adapter
   * before dispatching to Temporal.
   */
  maxStartPayloadBytes: PositivePayloadBytes;
  /**
   * Maximum serialized continue-as-new workflow input size accepted by the
   * runtime before rotating execution history.
   *
   * This value is frozen into workflow input so in-flight runs do not drift if
   * operator config changes mid-execution.
   */
  maxContinueAsNewPayloadBytes: PositivePayloadBytes;
  /**
   * Number of execution layers processed in a single workflow run before
   * triggering continue-as-new. The default keeps large-DAG rollover enabled;
   * explicit `0` is reserved for local diagnostics or incident rollback.
   */
  continueAsNewAfterLayerCount: ContinueAsNewLayerCount;
}

export interface TemporalStepActivityRoute {
  capability: TemporalStepCapability;
  taskQueue: TemporalTaskQueueName;
}

export interface TemporalActivityRoutingConfig {
  routesByStepKind: Readonly<Record<string, TemporalStepActivityRoute>>;
}

export interface TemporalAdapterConfig {
  connection: TemporalConnectionConfig;
  timeouts: TemporalTimeoutConfig;
  workflowBudget: TemporalWorkflowBudgetConfig;
  activityRouting: TemporalActivityRoutingConfig;
}

const DEFAULT_MAX_START_PAYLOAD_BYTES = 2_000_000;
const DEFAULT_CONTINUE_AS_NEW_AFTER_LAYER_COUNT = 100;

const DEFAULT_CONNECTION_CONFIG: TemporalConnectionConfig = createTemporalConnectionConfig({
  address: '127.0.0.1:7233',
  namespace: 'default',
  taskQueue: 'dvt-temporal',
});

const DEFAULT_TIMEOUT_CONFIG: TemporalTimeoutConfig = createTemporalTimeoutConfig({
  connectTimeoutMs: 5000,
  requestTimeoutMs: 10000,
});

const DEFAULT_WORKFLOW_BUDGET_CONFIG: TemporalWorkflowBudgetConfig =
  createTemporalWorkflowBudgetConfig({
    maxStartPayloadBytes: DEFAULT_MAX_START_PAYLOAD_BYTES,
    maxContinueAsNewPayloadBytes: deriveContinueAsNewPayloadBudget(DEFAULT_MAX_START_PAYLOAD_BYTES),
    continueAsNewAfterLayerCount: DEFAULT_CONTINUE_AS_NEW_AFTER_LAYER_COUNT,
  });
const DEFAULT_ACTIVITY_ROUTING_CONFIG: TemporalActivityRoutingConfig =
  createTemporalActivityRoutingConfig();

const DEFAULTS: TemporalAdapterConfig = {
  connection: DEFAULT_CONNECTION_CONFIG,
  timeouts: DEFAULT_TIMEOUT_CONFIG,
  workflowBudget: DEFAULT_WORKFLOW_BUDGET_CONFIG,
  activityRouting: DEFAULT_ACTIVITY_ROUTING_CONFIG,
};

export function loadTemporalAdapterConfig(
  env: Record<string, string | undefined>
): TemporalAdapterConfig {
  const maxStartPayloadBytes = parsePositiveInt(
    env.TEMPORAL_MAX_START_PAYLOAD_BYTES,
    DEFAULT_WORKFLOW_BUDGET_CONFIG.maxStartPayloadBytes,
    'TEMPORAL_MAX_START_PAYLOAD_BYTES'
  );

  return {
    connection: createTemporalConnectionConfig({
      address: toRequiredTrimmed(env.TEMPORAL_ADDRESS, DEFAULTS.connection.address),
      namespace: toRequiredTrimmed(env.TEMPORAL_NAMESPACE, DEFAULTS.connection.namespace),
      taskQueue: toRequiredTrimmed(env.TEMPORAL_TASK_QUEUE, DEFAULTS.connection.taskQueue),
      identity: toOptionalTrimmed(env.TEMPORAL_IDENTITY),
    }),
    timeouts: createTemporalTimeoutConfig({
      connectTimeoutMs: parsePositiveInt(
        env.TEMPORAL_CONNECT_TIMEOUT_MS,
        DEFAULTS.timeouts.connectTimeoutMs,
        'TEMPORAL_CONNECT_TIMEOUT_MS'
      ),
      requestTimeoutMs: parsePositiveInt(
        env.TEMPORAL_REQUEST_TIMEOUT_MS,
        DEFAULTS.timeouts.requestTimeoutMs,
        'TEMPORAL_REQUEST_TIMEOUT_MS'
      ),
    }),
    workflowBudget: createTemporalWorkflowBudgetConfig({
      maxStartPayloadBytes,
      maxContinueAsNewPayloadBytes: parsePositiveInt(
        env.TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES,
        deriveContinueAsNewPayloadBudget(maxStartPayloadBytes),
        'TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES'
      ),
      continueAsNewAfterLayerCount: parseNonNegativeInt(
        env.TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS,
        DEFAULT_WORKFLOW_BUDGET_CONFIG.continueAsNewAfterLayerCount,
        'TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS'
      ),
    }),
    activityRouting: parseTemporalActivityRoutingEnv(env.TEMPORAL_STEP_ACTIVITY_ROUTES),
  };
}

export function validateTemporalAdapterConfig(cfg: unknown): TemporalAdapterConfig {
  const root = asConfigObject(cfg, 'config');
  const connection = createTemporalConnectionConfig(asConfigObject(root.connection, 'connection'));
  const timeouts = createTemporalTimeoutConfig(asConfigObject(root.timeouts, 'timeouts'));
  const workflowBudget = createTemporalWorkflowBudgetConfig(
    asConfigObject(root.workflowBudget, 'workflowBudget')
  );

  return {
    connection,
    timeouts,
    workflowBudget,
    activityRouting:
      root.activityRouting === undefined
        ? DEFAULT_ACTIVITY_ROUTING_CONFIG
        : createTemporalActivityRoutingConfig(
            asConfigObject(root.activityRouting, 'activityRouting')
          ),
  };
}

function createTemporalConnectionConfig(source: Record<string, unknown>): TemporalConnectionConfig {
  return {
    address: asTemporalAddress(source.address),
    namespace: asTemporalNamespace(source.namespace),
    taskQueue: asTemporalTaskQueueName(source.taskQueue),
    ...(source.identity === undefined ? {} : { identity: asTemporalIdentity(source.identity) }),
  };
}

function createTemporalTimeoutConfig(source: Record<string, unknown>): TemporalTimeoutConfig {
  return {
    connectTimeoutMs: asPositiveMilliseconds(source.connectTimeoutMs, 'connectTimeoutMs'),
    requestTimeoutMs: asPositiveMilliseconds(source.requestTimeoutMs, 'requestTimeoutMs'),
  };
}

function createTemporalWorkflowBudgetConfig(
  source: Record<string, unknown>
): TemporalWorkflowBudgetConfig {
  const maxStartPayloadBytes = asPositivePayloadBytes(
    source.maxStartPayloadBytes,
    'maxStartPayloadBytes'
  );
  const maxContinueAsNewPayloadBytes = asPositivePayloadBytes(
    source.maxContinueAsNewPayloadBytes,
    'maxContinueAsNewPayloadBytes'
  );
  const continueAsNewAfterLayerCount = asContinueAsNewLayerCount(
    source.continueAsNewAfterLayerCount,
    'continueAsNewAfterLayerCount'
  );

  assertLessThanOrEqual(
    maxContinueAsNewPayloadBytes,
    maxStartPayloadBytes,
    'maxContinueAsNewPayloadBytes',
    'maxStartPayloadBytes'
  );

  return {
    maxStartPayloadBytes,
    maxContinueAsNewPayloadBytes,
    continueAsNewAfterLayerCount,
  };
}

function createTemporalActivityRoutingConfig(
  source: Record<string, unknown> = { routesByStepKind: {} }
): TemporalActivityRoutingConfig {
  const routesSource =
    source.routesByStepKind === undefined
      ? {}
      : asConfigObject(source.routesByStepKind, 'routesByStepKind');
  const routesByStepKind: Record<string, TemporalStepActivityRoute> = {};

  for (const [stepKind, route] of Object.entries(routesSource)) {
    const normalizedStepKind = asTemporalStepKindName(stepKind);
    const routeConfig = asConfigObject(route, `routesByStepKind.${stepKind}`);
    routesByStepKind[normalizedStepKind] = {
      capability: asTemporalStepCapability(routeConfig.capability),
      taskQueue: asTemporalTaskQueueName(routeConfig.taskQueue),
    };
  }

  return { routesByStepKind };
}

function parseTemporalActivityRoutingEnv(raw: string | undefined): TemporalActivityRoutingConfig {
  if (raw === undefined || raw.trim().length === 0) {
    return DEFAULT_ACTIVITY_ROUTING_CONFIG;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('TEMPORAL_CONFIG_INVALID: TEMPORAL_STEP_ACTIVITY_ROUTES must be valid JSON');
  }

  const routesByStepKind = asConfigObject(parsed, 'TEMPORAL_STEP_ACTIVITY_ROUTES');
  return createTemporalActivityRoutingConfig({ routesByStepKind });
}

function deriveContinueAsNewPayloadBudget(maxStartPayloadBytes: number): number {
  return Math.max(1, Math.floor(maxStartPayloadBytes / 4));
}

function asConfigObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`TEMPORAL_CONFIG_INVALID: ${fieldName} is required`);
  }
  return value as Record<string, unknown>;
}

function asTemporalAddress(value: unknown): TemporalAddress {
  return asBrandedNonBlankString(value, 'address') as TemporalAddress;
}

function asTemporalNamespace(value: unknown): TemporalNamespace {
  return asBrandedNonBlankString(value, 'namespace') as TemporalNamespace;
}

function asTemporalTaskQueueName(value: unknown): TemporalTaskQueueName {
  return asBrandedNonBlankString(value, 'taskQueue') as TemporalTaskQueueName;
}

function asTemporalStepCapability(value: unknown): TemporalStepCapability {
  return asBrandedNonBlankString(value, 'capability') as TemporalStepCapability;
}

function asTemporalStepKindName(value: unknown): TemporalStepKindName {
  return asBrandedNonBlankString(value, 'stepKind') as TemporalStepKindName;
}

function asTemporalIdentity(value: unknown): TemporalIdentity {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('TEMPORAL_CONFIG_INVALID: identity must be non-empty when provided');
  }
  return asNonBlankString(value) as TemporalIdentity;
}

function asBrandedNonBlankString(value: unknown, fieldName: string): NonBlankString {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`TEMPORAL_CONFIG_INVALID: ${fieldName} is required`);
  }
  return asNonBlankString(value);
}

function asPositiveMilliseconds(value: unknown, fieldName: string): PositiveMilliseconds {
  return asPositiveInteger(value, fieldName) as PositiveMilliseconds;
}

function asPositivePayloadBytes(value: unknown, fieldName: string): PositivePayloadBytes {
  return asPositiveInteger(value, fieldName) as PositivePayloadBytes;
}

function asContinueAsNewLayerCount(value: unknown, fieldName: string): ContinueAsNewLayerCount {
  return asNonNegativeInteger(value, fieldName) as ContinueAsNewLayerCount;
}

function asPositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`TEMPORAL_CONFIG_INVALID: ${fieldName} must be a positive integer`);
  }
  return value as number;
}

function asNonNegativeInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`TEMPORAL_CONFIG_INVALID: ${fieldName} must be a non-negative integer`);
  }
  return value as number;
}

function assertLessThanOrEqual(
  value: number,
  maximum: number,
  fieldName: string,
  maximumFieldName: string
): void {
  if (value > maximum) {
    throw new Error(
      `TEMPORAL_CONFIG_INVALID: ${fieldName} must be less than or equal to ${maximumFieldName}`
    );
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number, fieldName: string): number {
  if (raw === undefined) return fallback;
  const normalized = raw.trim();
  const n = Number(normalized);
  if (normalized.length > 0 && Number.isInteger(n) && n > 0) {
    return n;
  }
  throw new Error(`TEMPORAL_CONFIG_INVALID: ${fieldName} must be a positive integer`);
}

function parseNonNegativeInt(raw: string | undefined, fallback: number, fieldName: string): number {
  if (raw === undefined) return fallback;
  const normalized = raw.trim();
  const n = Number(normalized);
  if (normalized.length > 0 && Number.isInteger(n) && n >= 0) {
    return n;
  }
  throw new Error(`TEMPORAL_CONFIG_INVALID: ${fieldName} must be a non-negative integer`);
}

function toOptionalTrimmed(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

function toRequiredTrimmed(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  if (value && value.length > 0) return value;
  return fallback;
}
