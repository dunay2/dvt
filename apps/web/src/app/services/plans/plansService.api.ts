import {
  PREVIEW_PROFILE,
  parseExecutionPlan,
  parsePlanPreviewRejectedOutcome,
  parsePlanPreviewProvenance,
  parsePlanPreviewPersistResponse,
  parsePlanRef,
  type ExecutionPlan as ContractExecutionPlan,
} from '@dvt/contracts';

import type { PlanRef, RunContext } from '../../types/engine';
import type { PlanViewModel } from '../../types/plans';
import type { IPlansPort, PlanPreviewInput } from '../../ports/plans';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { normalizeProtectedRuntimeRejection } from '../api/protectedRuntimeRejection';

type PlanPreviewView = NonNullable<PlanViewModel['preview']>;

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
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

function parsePreviewProvenance(value: unknown): PlanPreviewView['provenance'] {
  const record = asRecord(value);
  if (record == null) {
    return undefined;
  }

  if (typeof record.kind === 'string') {
    return parsePlanPreviewProvenance(value);
  }

  const graphArtifact = parseArtifactRef(record.graphArtifact);
  const sqlArtifact = parseArtifactRef(record.sqlArtifact);
  return graphArtifact == null && sqlArtifact == null
    ? undefined
    : {
        ...(graphArtifact == null ? {} : { graphArtifact }),
        ...(sqlArtifact == null ? {} : { sqlArtifact }),
      };
}

function parseContractPlanPayload(payload: unknown): {
  contractPlan: ContractExecutionPlan;
  planRef: PlanRef;
  planSummary?: PlanPreviewView['summary'];
  persisted?: PlanPreviewView['persisted'];
  provenance?: PlanPreviewView['provenance'];
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
    provenance: parsePreviewProvenance(envelope.provenance),
  };
}

function mapContractPlanToUi(
  contractPlan: ContractExecutionPlan,
  planRef: PlanRef,
  preview?: PlanPreviewView,
  previewProfile?: string
): PlanViewModel & { readonly planRef: PlanRef } {
  const tags = contractPlan.observability?.tags ?? {};
  const extra = contractPlan.observability?.extra ?? {};
  const adapter = asString(tags.adapter) ?? 'unknown';
  const target = contractPlan.metadata.ownership?.environmentId ?? 'default';
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
    ...(contractPlan.decisions
      ? {
          decisions: contractPlan.decisions.map((decision) =>
            decision.status === 'PARTIAL'
              ? {
                  ...decision,
                  includedNodeIds: [...decision.includedNodeIds],
                  excludedNodeIds: [...decision.excludedNodeIds],
                }
              : { ...decision }
          ),
        }
      : {}),
    ...(preview ? { preview } : {}),
    steps: contractPlan.steps.map((step: ContractExecutionPlan['steps'][number]) => {
      const stepRecord = asRecord(step);
      const config = (step.stepTypeConfig ?? {}) as Record<string, unknown>;
      const policyBag = (config.policies ?? config.policy ?? {}) as Record<string, unknown>;
      const retryPolicy = asRecord(stepRecord?.retryPolicy);
      const rawNodes = config.nodeIds;
      const nodesFromConfig = Array.isArray(rawNodes)
        ? rawNodes.filter((value): value is string => typeof value === 'string')
        : [];
      const nodes =
        nodesFromConfig.length > 0
          ? nodesFromConfig
          : previewProfile === PREVIEW_PROFILE.plannerGenericV1
            ? [step.stepId]
            : [];

      return {
        id: step.stepId,
        type: step.kind,
        name: asString(config.name) ?? step.kind,
        nodes,
        policies: {
          retries:
            typeof retryPolicy?.maxAttempts === 'number'
              ? Math.max(retryPolicy.maxAttempts - 1, 0)
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

export function createApiPlansService(apiClient: ApiClient): IPlansPort {
  return {
    previewPlan: async (input: PlanPreviewInput) => {
      try {
        const payload = await apiClient.postJson<PlanPreviewInput, unknown>(
          '/plans/preview',
          input
        );
        const preview = parsePlanPreviewPersistResponse(payload);
        return { kind: 'accepted', plan: mapPreviewPayloadToUi(preview) };
      } catch (error) {
        const rejectedOutcome = parseTypedPreviewRejection(error);
        if (rejectedOutcome?.kind === 'selection-rejected') {
          return {
            kind: rejectedOutcome.kind,
            rejection: rejectedOutcome.rejection,
          };
        }
        if (rejectedOutcome?.kind === 'plan-invalid') {
          return {
            kind: rejectedOutcome.kind,
            plan: mapPreviewPayloadToUi(rejectedOutcome),
            validation: rejectedOutcome.validation,
          };
        }
        throw normalizeProtectedRuntimeRejection(error) ?? error;
      }
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

function mapPreviewPayloadToUi(
  preview:
    | ReturnType<typeof parsePlanPreviewPersistResponse>
    | Extract<ReturnType<typeof parsePlanPreviewRejectedOutcome>, { readonly kind: 'plan-invalid' }>
): PlanViewModel & { readonly planRef: PlanRef } {
  return mapContractPlanToUi(
    preview.plan,
    preview.planRef,
    {
      ...(preview.planSummary
        ? {
            summary: {
              executor: preview.planSummary.executor,
              nodeCount: preview.planSummary.nodeCount,
              stepCount: preview.planSummary.stepCount,
              sourceTables: [...preview.planSummary.sourceTables],
              sinkTables: [...preview.planSummary.sinkTables],
            },
          }
        : {}),
      persisted: {
        planRecordId: preview.persisted.planRecordId,
        canonicalPlanSha256: preview.persisted.canonicalPlanSha256,
      },
      ...(preview.provenance ? { provenance: preview.provenance } : {}),
    },
    preview.previewProfile
  );
}

function parseTypedPreviewRejection(
  error: unknown
): ReturnType<typeof parsePlanPreviewRejectedOutcome> | null {
  if (!(error instanceof ApiError) || error.statusCode !== 422) {
    return null;
  }

  const envelope = asRecord(error.responseBody);
  const errorBody = asRecord(envelope?.error);
  if (
    errorBody?.type !== 'unprocessable' ||
    errorBody.reason !== 'plan_rejected' ||
    errorBody.details === undefined
  ) {
    return null;
  }

  try {
    return parsePlanPreviewRejectedOutcome(errorBody.details);
  } catch {
    return null;
  }
}
