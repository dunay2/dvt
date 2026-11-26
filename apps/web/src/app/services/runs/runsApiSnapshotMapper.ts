/**
 * Owned concern: map raw API snapshot records into presentation DTOs and
 * project snapshot data into summary items for the runs list.
 */
import { CanvasAuthoringAuthorityBindingSchema } from '@dvt/contracts';
import { z } from 'zod';
import type { RunSnapshot, RunSummaryItem } from '../../ports/runs';

import {
  asFiniteInteger,
  asFiniteNumber,
  asString,
  mapContractStatusToUi,
  parseContractRunStatus,
  parseExecutionEvidence,
  parseMaterializationEvidence,
  parsePlanExecutionSummary,
  parseRunControlAvailability,
  parseRunDiagnostics,
  parseRunExecutor,
  parseRunProvenance,
  parseSnapshotStaleness,
} from './runsApiDecoders';
import { parseDvtPostgresPublicationEvidence } from './dvtPostgresPublicationDecoder';

const modelSelectionSchema = z
  .object({
    binding: CanvasAuthoringAuthorityBindingSchema,
    modelIds: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export function mapUnknownRecordToSnapshot(record: unknown): RunSnapshot | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const candidate = record as Record<string, unknown>;
  const runId = asString(candidate.runId);
  const controls = parseRunControlAvailability(candidate.controls);
  if (runId === undefined) {
    return null;
  }

  const executor = parseRunExecutor(candidate.executor);

  const durationMs = asFiniteNumber(candidate.durationMs);
  const logicalAttemptId = asFiniteInteger(candidate.logicalAttemptId);
  const tenantId = asString(candidate.tenantId);
  const projectId = asString(candidate.projectId);
  const planVersion = asString(candidate.planVersion);
  const provider = asString(candidate.provider);
  const createdAt = asString(candidate.createdAt);
  const startedAt = asString(candidate.startedAt);

  return {
    ...projectRunSnapshotIdentity({
      tenantId,
      projectId,
      planVersion,
      logicalAttemptId,
      provider,
      createdAt,
    }),

    runId,
    planId: asString(candidate.planId),

    status: mapContractStatusToUi(parseContractRunStatus(candidate.status)),
    ...(controls === undefined ? {} : { controls }),
    ...(executor ? { executor } : {}),
    environment: asString(candidate.environmentId) ?? asString(candidate.environment),
    gitSha: asString(candidate.gitSha),

    startedAt,
    completedAt: asString(candidate.completedAt) ?? asString(candidate.endTime),
    durationMs: durationMs !== undefined && durationMs >= 0 ? durationMs : undefined,
    substatus: asString(candidate.substatus),
    message: asString(candidate.message),
    hash: asString(candidate.hash),
    snapshotStaleness: parseSnapshotStaleness(candidate.snapshotStaleness),
    ...projectRunSnapshotEvidence(candidate),

    provenance: parseRunProvenance(candidate.provenance),
    execution: parseExecutionEvidence(candidate.execution),
    planSummary: parsePlanExecutionSummary(candidate.planSummary),
    diagnostics: parseRunDiagnostics(candidate.diagnostics),
  };
}

export function mapSnapshotToSummary(snapshot: RunSnapshot): RunSummaryItem {
  return {
    ...projectRunSnapshotIdentity(snapshot),

    runId: snapshot.runId,
    planId: snapshot.planId,

    status: snapshot.status,
    environment: snapshot.environment,
    gitSha: snapshot.gitSha,

    startedAt: snapshot.startedAt,
    completedAt: snapshot.completedAt,
    durationMs: snapshot.durationMs,
    substatus: snapshot.substatus,
    message: snapshot.message,
    hash: snapshot.hash,
    snapshotStaleness: snapshot.snapshotStaleness,
    execution: snapshot.execution,
    ...(snapshot.currentStepId ? { currentStepId: snapshot.currentStepId } : {}),
    ...(snapshot.failedStepId ? { failedStepId: snapshot.failedStepId } : {}),
    ...(snapshot.errorReason ? { errorReason: snapshot.errorReason } : {}),
    ...(snapshot.controls === undefined ? {} : { controls: snapshot.controls }),
  };
}

function projectRunSnapshotIdentity({
  tenantId,
  projectId,
  planVersion,
  logicalAttemptId,
  provider,
  createdAt,
}: Pick<
  RunSnapshot,
  'tenantId' | 'projectId' | 'planVersion' | 'logicalAttemptId' | 'provider' | 'createdAt'
>) {
  return {
    ...(tenantId ? { tenantId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(planVersion ? { planVersion } : {}),
    ...(logicalAttemptId === undefined ? {} : { logicalAttemptId }),
    ...(provider ? { provider } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

function projectRunSnapshotEvidence(candidate: Record<string, unknown>) {
  const currentStepId = asString(candidate.currentStepId);
  const failedStepId = asString(candidate.failedStepId);
  const errorReason = asString(candidate.errorReason);
  const materialization = parseMaterializationEvidence(candidate.materialization);
  const publication = parseDvtPostgresPublicationEvidence(candidate.publication);
  const selection = modelSelectionSchema.safeParse(candidate.modelSelection);
  return {
    ...(currentStepId ? { currentStepId } : {}),
    ...(failedStepId ? { failedStepId } : {}),
    ...(errorReason ? { errorReason } : {}),
    ...(materialization ? { materialization } : {}),
    ...(publication ? { publication } : {}),
    ...(selection.success ? { modelSelection: selection.data } : {}),
  };
}
