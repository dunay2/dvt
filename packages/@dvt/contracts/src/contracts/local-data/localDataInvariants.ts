/** Pure refinements for LOCAL metadata. Inputs are structurally parsed by their schema owner. */
export type LocalDataContractIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;

const UINT64_MAX = 18_446_744_073_709_551_615n;

export function isLocalDataCount(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value === value.trim() &&
    /^(?:0|[1-9][0-9]{0,19})$/u.test(value) &&
    BigInt(value) <= UINT64_MAX
  );
}

type AcquisitionPolicy =
  | Readonly<{ kind: 'full' }>
  | Readonly<{ kind: 'sample'; method: 'first'; requestedRows: string }>;
type Coverage = Readonly<{ kind: 'sample' }> | Readonly<{ kind: 'full'; eofObserved: true }>;

export function localDataCoverageErrors(
  policy: AcquisitionPolicy,
  coverage: Coverage,
  completionReason: 'source-exhausted' | 'sample-target-reached',
  rowCount: string
): readonly LocalDataContractIssue[] {
  const issues: LocalDataContractIssue[] = [];
  if (coverage.kind !== policy.kind) {
    issues.push({ path: ['coverage', 'kind'], message: 'Coverage must preserve the requested policy.' });
  }
  if (!isLocalDataCount(rowCount)) {
    issues.push({ path: ['rowCount'], message: 'Row count must be a canonical uint64 decimal string.' });
    return issues;
  }
  if (policy.kind === 'full') {
    if (completionReason !== 'source-exhausted') {
      issues.push({ path: ['completionReason'], message: 'FULL requires source exhaustion, not a budget stop.' });
    }
    return issues;
  }
  if (!isLocalDataCount(policy.requestedRows) || policy.requestedRows === '0') {
    issues.push({ path: ['request', 'policy', 'requestedRows'], message: 'FIRST N requires a positive uint64 target.' });
    return issues;
  }
  const actual = BigInt(rowCount);
  const target = BigInt(policy.requestedRows);
  if (actual > target) {
    issues.push({ path: ['rowCount'], message: 'A FIRST N capture cannot exceed its requested target.' });
  }
  if (completionReason === 'sample-target-reached' && actual !== target) {
    issues.push({ path: ['rowCount'], message: 'A short sample requires source exhaustion; a safety stop is not completion.' });
  }
  return issues;
}

export function localDataOrdinalErrors<Column extends Readonly<{ ordinal: number }>>(
  columns: readonly Column[]
): readonly LocalDataContractIssue[] {
  return columns.flatMap((column, index) =>
    column.ordinal === index
      ? []
      : [{ path: ['columns', index, 'ordinal'], message: 'Column ordinal must equal its array position.' }]
  );
}

export const LOCAL_DATA_CAPTURE_STATUSES = [
  'requested', 'capturing', 'completed', 'failed', 'cancelled',
] as const;

type CaptureFacts = Readonly<{
  status: (typeof LOCAL_DATA_CAPTURE_STATUSES)[number];
  localDatasetId: string;
  captureId: string;
  requestFingerprint: string;
  requestedAt: string;
  updatedAt: string;
  generationId?: string;
}>;

/** One attempt only: retries get another captureId, not a terminal-to-active transition. */
export function localDataCaptureTransition(before: CaptureFacts, after: CaptureFacts): boolean {
  if (
    before.localDatasetId !== after.localDatasetId ||
    before.captureId !== after.captureId ||
    before.requestFingerprint !== after.requestFingerprint ||
    before.requestedAt !== after.requestedAt ||
    after.updatedAt < before.updatedAt ||
    (before.status !== 'completed' && before.generationId !== undefined) ||
    (after.status === 'completed'
      ? after.generationId === undefined || after.generationId.length === 0
      : after.generationId !== undefined)
  ) return false;

  if (before.status === 'requested') {
    return after.status === 'capturing' || after.status === 'failed' || after.status === 'cancelled';
  }
  return before.status === 'capturing' &&
    (after.status === 'completed' || after.status === 'failed' || after.status === 'cancelled');
}

type GenerationFacts = Readonly<{
  localDatasetId: string;
  captureId: string;
  generationId: string;
  requestFingerprint: string;
  createdAt: string;
  sourceObservation: Readonly<{ observedAt: string }>;
}>;

/** Metadata correspondence, NOT proof of a database commit, source EOF or authorization. */
export function localDataCompletionMatches(capture: CaptureFacts, generation: GenerationFacts): boolean {
  return capture.status === 'completed' &&
    capture.localDatasetId === generation.localDatasetId &&
    capture.captureId === generation.captureId &&
    capture.generationId === generation.generationId &&
    capture.requestFingerprint === generation.requestFingerprint &&
    capture.requestedAt <= generation.sourceObservation.observedAt &&
    generation.sourceObservation.observedAt <= generation.createdAt &&
    generation.createdAt <= capture.updatedAt;
}
