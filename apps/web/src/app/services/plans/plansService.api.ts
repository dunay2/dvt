import {
  parseExecutionPlan,
  parsePlanRef,
  type ExecutionPlan as ContractExecutionPlan,
} from '@dvt/contracts';

import type { ExecutionPlan, ExecutionStep } from '../../types/dbt';
import type { PlanRef, RunContext } from '../../types/engine';
import type { ApiClient } from '../api/createApiClient';
import type { PlanPreviewInput, PlansService } from './plansService';

type ExecutionPlanPreview = NonNullable<ExecutionPlan['preview']>;

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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function parseArtifactRef(value: unknown):
  | {
      repo: string;
      path: string;
      ref?: string;
      commitSha?: string;
      contentSha256?: string;
    }
  | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const repo = asString(candidate.repo);
  const path = asString(candidate.path);
  if (!repo || !path) {
    return undefined;
  }

  return {
    repo,
    path,
    ...(asString(candidate.ref) ? { ref: asString(candidate.ref) } : {}),
    ...(asString(candidate.commitSha) ? { commitSha: asString(candidate.commitSha) } : {}),
    ...(asString(candidate.contentSha256)
      ? { contentSha256: asString(candidate.contentSha256) }
      : {}),
  };
}

function parseContractPlanPayload(payload: unknown): {
  contractPlan: ContractExecutionPlan;
  planRef: PlanRef;
  planSummary?: ExecutionPlanPreview['summary'];
  persisted?: ExecutionPlanPreview['persisted'];
  provenance?: ExecutionPlanPreview['provenance'];
} {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('Invalid plans payload: expected object envelope');
  }

  const envelope = payload as {
    plan?: unknown;
    planRef?: unknown;
    planSummary?: unknown;
    persisted?: unknown;
    provenance?: unknown;
  };
  if (envelope.plan === undefined || envelope.planRef === undefined) {
    throw new Error('Invalid plans payload: expected { plan, planRef }');
  }

  const planSummaryRecord =
    envelope.planSummary && typeof envelope.planSummary === 'object'
      ? (envelope.planSummary as Record<string, unknown>)
      : undefined;
  const persistedRecord =
    envelope.persisted && typeof envelope.persisted === 'object'
      ? (envelope.persisted as Record<string, unknown>)
      : undefined;
  const provenanceRecord =
    envelope.provenance && typeof envelope.provenance === 'object'
      ? (envelope.provenance as Record<string, unknown>)
      : undefined;

  return {
    contractPlan: parseExecutionPlan(envelope.plan),
    planRef: parsePlanRef(envelope.planRef),
    planSummary:
      planSummaryRecord &&
      (asString(planSummaryRecord.executor) === 'postgres' ||
        asString(planSummaryRecord.executor) === 'dbt') &&
      asNumber(planSummaryRecord.nodeCount) !== undefined &&
      asNumber(planSummaryRecord.stepCount) !== undefined
        ? {
            executor: asString(planSummaryRecord.executor) as 'postgres' | 'dbt',
            nodeCount: asNumber(planSummaryRecord.nodeCount)!,
            stepCount: asNumber(planSummaryRecord.stepCount)!,
            sourceTables: asStringArray(planSummaryRecord.sourceTables),
            sinkTables: asStringArray(planSummaryRecord.sinkTables),
          }
        : undefined,
    persisted:
      persistedRecord &&
      asString(persistedRecord.planRecordId) &&
      asString(persistedRecord.canonicalPlanSha256)
        ? {
            planRecordId: asString(persistedRecord.planRecordId)!,
            canonicalPlanSha256: asString(persistedRecord.canonicalPlanSha256)!,
          }
        : undefined,
    provenance: provenanceRecord
      ? {
          ...(parseArtifactRef(provenanceRecord.graphArtifact)
            ? { graphArtifact: parseArtifactRef(provenanceRecord.graphArtifact) }
            : {}),
          ...(parseArtifactRef(provenanceRecord.sqlArtifact)
            ? { sqlArtifact: parseArtifactRef(provenanceRecord.sqlArtifact) }
            : {}),
        }
      : undefined,
  };
}

function mapContractPlanToUi(
  contractPlan: ContractExecutionPlan,
  planRef: PlanRef,
  preview?: ExecutionPlanPreview
): ExecutionPlan {
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
    ...(preview ? { preview } : {}),
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
          retries:
            typeof step.retryPolicy?.maxAttempts === 'number'
              ? Math.max(step.retryPolicy.maxAttempts - 1, 0)
              : undefined,
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
      const { contractPlan, planRef, planSummary, persisted, provenance } =
        parseContractPlanPayload(payload);
      return mapContractPlanToUi(contractPlan, planRef, {
        ...(planSummary ? { summary: planSummary } : {}),
        ...(persisted ? { persisted } : {}),
        ...(provenance ? { provenance } : {}),
      });
    },
    importPlan: async (planRef: PlanRef, context: RunContext) => {
      const payload = await apiClient.postJson<{ planRef: PlanRef; context: RunContext }, unknown>(
        '/plans/import',
        {
          planRef,
          context,
        }
      );
      const {
        contractPlan,
        planRef: importedPlanRef,
        planSummary,
        persisted,
        provenance,
      } = parseContractPlanPayload(payload);
      return mapContractPlanToUi(contractPlan, importedPlanRef, {
        ...(planSummary ? { summary: planSummary } : {}),
        ...(persisted ? { persisted } : {}),
        ...(provenance ? { provenance } : {}),
      });
    },
  };
}
