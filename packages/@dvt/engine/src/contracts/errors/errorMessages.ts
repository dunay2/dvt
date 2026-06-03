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

function renderRunNotFound({ runId }: EngineErrorMessageParams<'RUN_NOT_FOUND'>): string {
  return `Run not found: ${runId}`;
}

function renderRunAlreadyExists({ runId }: EngineErrorMessageParams<'RUN_ALREADY_EXISTS'>): string {
  return `Run already exists: ${runId}`;
}

function renderAdapterNotRegistered({
  provider,
}: EngineErrorMessageParams<'ADAPTER_NOT_REGISTERED'>): string {
  return `No adapter registered for provider: ${provider}`;
}

function renderTenantAccessDenied({
  tenantId,
}: EngineErrorMessageParams<'TENANT_ACCESS_DENIED'>): string {
  return `Tenant access denied: ${tenantId}`;
}

function renderCapabilitiesNotSupported({
  capabilities,
  provider,
}: EngineErrorMessageParams<'CAPABILITIES_NOT_SUPPORTED'>): string {
  const who = provider ? ` by adapter '${provider}'` : '';
  return `Required capabilities not supported${who}: [${capabilities.join(', ')}]`;
}

function renderTargetAdapterMismatch({
  planRequires,
  contextHas,
}: EngineErrorMessageParams<'TARGET_ADAPTER_MISMATCH'>): string {
  return `Plan requires adapter '${planRequires}', context specifies '${contextHas}'`;
}

function renderInvalidRunId({ runId }: EngineErrorMessageParams<'INVALID_RUN_ID'>): string {
  return `Invalid runId format: ${runId}`;
}

function renderPlanSchemaVersionUnknown({
  schemaVersion,
}: EngineErrorMessageParams<'PLAN_SCHEMA_VERSION_UNKNOWN'>): string {
  return `Unsupported plan schema version: ${schemaVersion}`;
}

function renderRunMetadataNotFound({
  runId,
}: EngineErrorMessageParams<'RUN_METADATA_NOT_FOUND'>): string {
  return `Run metadata not found for runId: ${runId}`;
}

function renderRecoverySourceNotTerminal({
  runId,
  status,
}: EngineErrorMessageParams<'RECOVERY_SOURCE_NOT_TERMINAL'>): string {
  return `Recover source run is not terminal: runId=${runId} status=${status}`;
}

function renderSignalNotImplemented({
  signalType,
}: EngineErrorMessageParams<'SIGNAL_NOT_IMPLEMENTED'>): string {
  return `NotImplemented: ${signalType} signals are Phase 2`;
}

function renderOutboxRateLimitExceeded({
  tenantId,
}: EngineErrorMessageParams<'OUTBOX_RATE_LIMIT_EXCEEDED'>): string {
  return `Outbox rate limit exceeded for tenant: ${tenantId}`;
}

function renderPlanUriNotAllowed({
  uri,
  reason,
  subject,
}: EngineErrorMessageParams<'PLAN_URI_NOT_ALLOWED'>): string {
  const reasonDetail = subject === undefined ? reason : `${reason}:${subject}`;
  return `Plan URI not allowed - ${reasonDetail}: ${uri}`;
}

function renderInvalidStateTransition({
  runId,
  fromStatus,
  eventType,
  stepId,
}: EngineErrorMessageParams<'INVALID_STATE_TRANSITION'>): string {
  const subject = stepId ? `step ${stepId}` : 'run';
  return `Cannot apply ${eventType} to ${subject} already in terminal status ${fromStatus}: runId=${runId}`;
}

function renderUnsupportedPlanVersion({
  planVersion,
  supportedVersions,
}: EngineErrorMessageParams<'UNSUPPORTED_PLAN_VERSION'>): string {
  return `Unsupported plan version "${planVersion}". Supported versions: ${supportedVersions.join(', ')}`;
}

function renderInvalidRunEventInput({
  reason,
  index,
  runId,
}: EngineErrorMessageParams<'INVALID_RUN_EVENT_INPUT'>): string {
  const location = index === undefined ? '' : ` at index ${index}`;
  const run = runId === undefined ? '' : ` (runId=${runId})`;
  return `Invalid run event input: ${reason}${location}${run}`;
}

function renderRunSequenceOverflow({
  runId,
  attemptedRunSeq,
}: EngineErrorMessageParams<'RUN_SEQUENCE_OVERFLOW'>): string {
  return `Run sequence overflow for runId=${runId}: attempted runSeq=${attemptedRunSeq}`;
}

function renderRunExecutionContextRejected({
  reason,
}: EngineErrorMessageParams<'RUN_EXECUTION_CONTEXT_REJECTED'>): string {
  return `Run execution context rejected: ${reason}`;
}

function renderProviderRefProviderMismatch({
  runId,
  persistedProvider,
  updateProvider,
}: EngineErrorMessageParams<'PROVIDER_REF_PROVIDER_MISMATCH'>): string {
  return `ProviderRef update rejected for runId=${runId}: persisted provider=${persistedProvider}, update provider=${updateProvider}`;
}

const ENGINE_ERROR_MESSAGE_RENDERERS = {
  RUN_NOT_FOUND: renderRunNotFound,
  RUN_ALREADY_EXISTS: renderRunAlreadyExists,
  ADAPTER_NOT_REGISTERED: renderAdapterNotRegistered,
  TENANT_ACCESS_DENIED: renderTenantAccessDenied,
  CAPABILITIES_NOT_SUPPORTED: renderCapabilitiesNotSupported,
  TARGET_ADAPTER_MISMATCH: renderTargetAdapterMismatch,
  INVALID_RUN_ID: renderInvalidRunId,
  PLAN_SCHEMA_VERSION_UNKNOWN: renderPlanSchemaVersionUnknown,
  RUN_METADATA_NOT_FOUND: renderRunMetadataNotFound,
  RECOVERY_SOURCE_NOT_TERMINAL: renderRecoverySourceNotTerminal,
  SIGNAL_NOT_IMPLEMENTED: renderSignalNotImplemented,
  OUTBOX_RATE_LIMIT_EXCEEDED: renderOutboxRateLimitExceeded,
  PLAN_URI_NOT_ALLOWED: renderPlanUriNotAllowed,
  INVALID_STATE_TRANSITION: renderInvalidStateTransition,
  UNSUPPORTED_PLAN_VERSION: renderUnsupportedPlanVersion,
  INVALID_RUN_EVENT_INPUT: renderInvalidRunEventInput,
  RUN_SEQUENCE_OVERFLOW: renderRunSequenceOverflow,
  RUN_EXECUTION_CONTEXT_REJECTED: renderRunExecutionContextRejected,
  PROVIDER_REF_PROVIDER_MISMATCH: renderProviderRefProviderMismatch,
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
