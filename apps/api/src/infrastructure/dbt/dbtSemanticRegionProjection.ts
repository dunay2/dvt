import { createHash } from 'node:crypto';

import type { DbtProjectAnalysisIdentity } from '../../application/ports/dbtProjectAnalysis.js';

type SourceRange = Readonly<{ startByte: number; endByte: number }>;

type SemanticRegionBase = Readonly<{
  regionId: string;
  ownerUniqueIds: readonly string[];
  path: string;
  kind: 'ref' | 'source' | 'jinja';
  range: SourceRange;
  sourceSha256: string;
}>;

export type DbtProjectedSemanticRegion =
  | (SemanticRegionBase & Readonly<{ classification: 'supported'; targetUniqueId: string }>)
  | (SemanticRegionBase & Readonly<{ classification: 'code_only'; reasonCode: string }>);

export type DbtSemanticRegionDiagnostic = Readonly<{
  code: 'dbt_semantic_region_code_only';
  severity: 'warning';
  message: string;
  subject: Readonly<{
    kind: 'region';
    path: string;
    regionId: string;
  }>;
  evidence: Readonly<{
    path: string;
    range: SourceRange;
  }>;
}>;

type SemanticRegionProjection = Readonly<{
  regions: readonly DbtProjectedSemanticRegion[];
  diagnostics: readonly DbtSemanticRegionDiagnostic[];
}>;

type FileContent = Readonly<{ path: string; content: string }>;

const JINJA_REGION_PATTERN = /\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\}/gu;
const REF_LITERAL_PATTERN = /^\s*ref\s*\(\s*(['"])([^'"]+)\1(?:\s*,\s*(['"])([^'"]+)\3)?\s*\)\s*$/u;
const SOURCE_LITERAL_PATTERN =
  /^\s*source\s*\(\s*(['"])([^'"]+)\1\s*,\s*(['"])([^'"]+)\3\s*\)\s*$/u;

export function projectDbtSemanticRegions(
  input: Readonly<{
    identities: readonly DbtProjectAnalysisIdentity[];
    files: readonly FileContent[];
  }>
): SemanticRegionProjection {
  const identityById = new Map(input.identities.map((identity) => [identity.uniqueId, identity]));
  const ownersByPath = groupOwnersByPath(input.identities);
  const regions: DbtProjectedSemanticRegion[] = [];

  for (const file of [...input.files].sort((left, right) => left.path.localeCompare(right.path))) {
    const owners = ownersByPath.get(file.path) ?? [];
    if (owners.length === 0) continue;

    for (const match of file.content.matchAll(JINJA_REGION_PATTERN)) {
      const source = match[0];
      const startIndex = match.index;
      if (source === undefined || startIndex === undefined) continue;
      const range = {
        startByte: Buffer.byteLength(file.content.slice(0, startIndex), 'utf8'),
        endByte: Buffer.byteLength(file.content.slice(0, startIndex + source.length), 'utf8'),
      };
      const sourceSha256 = sha256(source);
      const regionId = `dbt-region:${sha256(`${file.path}:${range.startByte}:${range.endByte}:${sourceSha256}`)}`;
      const ownerUniqueIds = owners.map((owner) => owner.uniqueId);
      const resolution = resolveRegion({ source, owners, identityById });
      const base = {
        regionId,
        ownerUniqueIds,
        path: file.path,
        kind: resolution.kind,
        range,
        sourceSha256,
      } as const;
      regions.push(
        resolution.classification === 'supported'
          ? { ...base, classification: 'supported', targetUniqueId: resolution.targetUniqueId }
          : { ...base, classification: 'code_only', reasonCode: resolution.reasonCode }
      );
    }
  }

  regions.sort(compareRegions);
  return {
    regions,
    diagnostics: regions
      .filter(
        (region): region is Extract<DbtProjectedSemanticRegion, { classification: 'code_only' }> =>
          region.classification === 'code_only'
      )
      .map((region) => ({
        code: 'dbt_semantic_region_code_only',
        severity: 'warning',
        message: `The dbt region is preserved as code-only (${region.reasonCode}).`,
        subject: { kind: 'region', path: region.path, regionId: region.regionId },
        evidence: { path: region.path, range: region.range },
      })),
  };
}

function resolveRegion(
  input: Readonly<{
    source: string;
    owners: readonly DbtProjectAnalysisIdentity[];
    identityById: ReadonlyMap<string, DbtProjectAnalysisIdentity>;
  }>
):
  | Readonly<{
      kind: 'ref' | 'source';
      classification: 'supported';
      targetUniqueId: string;
    }>
  | Readonly<{
      kind: 'ref' | 'source' | 'jinja';
      classification: 'code_only';
      reasonCode: string;
    }> {
  if (input.source.startsWith('{%')) {
    return { kind: 'jinja', classification: 'code_only', reasonCode: 'dbt_jinja_statement' };
  }
  if (input.source.startsWith('{#')) {
    return { kind: 'jinja', classification: 'code_only', reasonCode: 'dbt_jinja_comment' };
  }

  const expression = input.source.slice(2, -2);
  const refMatch = REF_LITERAL_PATTERN.exec(expression);
  if (refMatch !== null) {
    const firstName = refMatch[2];
    const secondName = refMatch[4];
    if (firstName === undefined) {
      return { kind: 'ref', classification: 'code_only', reasonCode: 'dbt_ref_invalid' };
    }
    const candidates = dependencyCandidates(input.owners, input.identityById).filter((identity) =>
      secondName === undefined
        ? identity.name === firstName
        : identity.packageName === firstName && identity.name === secondName
    );
    return resolveCandidates('ref', candidates);
  }
  if (/^\s*ref\s*\(/u.test(expression)) {
    return { kind: 'jinja', classification: 'code_only', reasonCode: 'dbt_jinja_dynamic_argument' };
  }

  const sourceMatch = SOURCE_LITERAL_PATTERN.exec(expression);
  if (sourceMatch !== null) {
    const sourceName = sourceMatch[2];
    const tableName = sourceMatch[4];
    if (sourceName === undefined || tableName === undefined) {
      return { kind: 'source', classification: 'code_only', reasonCode: 'dbt_source_invalid' };
    }
    const candidates = dependencyCandidates(input.owners, input.identityById).filter(
      (identity) =>
        identity.resourceType === 'source' &&
        identity.sourceName === sourceName &&
        identity.name === tableName
    );
    return resolveCandidates('source', candidates);
  }
  if (/^\s*source\s*\(/u.test(expression)) {
    return {
      kind: 'jinja',
      classification: 'code_only',
      reasonCode: 'dbt_jinja_dynamic_argument',
    };
  }
  return { kind: 'jinja', classification: 'code_only', reasonCode: 'dbt_jinja_expression' };
}

function resolveCandidates(
  kind: 'ref' | 'source',
  candidates: readonly DbtProjectAnalysisIdentity[]
):
  | Readonly<{ kind: 'ref' | 'source'; classification: 'supported'; targetUniqueId: string }>
  | Readonly<{
      kind: 'ref' | 'source';
      classification: 'code_only';
      reasonCode: string;
    }> {
  if (candidates.length === 1 && candidates[0] !== undefined) {
    return { kind, classification: 'supported', targetUniqueId: candidates[0].uniqueId };
  }
  return {
    kind,
    classification: 'code_only',
    reasonCode: `dbt_${kind}_${candidates.length === 0 ? 'not_manifest_confirmed' : 'ambiguous'}`,
  };
}

function dependencyCandidates(
  owners: readonly DbtProjectAnalysisIdentity[],
  identityById: ReadonlyMap<string, DbtProjectAnalysisIdentity>
): readonly DbtProjectAnalysisIdentity[] {
  const candidateIds = new Set(owners.flatMap((owner) => owner.dependencyUniqueIds));
  return [...candidateIds]
    .map((uniqueId) => identityById.get(uniqueId))
    .filter((identity): identity is DbtProjectAnalysisIdentity => identity !== undefined)
    .sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
}

function groupOwnersByPath(
  identities: readonly DbtProjectAnalysisIdentity[]
): ReadonlyMap<string, readonly DbtProjectAnalysisIdentity[]> {
  const grouped = new Map<string, DbtProjectAnalysisIdentity[]>();
  for (const identity of identities) {
    if (identity.originalFilePath === undefined) continue;
    const owners = grouped.get(identity.originalFilePath) ?? [];
    owners.push(identity);
    grouped.set(identity.originalFilePath, owners);
  }
  for (const owners of grouped.values()) {
    owners.sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
  }
  return grouped;
}

function compareRegions(
  left: DbtProjectedSemanticRegion,
  right: DbtProjectedSemanticRegion
): number {
  return (
    left.path.localeCompare(right.path) ||
    left.range.startByte - right.range.startByte ||
    left.range.endByte - right.range.endByte ||
    left.kind.localeCompare(right.kind)
  );
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
