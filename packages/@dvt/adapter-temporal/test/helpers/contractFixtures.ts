/**
 * @file packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 * @decision Provide contract-backed Temporal fixtures for tests that exercise DVT-owned run and plan boundaries
 * @consequence Adapter tests use canonical contract shapes instead of ad hoc provider-only payloads
 * @version 1.2.0
 */
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  asNonBlankString,
  asSha256HexString,
  type EngineRunRef,
  type ExecutionPlan,
  type PlanRef,
  type ResolvedRunContext,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import { validateTemporalAdapterConfig, type TemporalAdapterConfig } from '../../src/config.js';

export {
  asIsoUtcString as iso,
  asNonBlankString as nb,
  asSha256HexString as sha,
} from '@dvt/contracts';

interface TemporalConnectionConfigOverrides {
  address?: string;
  namespace?: string;
  taskQueue?: string;
  identity?: string;
}

interface TemporalTimeoutConfigOverrides {
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

interface TemporalWorkflowBudgetConfigOverrides {
  maxStartPayloadBytes?: number;
  maxContinueAsNewPayloadBytes?: number;
  continueAsNewAfterLayerCount?: number;
}

interface TemporalAdapterConfigOverrides {
  connection?: TemporalConnectionConfigOverrides;
  timeouts?: TemporalTimeoutConfigOverrides;
  workflowBudget?: TemporalWorkflowBudgetConfigOverrides;
}

const BASE_TEMPORAL_ADAPTER_CONFIG = {
  connection: {
    address: '127.0.0.1:7233',
    namespace: 'dvt-test',
    taskQueue: 'q-main',
  },
  timeouts: {
    connectTimeoutMs: 5000,
    requestTimeoutMs: 10000,
  },
  workflowBudget: {
    maxStartPayloadBytes: 2_000_000,
    maxContinueAsNewPayloadBytes: 500_000,
    continueAsNewAfterLayerCount: 100,
  },
} as const;

export function createTemporalAdapterConfig(
  overrides: TemporalAdapterConfigOverrides = {}
): TemporalAdapterConfig {
  const maxStartPayloadBytes =
    overrides.workflowBudget?.maxStartPayloadBytes ??
    BASE_TEMPORAL_ADAPTER_CONFIG.workflowBudget.maxStartPayloadBytes;
  const maxContinueAsNewPayloadBytes =
    overrides.workflowBudget?.maxContinueAsNewPayloadBytes ??
    deriveContinueAsNewPayloadBytes(maxStartPayloadBytes);

  return validateTemporalAdapterConfig({
    connection: {
      ...BASE_TEMPORAL_ADAPTER_CONFIG.connection,
      ...overrides.connection,
    },
    timeouts: {
      ...BASE_TEMPORAL_ADAPTER_CONFIG.timeouts,
      ...overrides.timeouts,
    },
    workflowBudget: {
      ...BASE_TEMPORAL_ADAPTER_CONFIG.workflowBudget,
      maxStartPayloadBytes,
      maxContinueAsNewPayloadBytes,
      ...overrides.workflowBudget,
    },
  });
}

function deriveContinueAsNewPayloadBytes(maxStartPayloadBytes: number): number {
  return Math.max(1, Math.floor(maxStartPayloadBytes / 4));
}

export function createExecutionPlan(args: {
  steps: ExecutionPlan['steps'];
  inputHashSha256?: string;
  createdAtIso?: string;
  ownership?: ExecutionPlan['metadata']['ownership'];
  observability?: ExecutionPlan['observability'];
}): ExecutionPlan {
  const inputHashSha256 = args.inputHashSha256 ?? 'a'.repeat(64);
  const planId = sha256HexUtf8(
    jcsCanonicalize({
      metadata: {
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        inputHashSha256,
      },
      steps: args.steps,
    })
  );

  return {
    metadata: {
      planId,
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256,
      createdAtIso: args.createdAtIso ?? '2026-04-20T00:00:00.000Z',
      ...(args.ownership === undefined ? {} : { ownership: args.ownership }),
    },
    ...(args.observability === undefined ? {} : { observability: args.observability }),
    steps: args.steps,
  };
}

export function createPlanRef(args: {
  uri: string;
  sha256: string;
  planId: string;
  planVersion?: string;
  schemaVersion?: string;
  sizeBytes?: number;
}): PlanRef {
  return {
    uri: asNonBlankString(args.uri),
    sha256: asSha256HexString(args.sha256),
    schemaVersion: asNonBlankString(args.schemaVersion ?? CURRENT_EXECUTION_PLAN_SCHEMA_VERSION),
    planId: asNonBlankString(args.planId),
    planVersion: asNonBlankString(args.planVersion ?? CURRENT_EXECUTION_PLAN_VERSION),
    ...(args.sizeBytes === undefined ? {} : { sizeBytes: args.sizeBytes }),
  };
}

export function createResolvedRunContext(args: {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  logicalAttemptId?: number;
  originRunId?: string;
  targetAdapter?: ResolvedRunContext['targetAdapter'];
}): ResolvedRunContext {
  return {
    tenantId: asNonBlankString(args.tenantId),
    projectId: asNonBlankString(args.projectId),
    environmentId: asNonBlankString(args.environmentId),
    runId: asNonBlankString(args.runId),
    targetAdapter: args.targetAdapter ?? 'temporal',
    logicalAttemptId: args.logicalAttemptId ?? 1,
    ...(args.originRunId === undefined ? {} : { originRunId: asNonBlankString(args.originRunId) }),
  };
}

export function createTemporalRunRef(args: {
  tenantId: string;
  namespace: string;
  workflowId: string;
  runId: string;
  taskQueue?: string;
}): Extract<EngineRunRef, { provider: 'temporal' }> {
  return {
    provider: 'temporal',
    tenantId: asNonBlankString(args.tenantId),
    namespace: asNonBlankString(args.namespace),
    workflowId: asNonBlankString(args.workflowId),
    runId: asNonBlankString(args.runId),
    ...(args.taskQueue === undefined ? {} : { taskQueue: asNonBlankString(args.taskQueue) }),
  };
}
