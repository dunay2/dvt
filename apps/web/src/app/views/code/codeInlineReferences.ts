/** Owned concern: admit revision-bound dbt reference evidence for the open Code buffer. */
import type { DbtProjectGraphProjection, DbtSelectedModelAnalysis } from '@dvt/contracts';
import { sha256Hex, sha256HexUtf8 } from '@dvt/crypto';

import type { MonacoInlineReferences } from '../../components/monaco/monacoInlineReferences';
import type { FileContent } from '../../ports/workspace';

type ProjectedNode = DbtProjectGraphProjection['nodes'][number];
type AnalyzedFile = DbtSelectedModelAnalysis['files'][number];
type SemanticRegion = DbtSelectedModelAnalysis['regions'][number];

export type CodeInlineIneligibilityReason =
  | 'project-unavailable'
  | 'project-stale'
  | 'analysis-unavailable'
  | 'analysis-not-ready'
  | 'authority-mismatch'
  | 'revision-mismatch'
  | 'model-unresolved'
  | 'selection-mismatch'
  | 'dirty-buffer'
  | 'file-mismatch'
  | 'invalid-region'
  | 'no-supported-references';

export type CodeInlineReferenceDetail = Readonly<{
  id: string;
  uniqueId: string;
  name: string;
  kind: 'model' | 'source';
  columns: readonly ProjectedNode['columns'][number][];
  inputs: readonly string[];
  definition?: Readonly<{ path: string; revisionSha256: string }>;
}>;

export type CodeInlineReferenceProjection =
  | Readonly<{
      kind: 'ready';
      references: MonacoInlineReferences;
      details: readonly CodeInlineReferenceDetail[];
    }>
  | Readonly<{ kind: 'text-only'; reason: CodeInlineIneligibilityReason }>;

export function isCodeInlineReferenceFile(
  file: Pick<FileContent, 'language'> | undefined
): boolean {
  return file?.language.toLowerCase() === 'sql';
}

function normalizedRelativePath(path: string | undefined): string | undefined {
  if (!path || path.includes('\0') || path.includes(':')) return undefined;
  const physical = path.replace(/\\/gu, '/');
  if (physical.startsWith('/')) return undefined;
  const segments = physical.split('/');
  if (segments.includes('..')) return undefined;
  return segments.filter((part) => part !== '' && part !== '.').join('/');
}

function scopedProjectPath(root: string, path: string | undefined): string | undefined {
  const relative = normalizedRelativePath(path);
  return relative ? (root ? `${root}/${relative}` : relative) : undefined;
}

export function resolveCodeSelectedModel(
  project: DbtProjectGraphProjection | undefined,
  path: string | undefined
): string | undefined {
  if (!project || project.freshness !== 'fresh') return undefined;
  const authority = project.authorityBinding.authority;
  if (authority.kind !== 'dbt-project-files') return undefined;
  const root = normalizedRelativePath(authority.projectRoot);
  const filePath = normalizedRelativePath(path);
  if (
    root === undefined ||
    !filePath ||
    normalizedRelativePath(project.projectRevision.projectRoot) !== root
  )
    return undefined;
  const matches = project.nodes.filter(
    (node) =>
      node.resourceType === 'model' && scopedProjectPath(root, node.originalFilePath) === filePath
  );
  return matches.length === 1 ? matches[0]?.uniqueId : undefined;
}

function readReferenceRange(bytes: Uint8Array, region: SemanticRegion) {
  const { startByte, endByte } = region.range;
  if (
    !Number.isSafeInteger(startByte) ||
    !Number.isSafeInteger(endByte) ||
    startByte < 0 ||
    endByte <= startByte ||
    endByte > bytes.length
  )
    return undefined;
  const source = bytes.subarray(startByte, endByte);
  if (sha256Hex(source) !== region.sourceSha256) return undefined;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    const startOffset =
      decoder.decode(bytes.subarray(0, startByte)).length -
      (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 1 : 0);
    if (startOffset < 0) return undefined;
    const sourceText = decoder.decode(source);
    return { startOffset, endOffset: startOffset + sourceText.length, sourceText };
  } catch {
    return undefined;
  }
}

function referenceDefinition(root: string, node: ProjectedNode, files: readonly AnalyzedFile[]) {
  if (
    node.visualEditability.status !== 'editable' &&
    node.visualEditability.reasons.includes('external_package')
  )
    return undefined;
  const original =
    node.originalFilePath ??
    (node.resourceType === 'source' ? node.descriptionFilePath : undefined);
  const path = scopedProjectPath(root, original);
  if (path === undefined) return undefined;
  const matches = files.filter((file) => scopedProjectPath(root, file.path) === path);
  return matches.length === 1 && matches[0]
    ? { path, revisionSha256: matches[0].revisionSha256 }
    : undefined;
}

export function projectCodeInlineReferences({
  project,
  analysis,
  file,
  value,
}: Readonly<{
  project: DbtProjectGraphProjection | undefined;
  analysis: DbtSelectedModelAnalysis | undefined;
  file: FileContent;
  value: string;
}>): CodeInlineReferenceProjection {
  const refuse = (reason: CodeInlineIneligibilityReason): CodeInlineReferenceProjection => ({
    kind: 'text-only',
    reason,
  });
  if (!project) return refuse('project-unavailable');
  if (project.freshness !== 'fresh') return refuse('project-stale');
  if (!analysis) return refuse('analysis-unavailable');
  if (analysis.status !== 'ready') return refuse('analysis-not-ready');
  const authority = project.authorityBinding.authority;
  const analysisAuthority = analysis.authorityBinding.authority;
  if (authority.kind !== 'dbt-project-files' || analysisAuthority.kind !== 'dbt-project-files')
    return refuse('authority-mismatch');
  const root = normalizedRelativePath(authority.projectRoot);
  if (
    root === undefined ||
    root !== normalizedRelativePath(analysisAuthority.projectRoot) ||
    root !== normalizedRelativePath(project.projectRevision.projectRoot) ||
    root !== normalizedRelativePath(analysis.projectRevision.projectRoot) ||
    project.authorityBinding.canvasId !== analysis.authorityBinding.canvasId
  )
    return refuse('authority-mismatch');
  if (
    project.analysisSha256 !== analysis.analysisSha256 ||
    project.projectRevision.contentSetSha256 !== analysis.projectRevision.contentSetSha256
  )
    return refuse('revision-mismatch');
  const selected = resolveCodeSelectedModel(project, file.path);
  if (!selected) return refuse('model-unresolved');
  const selectedIdentities = analysis.identities.filter(
    (identity) => identity.relationToSelection === 'selected'
  );
  const filePath = normalizedRelativePath(file.path);
  if (
    analysis.selectedUniqueId !== selected ||
    selectedIdentities.length !== 1 ||
    selectedIdentities[0]?.uniqueId !== selected ||
    selectedIdentities[0].resourceType !== 'model' ||
    scopedProjectPath(root, selectedIdentities[0].originalFilePath) !== filePath
  )
    return refuse('selection-mismatch');
  if (value !== file.content) return refuse('dirty-buffer');
  const bytes = new TextEncoder().encode(value);
  const currentFiles = analysis.files.filter(
    (entry) => scopedProjectPath(root, entry.path) === filePath
  );
  const analyzedFile = currentFiles.length === 1 ? currentFiles[0] : undefined;
  if (
    !analyzedFile ||
    analyzedFile.kind !== 'model' ||
    sha256HexUtf8(value) !== file.contentSha256 ||
    analyzedFile.revisionSha256 !== file.contentSha256 ||
    analyzedFile.byteLength !== bytes.length ||
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) !== value
  )
    return refuse('file-mismatch');

  const nodes = new Map(project.nodes.map((node) => [node.uniqueId, node]));
  const items: MonacoInlineReferences['items'][number][] = [];
  const details: CodeInlineReferenceDetail[] = [];
  const ids = new Set<string>();
  let previousEnd = 0;
  for (const region of analysis.regions) {
    if (scopedProjectPath(root, region.path) !== filePath) continue;
    const range = readReferenceRange(bytes, region);
    if (!range || region.range.startByte < previousEnd || ids.has(region.regionId))
      return refuse('invalid-region');
    previousEnd = region.range.endByte;
    ids.add(region.regionId);
    if (region.classification !== 'supported') continue;
    const node = nodes.get(region.targetUniqueId);
    if (
      !node ||
      !(
        (region.kind === 'ref' && node.resourceType === 'model') ||
        (region.kind === 'source' && node.resourceType === 'source')
      )
    )
      continue;
    const kind = node.resourceType as 'model' | 'source';
    const inputs = [
      ...new Set(
        project.edges
          .filter((edge) => edge.relation === 'dependency' && edge.targetUniqueId === node.uniqueId)
          .map((edge) => edge.sourceUniqueId)
      ),
    ]
      .flatMap((id) => {
        const input = nodes.get(id);
        return input ? [input.name] : [];
      })
      .sort();
    items.push({
      id: region.regionId,
      ...range,
      label: node.name,
      kind,
      inputs,
      outputLabel: node.name,
      columnCount: node.columns.length,
    });
    const definition = referenceDefinition(root, node, analysis.files);
    details.push({
      id: region.regionId,
      uniqueId: node.uniqueId,
      name: node.name,
      kind,
      columns: node.columns,
      inputs,
      ...(definition ? { definition } : {}),
    });
  }
  return items.length > 0
    ? {
        kind: 'ready',
        references: {
          path: file.path,
          value: value.startsWith('\uFEFF') ? value.slice(1) : value,
          items,
        },
        details,
      }
    : refuse('no-supported-references');
}
