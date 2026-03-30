import {
  parseExecutionPlanV2,
  type ExecutionPlanV2 as ContractExecutionPlan,
} from '@dvt/contracts';

import { mockExecutionPlan } from '../../data/mockDbtData';
import { useSessionStore } from '../../stores/sessionStore';
import type { ExecutionPlan, ExecutionStep } from '../../types/dbt';
import type { PlanRef, RunContext } from '../../types/engine';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';

export type PlanPreviewInput = {
  selectedNodeIds: string[];
  context: RunContext;
  planName?: string;
};

export interface PlansService {
  previewPlan: (input: PlanPreviewInput) => Promise<ExecutionPlan>;
  importPlan: (planRef: PlanRef, context: RunContext) => Promise<ExecutionPlan>;
}

function mapStepKindToUiType(kind: string): ExecutionStep['type'] {
  const normalized = kind.trim().toUpperCase();
  if (normalized.includes('COMPILE')) {
    return 'DBT_COMPILE';
  }
  if (normalized.includes('TEST')) {
    return 'DBT_TEST';
  }
  if (
    normalized.includes('RUN') ||
    normalized.includes('MODEL') ||
    normalized.includes('SNAPSHOT')
  ) {
    return 'DBT_RUN';
  }
  return 'CUSTOM_PLUGIN_STEP';
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseContractPlanPayload(payload: unknown): ContractExecutionPlan {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'plan' in payload &&
    (payload as { plan?: unknown }).plan !== undefined
  ) {
    return parseExecutionPlanV2((payload as { plan: unknown }).plan);
  }

  return parseExecutionPlanV2(payload);
}

function mapContractPlanToUi(contractPlan: ContractExecutionPlan): ExecutionPlan {
  const tags = contractPlan.observability?.tags ?? {};
  const extra = contractPlan.observability?.extra ?? {};
  const adapter = asString(tags.adapter) ?? 'unknown';
  const target = asString(tags.environmentId) ?? 'default';
  const estimatedCost =
    asNumber((extra as Record<string, unknown>)?.estimatedCost) ??
    asNumber((extra as Record<string, unknown>)?.costUsd);

  return {
    planId: contractPlan.metadata.planId,
    planVersion: contractPlan.metadata.planVersion,
    generatedAt: contractPlan.metadata.createdAtIso,
    adapter,
    target,
    estimatedCost,
    capabilities: [],
    steps: contractPlan.steps.map((step) => {
      const config = (step.stepTypeConfig ?? {}) as Record<string, unknown>;
      const policyBag = (config.policies ?? config.policy ?? {}) as Record<string, unknown>;
      const rawNodes = config.nodeIds;
      const nodes = Array.isArray(rawNodes)
        ? rawNodes.filter((value): value is string => typeof value === 'string')
        : [];

      return {
        id: step.stepId,
        type: mapStepKindToUiType(step.kind),
        name: asString(config.name) ?? step.kind,
        nodes,
        policies: {
          retries: asNumber(policyBag.retries) ?? asNumber(config.retries),
          timeout:
            asNumber(policyBag.timeoutSec) ??
            asNumber(policyBag.timeout) ??
            asNumber(config.timeout),
          concurrency:
            asNumber(policyBag.maxConcurrency) ??
            asNumber(policyBag.concurrency) ??
            asNumber(config.concurrency),
          warehouse: asString(policyBag.warehouse) ?? asString(config.warehouse),
        },
      };
    }),
  };
}

function createMockPlansService(): PlansService {
  return {
    previewPlan: async () => ({ ...mockExecutionPlan }),
    importPlan: async () => ({ ...mockExecutionPlan }),
  };
}

function createApiPlansService(apiClient: ApiClient): PlansService {
  return {
    previewPlan: async (input) => {
      const payload = await apiClient.postJson<PlanPreviewInput, unknown>('/plans/preview', input);
      const contractPlan = parseContractPlanPayload(payload);
      return mapContractPlanToUi(contractPlan);
    },
    importPlan: async (planRef, context) => {
      const payload = await apiClient.postJson<{ planRef: PlanRef; context: RunContext }, unknown>(
        '/plans/import',
        {
          planRef,
          context,
        }
      );
      const contractPlan = parseContractPlanPayload(payload);
      return mapContractPlanToUi(contractPlan);
    },
  };
}

export function createPlansService(
  mode: DataSourceMode = resolveDataSource(),
  apiClient: ApiClient = createApiClient()
): PlansService {
  if (mode === 'api') {
    return createApiPlansService(apiClient);
  }

  return createMockPlansService();
}

export function buildSessionRunContext(runId: string): RunContext {
  return useSessionStore.getState().buildRunContext(runId);
}

/**
 * Constructs a PlanRef from a previewed ExecutionPlan for use in startRun.
 * The uri uses a dvt:// scheme; sha256 is a placeholder for mock mode.
 * In API mode the backend validates the plan by planId, not sha256.
 */
export function buildPlanRefFromPlan(plan: ExecutionPlan): PlanRef {
  return {
    uri: `dvt://plans/${plan.planId}`,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    schemaVersion: '2.0.0',
    planId: plan.planId,
    planVersion: plan.planVersion,
  };
}
