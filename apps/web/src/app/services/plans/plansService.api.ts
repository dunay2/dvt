import {
  parseExecutionPlan,
  parsePlanRef,
  type ExecutionPlan as ContractExecutionPlan,
} from '@dvt/contracts';

import type { ExecutionPlan, ExecutionStep } from '../../types/dbt';
import type { PlanRef, RunContext } from '../../types/engine';
import type { ApiClient } from '../api/createApiClient';
import type { PlanPreviewInput, PlansService } from './plansService';

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

function parseContractPlanPayload(payload: unknown): {
  contractPlan: ContractExecutionPlan;
  planRef: PlanRef;
} {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('Invalid plans payload: expected object envelope');
  }

  const envelope = payload as { plan?: unknown; planRef?: unknown };
  if (envelope.plan === undefined || envelope.planRef === undefined) {
    throw new Error('Invalid plans payload: expected { plan, planRef }');
  }

  return {
    contractPlan: parseExecutionPlan(envelope.plan),
    planRef: parsePlanRef(envelope.planRef),
  };
}

function mapContractPlanToUi(contractPlan: ContractExecutionPlan, planRef: PlanRef): ExecutionPlan {
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
    planRef,
    generatedAt: contractPlan.metadata.createdAtIso,
    adapter,
    target,
    estimatedCost,
    capabilities: [],
    steps: contractPlan.steps.map((step: ContractExecutionPlan['steps'][number]) => {
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

export function createApiPlansService(apiClient: ApiClient): PlansService {
  return {
    previewPlan: async (input: PlanPreviewInput) => {
      const payload = await apiClient.postJson<PlanPreviewInput, unknown>('/plans/preview', input);
      const { contractPlan, planRef } = parseContractPlanPayload(payload);
      return mapContractPlanToUi(contractPlan, planRef);
    },
    importPlan: async (planRef: PlanRef, context: RunContext) => {
      const payload = await apiClient.postJson<{ planRef: PlanRef; context: RunContext }, unknown>(
        '/plans/import',
        {
          planRef,
          context,
        }
      );
      const { contractPlan, planRef: importedPlanRef } = parseContractPlanPayload(payload);
      return mapContractPlanToUi(contractPlan, importedPlanRef);
    },
  };
}
