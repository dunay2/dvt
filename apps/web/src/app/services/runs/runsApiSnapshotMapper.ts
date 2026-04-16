import type { RunSnapshot, RunSummaryItem } from '../../ports/runs';

import {
  asString,
  mapContractStatusToUi,
  parseContractRunStatus,
  parseExecutionEvidence,
  parseMaterializationEvidence,
  parseRunExecutor,
  parseRunProvenance,
  parseSnapshotStaleness,
} from './runsApiDecoders';

export function mapUnknownRecordToSnapshot(record: unknown): RunSnapshot | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const candidate = record as Record<string, unknown>;
  const runId = asString(candidate.runId);
  if (runId === undefined) {
    return null;
  }

  const executor = parseRunExecutor(candidate.executor);
  const currentStepId = asString(candidate.currentStepId);
  const failedStepId = asString(candidate.failedStepId);
  const errorReason = asString(candidate.errorReason);
  const materialization = parseMaterializationEvidence(candidate.materialization);

  return {
    runId,
    planId: asString(candidate.planId),
    status: mapContractStatusToUi(parseContractRunStatus(candidate.status)),
    ...(executor ? { executor } : {}),
    environment: asString(candidate.environmentId) ?? asString(candidate.environment),
    gitSha: asString(candidate.gitSha),
    startedAt:
      asString(candidate.startedAt) ??
      asString(candidate.createdAt) ??
      asString(candidate.startTime) ??
      new Date().toISOString(),
    completedAt: asString(candidate.completedAt) ?? asString(candidate.endTime),
    substatus: asString(candidate.substatus),
    message: asString(candidate.message),
    hash: asString(candidate.hash),
    snapshotStaleness: parseSnapshotStaleness(candidate.snapshotStaleness),
    ...(currentStepId ? { currentStepId } : {}),
    ...(failedStepId ? { failedStepId } : {}),
    ...(errorReason ? { errorReason } : {}),
    ...(materialization ? { materialization } : {}),
    provenance: parseRunProvenance(candidate.provenance),
    execution: parseExecutionEvidence(candidate.execution),
  };
}

export function mapSnapshotToSummary(snapshot: RunSnapshot): RunSummaryItem {
  return {
    runId: snapshot.runId,
    planId: snapshot.planId,
    status: snapshot.status,
    environment: snapshot.environment,
    gitSha: snapshot.gitSha,
    startedAt: snapshot.startedAt,
    completedAt: snapshot.completedAt,
    substatus: snapshot.substatus,
    message: snapshot.message,
    hash: snapshot.hash,
    snapshotStaleness: snapshot.snapshotStaleness,
    execution: snapshot.execution,
  };
}
