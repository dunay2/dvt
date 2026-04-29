import type { PlanUriPolicyReason } from '../planUriPolicyViolation.js';

import type { EngineErrorCode } from './errorCodes.js';

export const ENGINE_ERROR_MESSAGE_KEY = {
  RUN_NOT_FOUND: 'engine.error.run_not_found',
  RUN_ALREADY_EXISTS: 'engine.error.run_already_exists',
  ADAPTER_NOT_REGISTERED: 'engine.error.adapter_not_registered',
  TENANT_ACCESS_DENIED: 'engine.error.tenant_access_denied',
  CAPABILITIES_NOT_SUPPORTED: 'engine.error.capabilities_not_supported',
  TARGET_ADAPTER_MISMATCH: 'engine.error.target_adapter_mismatch',
  INVALID_RUN_ID: 'engine.error.invalid_run_id',
  PLAN_SCHEMA_VERSION_UNKNOWN: 'engine.error.plan_schema_version_unknown',
  RUN_METADATA_NOT_FOUND: 'engine.error.run_metadata_not_found',
  RECOVERY_SOURCE_NOT_TERMINAL: 'engine.error.recovery_source_not_terminal',
  SIGNAL_NOT_IMPLEMENTED: 'engine.error.signal_not_implemented',
  OUTBOX_RATE_LIMIT_EXCEEDED: 'engine.error.outbox_rate_limit_exceeded',
  PLAN_URI_NOT_ALLOWED: 'engine.error.plan_uri_not_allowed',
  INVALID_STATE_TRANSITION: 'engine.error.invalid_state_transition',
  UNSUPPORTED_PLAN_VERSION: 'engine.error.unsupported_plan_version',
  INVALID_RUN_EVENT_INPUT: 'engine.error.invalid_run_event_input',
  RUN_SEQUENCE_OVERFLOW: 'engine.error.run_sequence_overflow',
  RUN_EXECUTION_CONTEXT_REJECTED: 'engine.error.run_execution_context_rejected',
  PROVIDER_REF_PROVIDER_MISMATCH: 'engine.error.provider_ref_provider_mismatch',
} as const satisfies Record<EngineErrorCode, string>;

export type EngineErrorMessageKey =
  (typeof ENGINE_ERROR_MESSAGE_KEY)[keyof typeof ENGINE_ERROR_MESSAGE_KEY];

interface EngineErrorMessageParamMap {
  RUN_NOT_FOUND: { runId: string };
  RUN_ALREADY_EXISTS: { runId: string };
  ADAPTER_NOT_REGISTERED: { provider: string };
  TENANT_ACCESS_DENIED: { tenantId: string };
  CAPABILITIES_NOT_SUPPORTED: { capabilities: string[]; provider?: string };
  TARGET_ADAPTER_MISMATCH: { planRequires: string; contextHas: string };
  INVALID_RUN_ID: { runId: string };
  PLAN_SCHEMA_VERSION_UNKNOWN: { schemaVersion: string };
  RUN_METADATA_NOT_FOUND: { runId: string };
  RECOVERY_SOURCE_NOT_TERMINAL: { runId: string; status: string };
  SIGNAL_NOT_IMPLEMENTED: { signalType: string };
  OUTBOX_RATE_LIMIT_EXCEEDED: { tenantId: string };
  PLAN_URI_NOT_ALLOWED: { uri: string; reason: PlanUriPolicyReason; subject?: string };
  INVALID_STATE_TRANSITION: {
    runId: string;
    fromStatus: string;
    eventType: string;
    stepId?: string;
  };
  UNSUPPORTED_PLAN_VERSION: { planVersion: string; supportedVersions: readonly string[] };
  INVALID_RUN_EVENT_INPUT: { reason: string; index?: number; runId?: string };
  RUN_SEQUENCE_OVERFLOW: { runId: string; attemptedRunSeq: number };
  RUN_EXECUTION_CONTEXT_REJECTED: { reason: string };
  PROVIDER_REF_PROVIDER_MISMATCH: {
    runId: string;
    persistedProvider: string;
    updateProvider: string;
  };
}

export type EngineErrorMessageParams<C extends EngineErrorCode = EngineErrorCode> = Readonly<
  EngineErrorMessageParamMap[C]
>;

type EngineErrorMessageRenderer<C extends EngineErrorCode> = (
  params: EngineErrorMessageParams<C>
) => string;

const ENGINE_ERROR_MESSAGE_RENDERERS = {
  RUN_NOT_FOUND: ({ runId }) => `Run not found: ${runId}`,
  RUN_ALREADY_EXISTS: ({ runId }) => `Run already exists: ${runId}`,
  ADAPTER_NOT_REGISTERED: ({ provider }) => `No adapter registered for provider: ${provider}`,
  TENANT_ACCESS_DENIED: ({ tenantId }) => `Tenant access denied: ${tenantId}`,
  CAPABILITIES_NOT_SUPPORTED: ({ capabilities, provider }) => {
    const who = provider ? ` by adapter '${provider}'` : '';
    return `Required capabilities not supported${who}: [${capabilities.join(', ')}]`;
  },
  TARGET_ADAPTER_MISMATCH: ({ planRequires, contextHas }) =>
    `Plan requires adapter '${planRequires}', context specifies '${contextHas}'`,
  INVALID_RUN_ID: ({ runId }) => `Invalid runId format: ${runId}`,
  PLAN_SCHEMA_VERSION_UNKNOWN: ({ schemaVersion }) =>
    `Unsupported plan schema version: ${schemaVersion}`,
  RUN_METADATA_NOT_FOUND: ({ runId }) => `Run metadata not found for runId: ${runId}`,
  RECOVERY_SOURCE_NOT_TERMINAL: ({ runId, status }) =>
    `Recover source run is not terminal: runId=${runId} status=${status}`,
  SIGNAL_NOT_IMPLEMENTED: ({ signalType }) => `NotImplemented: ${signalType} signals are Phase 2`,
  OUTBOX_RATE_LIMIT_EXCEEDED: ({ tenantId }) =>
    `Outbox rate limit exceeded for tenant: ${tenantId}`,
  PLAN_URI_NOT_ALLOWED: ({ uri, reason, subject }) => {
    const reasonDetail = subject === undefined ? reason : `${reason}:${subject}`;
    return `Plan URI not allowed - ${reasonDetail}: ${uri}`;
  },
  INVALID_STATE_TRANSITION: ({ runId, fromStatus, eventType, stepId }) => {
    const subject = stepId ? `step ${stepId}` : 'run';
    return `Cannot apply ${eventType} to ${subject} already in terminal status ${fromStatus}: runId=${runId}`;
  },
  UNSUPPORTED_PLAN_VERSION: ({ planVersion, supportedVersions }) =>
    `Unsupported plan version "${planVersion}". Supported versions: ${supportedVersions.join(', ')}`,
  INVALID_RUN_EVENT_INPUT: ({ reason, index, runId }) => {
    const location = index === undefined ? '' : ` at index ${index}`;
    const run = runId === undefined ? '' : ` (runId=${runId})`;
    return `Invalid run event input: ${reason}${location}${run}`;
  },
  RUN_SEQUENCE_OVERFLOW: ({ runId, attemptedRunSeq }) =>
    `Run sequence overflow for runId=${runId}: attempted runSeq=${attemptedRunSeq}`,
  RUN_EXECUTION_CONTEXT_REJECTED: ({ reason }) => `Run execution context rejected: ${reason}`,
  PROVIDER_REF_PROVIDER_MISMATCH: ({ runId, persistedProvider, updateProvider }) =>
    `ProviderRef update rejected for runId=${runId}: persisted provider=${persistedProvider}, update provider=${updateProvider}`,
} satisfies {
  [C in EngineErrorCode]: EngineErrorMessageRenderer<C>;
};

export function defaultEngineErrorMessage<C extends EngineErrorCode>(
  code: C,
  params: EngineErrorMessageParams<C>
): string {
  const render = ENGINE_ERROR_MESSAGE_RENDERERS[code] as EngineErrorMessageRenderer<C>;
  return render(params);
}
