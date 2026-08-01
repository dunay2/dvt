import { createHash } from 'node:crypto';

import type {
  DbtProjectAnalysisIdentity,
  DbtProjectSemanticRegion,
} from '../../ports/dbtProjectAnalysis.js';

export type DbtSemanticRegionPatchRefusal =
  | 'region_code_only'
  | 'source_revision_mismatch'
  | 'target_incompatible'
  | 'literal_unrepresentable';

export type DbtSemanticRegionPatchPlan =
  | Readonly<{ kind: 'no_change' }>
  | Readonly<{ kind: 'refused'; reason: DbtSemanticRegionPatchRefusal }>
  | Readonly<{
      kind: 'patched';
      content: string;
      contentSha256: string;
      previousSource: string;
      nextSource: string;
    }>;

export function planDbtSemanticRegionPatch(
  input: Readonly<{
    content: string;
    region: DbtProjectSemanticRegion;
    nextTarget: DbtProjectAnalysisIdentity;
  }>
): DbtSemanticRegionPatchPlan {
  if (input.region.classification === 'code_only') {
    return { kind: 'refused', reason: 'region_code_only' };
  }

  const contentBytes = Buffer.from(input.content, 'utf8');
  const { startByte, endByte } = input.region.range;
  if (startByte < 0 || endByte <= startByte || endByte > contentBytes.byteLength) {
    return { kind: 'refused', reason: 'source_revision_mismatch' };
  }
  const previousSource = contentBytes.subarray(startByte, endByte).toString('utf8');
  if (sha256(previousSource) !== input.region.sourceSha256) {
    return { kind: 'refused', reason: 'source_revision_mismatch' };
  }
  if (input.region.targetUniqueId === input.nextTarget.uniqueId) {
    return { kind: 'no_change' };
  }

  const nextSource = projectNextLiteral(input.region.kind, previousSource, input.nextTarget);
  if (nextSource.kind === 'refused') return nextSource;
  if (nextSource.value === previousSource) {
    return { kind: 'refused', reason: 'literal_unrepresentable' };
  }

  const nextContent = Buffer.concat([
    contentBytes.subarray(0, startByte),
    Buffer.from(nextSource.value, 'utf8'),
    contentBytes.subarray(endByte),
  ]).toString('utf8');
  return {
    kind: 'patched',
    content: nextContent,
    contentSha256: sha256(nextContent),
    previousSource,
    nextSource: nextSource.value,
  };
}

function projectNextLiteral(
  kind: DbtProjectSemanticRegion['kind'],
  source: string,
  target: DbtProjectAnalysisIdentity
):
  | Readonly<{ kind: 'projected'; value: string }>
  | Readonly<{ kind: 'refused'; reason: DbtSemanticRegionPatchRefusal }> {
  if (kind === 'ref') return projectRefLiteral(source, target);
  if (kind === 'source') return projectSourceLiteral(source, target);
  return { kind: 'refused', reason: 'target_incompatible' };
}

function projectRefLiteral(
  source: string,
  target: DbtProjectAnalysisIdentity
):
  | Readonly<{ kind: 'projected'; value: string }>
  | Readonly<{ kind: 'refused'; reason: DbtSemanticRegionPatchRefusal }> {
  if (!['model', 'seed', 'snapshot'].includes(target.resourceType)) {
    return { kind: 'refused', reason: 'target_incompatible' };
  }
  if (!isSafeLiteral(target.name) || !isSafeLiteral(target.packageName)) {
    return { kind: 'refused', reason: 'literal_unrepresentable' };
  }

  const single = /^(\{\{\s*ref\s*\(\s*)(['"])([^'"]+)\2(\s*\)\s*\}\})$/u.exec(source);
  if (single !== null) {
    const [prefix, quote, suffix] = [single[1], single[2], single[4]];
    if (prefix === undefined || quote === undefined || suffix === undefined) {
      return { kind: 'refused', reason: 'literal_unrepresentable' };
    }
    return { kind: 'projected', value: `${prefix}${quote}${target.name}${quote}${suffix}` };
  }

  const qualified =
    /^(\{\{\s*ref\s*\(\s*)(['"])([^'"]+)\2(\s*,\s*)(['"])([^'"]+)\5(\s*\)\s*\}\})$/u.exec(source);
  if (qualified === null) {
    return { kind: 'refused', reason: 'literal_unrepresentable' };
  }
  const [prefix, packageQuote, separator, nameQuote, suffix] = [
    qualified[1],
    qualified[2],
    qualified[4],
    qualified[5],
    qualified[7],
  ];
  if (
    prefix === undefined ||
    packageQuote === undefined ||
    separator === undefined ||
    nameQuote === undefined ||
    suffix === undefined
  ) {
    return { kind: 'refused', reason: 'literal_unrepresentable' };
  }
  return {
    kind: 'projected',
    value: `${prefix}${packageQuote}${target.packageName}${packageQuote}${separator}${nameQuote}${target.name}${nameQuote}${suffix}`,
  };
}

function projectSourceLiteral(
  source: string,
  target: DbtProjectAnalysisIdentity
):
  | Readonly<{ kind: 'projected'; value: string }>
  | Readonly<{ kind: 'refused'; reason: DbtSemanticRegionPatchRefusal }> {
  if (
    target.resourceType !== 'source' ||
    target.sourceName === undefined ||
    !isSafeLiteral(target.sourceName) ||
    !isSafeLiteral(target.name)
  ) {
    return {
      kind: 'refused',
      reason: target.resourceType === 'source' ? 'literal_unrepresentable' : 'target_incompatible',
    };
  }
  const parsed =
    /^(\{\{\s*source\s*\(\s*)(['"])([^'"]+)\2(\s*,\s*)(['"])([^'"]+)\5(\s*\)\s*\}\})$/u.exec(
      source
    );
  if (parsed === null) {
    return { kind: 'refused', reason: 'literal_unrepresentable' };
  }
  const [prefix, sourceQuote, separator, nameQuote, suffix] = [
    parsed[1],
    parsed[2],
    parsed[4],
    parsed[5],
    parsed[7],
  ];
  if (
    prefix === undefined ||
    sourceQuote === undefined ||
    separator === undefined ||
    nameQuote === undefined ||
    suffix === undefined
  ) {
    return { kind: 'refused', reason: 'literal_unrepresentable' };
  }
  return {
    kind: 'projected',
    value: `${prefix}${sourceQuote}${target.sourceName}${sourceQuote}${separator}${nameQuote}${target.name}${nameQuote}${suffix}`,
  };
}

function isSafeLiteral(value: string): boolean {
  return value.trim().length > 0 && !/['"\\\r\n]/u.test(value);
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
