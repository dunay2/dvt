import { createHash } from 'node:crypto';

import {
  parsePlanRef,
  type PlanExecutabilityRecord,
  type PlanExecutabilityRejectionReport,
  type PlanRefSchemaT,
  type PlanRecord,
  parsePlanRecord,
  type PlannerBuildResultV1,
  type RunExecutionPolicy,
  jcsCanonicalize,
  sha256HexUtf8,
} from '@dvt/contracts';

export type StoredPlanRow = {
  plan_id: string;
  plan_version: string;
  plan_uri: string;
  plan_sha256: string;
  plugin_compatibility_fingerprint?: string | null;
  schema_version: string;
  size_bytes: number;
  requires_capabilities?: unknown;
  canonical_plan_json?: string;
  executable_plan_json?: string;
  validation_state: 'PENDING_VALIDATION' | 'VALID' | 'INVALID';
  stored_at_iso: string;
  updated_at_iso: string;
  rejection_report_json: unknown;
};

export type ExecutabilityState = 'PENDING' | 'VALID' | 'INVALID';

export function toPersistedCanonicalPlanJson(buildResult: PlannerBuildResultV1): string {
  return jcsCanonicalize(buildResult.plan);
}

export function buildPlanRecord(
  buildResult: PlannerBuildResultV1,
  planRef: PlanRefSchemaT
): PlanRecord {
  const nowIso = new Date().toISOString();
  const canonicalPlanJson = toPersistedCanonicalPlanJson(buildResult);
  return parsePlanRecord({
    planId: buildResult.plan.metadata.planId,
    canonicalPlanJson,
    canonicalHash: sha256HexUtf8(canonicalPlanJson),
    planVersion: buildResult.plan.metadata.planVersion,
    schemaVersion: buildResult.plan.metadata.schemaVersion,
    contractVersion: buildResult.plan.metadata.contractVersion,
    sourceRef: planRef.uri,
    state: 'ACTIVE',
    createdAtIso: buildResult.plan.metadata.createdAtIso,
    updatedAtIso: nowIso,
  });
}

export function toPlanRecord(row: {
  plan_id: string;
  canonical_plan_json: string;
  canonical_hash: string;
  plan_version: string;
  schema_version: string;
  contract_version: string;
  source_ref: string;
  state: 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
  created_at_iso: string;
  updated_at_iso: string;
  derived_from_plan_id: string | null;
  supersedes_plan_id: string | null;
  archived_at_iso: string | null;
}): PlanRecord {
  return parsePlanRecord({
    planId: row.plan_id,
    canonicalPlanJson: row.canonical_plan_json,
    canonicalHash: row.canonical_hash,
    planVersion: row.plan_version,
    schemaVersion: row.schema_version,
    contractVersion: row.contract_version,
    sourceRef: row.source_ref,
    state: row.state,
    createdAtIso: row.created_at_iso,
    updatedAtIso: row.updated_at_iso,
    ...(row.derived_from_plan_id === null ? {} : { derivedFromPlanId: row.derived_from_plan_id }),
    ...(row.supersedes_plan_id === null ? {} : { supersedesPlanId: row.supersedes_plan_id }),
    ...(row.state === 'ARCHIVED'
      ? { archivedAtIso: row.archived_at_iso ?? row.updated_at_iso }
      : {}),
  });
}

export function toPlanExecutabilityRecord(row: {
  plan_id: string;
  adapter_id: string;
  state: ExecutabilityState;
  validated_at_iso: string | null;
  rejection_report_json: unknown;
}): PlanExecutabilityRecord {
  if (row.state === 'PENDING') {
    return { planId: row.plan_id, adapterId: row.adapter_id, state: 'PENDING' };
  }
  if (row.state === 'VALID') {
    if (row.validated_at_iso === null) {
      throw new Error(`PLAN_EXECUTABILITY_ROW_INVALID: ${row.plan_id}:${row.adapter_id}:VALID`);
    }
    return {
      planId: row.plan_id,
      adapterId: row.adapter_id,
      state: 'VALID',
      validatedAtIso: row.validated_at_iso,
    };
  }
  if (row.validated_at_iso === null || row.rejection_report_json === null) {
    throw new Error(`PLAN_EXECUTABILITY_ROW_INVALID: ${row.plan_id}:${row.adapter_id}:INVALID`);
  }
  return {
    planId: row.plan_id,
    adapterId: row.adapter_id,
    state: 'INVALID',
    validatedAtIso: row.validated_at_iso,
    rejectionReport: row.rejection_report_json as PlanExecutabilityRejectionReport,
  };
}

export function buildPlanRef(input: {
  planId: string;
  planVersion: string;
  schemaVersion: string;
  executableBytes: Uint8Array;
  uriScheme: string;
}): PlanRefSchemaT {
  const sha256 = createHash('sha256').update(input.executableBytes).digest('hex');
  return parsePlanRef({
    uri: `${input.uriScheme}://postgres/${input.planId}`,
    sha256,
    schemaVersion: input.schemaVersion,
    planId: input.planId,
    planVersion: input.planVersion,
    sizeBytes: input.executableBytes.byteLength,
  });
}

export function buildPlanRefFromStoredRow(row: StoredPlanRow): PlanRefSchemaT {
  return parsePlanRef({
    uri: row.plan_uri,
    sha256: row.plan_sha256,
    schemaVersion: row.schema_version,
    planId: row.plan_id,
    planVersion: row.plan_version,
    sizeBytes: row.size_bytes,
  });
}

export function buildExecutionPolicyFromStoredRow(
  row: Pick<StoredPlanRow, 'plugin_compatibility_fingerprint' | 'requires_capabilities'>
): RunExecutionPolicy {
  const requiresCapabilities = normalizeRequiresCapabilities(row.requires_capabilities);
  return {
    ...(row.plugin_compatibility_fingerprint === undefined ||
    row.plugin_compatibility_fingerprint === null
      ? {}
      : { pluginCompatibilityFingerprint: row.plugin_compatibility_fingerprint }),
    ...(requiresCapabilities.length > 0 ? { requiresCapabilities } : {}),
  };
}

export function assertStoredPlanMatchesRequest(
  row: StoredPlanRow,
  expected: {
    planRef: PlanRefSchemaT;
    executionPolicy: RunExecutionPolicy;
    canonicalPlanJson: string;
    executablePlanJson: string;
  }
): void {
  const mismatches: string[] = [];

  if (row.plan_version !== expected.planRef.planVersion) mismatches.push('plan_version');
  if (row.plan_uri !== expected.planRef.uri) mismatches.push('plan_uri');
  if (row.plan_sha256 !== expected.planRef.sha256) mismatches.push('plan_sha256');
  if (row.schema_version !== expected.planRef.schemaVersion) mismatches.push('schema_version');
  if (row.size_bytes !== expected.planRef.sizeBytes) mismatches.push('size_bytes');

  if (
    (row.plugin_compatibility_fingerprint ?? undefined) !==
    expected.executionPolicy.pluginCompatibilityFingerprint
  ) {
    mismatches.push('plugin_compatibility_fingerprint');
  }

  const actualCapabilities = normalizeRequiresCapabilities(row.requires_capabilities);
  const expectedCapabilities = [...(expected.executionPolicy.requiresCapabilities ?? [])].sort(
    (left, right) => left.localeCompare(right)
  );
  if (JSON.stringify(actualCapabilities) !== JSON.stringify(expectedCapabilities)) {
    mismatches.push('requires_capabilities');
  }

  if (row.canonical_plan_json !== expected.canonicalPlanJson)
    mismatches.push('canonical_plan_json');
  if (row.executable_plan_json !== expected.executablePlanJson)
    mismatches.push('executable_plan_json');

  if (mismatches.length > 0) {
    throw new Error(`PLAN_STORE_CONFLICT: ${expected.planRef.planId}:${mismatches.join(',')}`);
  }
}

function normalizeRequiresCapabilities(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('PLAN_STORE_ROW_INVALID: requires_capabilities');
  }

  return [...value].sort((left, right) => left.localeCompare(right));
}
