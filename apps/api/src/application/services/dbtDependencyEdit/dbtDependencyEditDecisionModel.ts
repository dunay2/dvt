import { createHash } from 'node:crypto';

import {
  DbtDependencyEditRequestSchema,
  DbtDependencyEditResultSchema,
  type DbtDependencyEditFinding,
  type DbtDependencyEditResult,
} from '@dvt/contracts';

import type { ApplySelectedDbtDependencyEditInput } from '../../ports/dbtDependencyEdit.js';
import type {
  DbtProjectAnalysis,
  DbtProjectSemanticRegion,
} from '../../ports/dbtProjectAnalysis.js';
import { projectSelectedDbtModelAnalysis } from '../selectedDbtModelAnalysisProjection.js';
import type { SelectedDbtModelAnalysisResolver } from '../selectedDbtModelAnalysisResolver.js';

import type { DbtSemanticRegionPatchRefusal } from './dbtSemanticRegionPatchPlanner.js';

export type ParsedDbtDependencyEditRequest = ReturnType<
  typeof DbtDependencyEditRequestSchema.parse
>;

export function parseDbtDependencyEditRequest(
  input: ApplySelectedDbtDependencyEditInput
): ParsedDbtDependencyEditRequest {
  const { scope: _scope, ...request } = input;
  return DbtDependencyEditRequestSchema.parse(request);
}

export function fingerprintDbtDependencyEditRequest(
  input: ApplySelectedDbtDependencyEditInput,
  request: ParsedDbtDependencyEditRequest
): string {
  return hashStable({ scope: input.scope, request });
}

export function findStaleDbtDependencyEditAnalysis(
  request: ParsedDbtDependencyEditRequest,
  resolved: Awaited<ReturnType<SelectedDbtModelAnalysisResolver['resolve']>>
): DbtDependencyEditFinding | null {
  const checks = [
    [
      request.expectedProjectContentSetSha256,
      resolved.nativeAnalysis.projectRevision.contentSetSha256,
      'content_set',
    ],
    [request.expectedAnalysisSha256, resolved.nativeAnalysis.analysisSha256, 'native_analysis'],
    [
      request.expectedSelectedAnalysisSha256,
      resolved.selectedAnalysis.selectedAnalysisSha256,
      'selected_analysis',
    ],
  ] as const;
  const stale = checks.find(([expected, actual]) => expected !== actual);
  return stale === undefined
    ? null
    : {
        code: 'dbt_dependency_edit_analysis_stale',
        subject: { kind: 'project' },
        evidence: { reasonCode: stale[2], expectedValue: stale[0], actualValue: stale[1] },
      };
}

export function validateDbtDependencyEditCandidate(
  input: Readonly<{
    previous: DbtProjectAnalysis;
    candidate: DbtProjectAnalysis;
    candidateSelected: ReturnType<typeof projectSelectedDbtModelAnalysis>;
    region: Extract<DbtProjectSemanticRegion, { classification: 'supported' }>;
    nextTargetUniqueId: string;
    candidateContentSha256: string;
  }>
): DbtDependencyEditFinding | null {
  if (input.candidateSelected.status !== 'ready') {
    return dbtDependencyEditFinding(
      'dbt_dependency_edit_semantic_mismatch',
      { kind: 'project' },
      'selected_analysis_not_ready'
    );
  }
  const candidateRegion = input.candidate.semanticEvidence.regions.filter(
    (region) =>
      region.path === input.region.path &&
      region.kind === input.region.kind &&
      region.range.startByte === input.region.range.startByte &&
      region.ownerUniqueIds.includes(input.candidateSelected.selectedUniqueId)
  );
  if (
    candidateRegion.length !== 1 ||
    candidateRegion[0]?.classification !== 'supported' ||
    candidateRegion[0].targetUniqueId !== input.nextTargetUniqueId
  ) {
    return dbtDependencyEditFinding(
      'dbt_dependency_edit_semantic_mismatch',
      {
        kind: 'region',
        path: input.region.path,
        regionId: input.region.regionId,
      },
      'candidate_target_not_resolved'
    );
  }

  const previousByPath = new Map(
    input.previous.semanticEvidence.files.map((file) => [file.path, file])
  );
  const candidateByPath = new Map(
    input.candidate.semanticEvidence.files.map((file) => [file.path, file])
  );
  if (previousByPath.size !== candidateByPath.size) {
    return dbtDependencyEditFinding(
      'dbt_dependency_edit_invariant_failed',
      { kind: 'project' },
      'candidate_file_set_changed'
    );
  }
  for (const [path, previous] of previousByPath) {
    const candidate = candidateByPath.get(path);
    const expectedSha =
      path === input.region.path ? input.candidateContentSha256 : previous.revisionSha256;
    if (candidate?.revisionSha256 !== expectedSha) {
      return dbtDependencyEditFinding(
        'dbt_dependency_edit_invariant_failed',
        { kind: 'file', path },
        'candidate_file_revision_mismatch'
      );
    }
  }
  if (
    input.previous.projectRevision.contentSetSha256 ===
    input.candidate.projectRevision.contentSetSha256
  ) {
    return dbtDependencyEditFinding(
      'dbt_dependency_edit_invariant_failed',
      { kind: 'project' },
      'candidate_content_set_unchanged'
    );
  }
  return null;
}

export function hasOverlappingDbtSemanticRegion(
  target: DbtProjectSemanticRegion,
  regions: readonly DbtProjectSemanticRegion[]
): boolean {
  return regions.some(
    (region) =>
      region.regionId !== target.regionId &&
      region.path === target.path &&
      region.range.startByte < target.range.endByte &&
      target.range.startByte < region.range.endByte
  );
}

export function dbtDependencyEditPatchRefused(
  reason: DbtSemanticRegionPatchRefusal,
  region: DbtProjectSemanticRegion,
  nextTargetUniqueId: string
): DbtDependencyEditResult {
  const code = {
    region_code_only: 'dbt_dependency_edit_region_code_only',
    source_revision_mismatch: 'dbt_dependency_edit_analysis_stale',
    target_incompatible: 'dbt_dependency_edit_target_incompatible',
    literal_unrepresentable: 'dbt_dependency_edit_literal_unrepresentable',
  } as const;
  return dbtDependencyEditRefused(
    code[reason],
    { kind: 'region', path: region.path, regionId: region.regionId },
    {
      reasonCode: reason,
      ...(reason === 'target_incompatible' ? { actualValue: nextTargetUniqueId } : {}),
    }
  );
}

export function toDbtProjectWorkspacePath(projectRoot: string, filePath: string): string {
  if (filePath === '.') return projectRoot;
  return projectRoot === '.' ? filePath : `${projectRoot}/${filePath}`;
}

export function dbtDependencyEditFinding(
  code: DbtDependencyEditFinding['code'],
  subject: DbtDependencyEditFinding['subject'],
  reasonCode: string
): DbtDependencyEditFinding {
  return { code, subject, evidence: { reasonCode } };
}

export function dbtDependencyEditRefused(
  code: DbtDependencyEditFinding['code'],
  subject: DbtDependencyEditFinding['subject'],
  evidence?: DbtDependencyEditFinding['evidence']
): DbtDependencyEditResult {
  return dbtDependencyEditRefusedFinding({
    code,
    subject,
    ...(evidence === undefined ? {} : { evidence }),
  });
}

export function dbtDependencyEditRefusedFinding(
  findingValue: DbtDependencyEditFinding
): DbtDependencyEditResult {
  return parseDbtDependencyEditResult({
    schemaVersion: 'dbt-dependency-edit-result.v1',
    kind: 'refused',
    finding: findingValue,
  });
}

export function dbtDependencyEditConflict(
  conflicts: readonly Readonly<{ path: string; currentContentSha256: string | null }>[]
): DbtDependencyEditResult {
  return parseDbtDependencyEditResult({
    schemaVersion: 'dbt-dependency-edit-result.v1',
    kind: 'conflict',
    conflicts: [...conflicts].sort((left, right) => left.path.localeCompare(right.path)),
  });
}

export function parseDbtDependencyEditResult(value: unknown): DbtDependencyEditResult {
  return DbtDependencyEditResultSchema.parse(value);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hashStable(value: unknown): string {
  return sha256(JSON.stringify(sortJsonValue(value)));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJsonValue(nested)])
    );
  }
  return value;
}
