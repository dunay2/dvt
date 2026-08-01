import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  DbtProjectAnalysisFile,
  DbtProjectAnalysisIdentity,
  DbtProjectSemanticEvidence,
} from '../../application/ports/dbtProjectAnalysis.js';

import type { ProjectContentRevision } from './dbtProjectContentRevision.js';
import { projectDbtSemanticRegions } from './dbtSemanticRegionProjection.js';

const JINJA_SOURCE_EXTENSIONS = new Set(['.sql', '.yml', '.yaml', '.md']);

export async function buildDbtProjectSemanticEvidence(
  input: Readonly<{
    snapshotDirectory: string;
    contentRevision: ProjectContentRevision;
    identities: readonly DbtProjectAnalysisIdentity[];
  }>
): Promise<DbtProjectSemanticEvidence> {
  const identitiesByPath = groupIdentitiesByPath(input.identities);
  const files = input.contentRevision.entries.map((entry) => ({
    path: entry.path,
    revisionSha256: entry.sha256,
    byteLength: entry.bytes,
    kind: classifyFile(entry.path, identitiesByPath.get(entry.path) ?? []),
  }));
  const contentPathSet = new Set(input.contentRevision.entries.map((entry) => entry.path));
  const semanticPaths = [...identitiesByPath.keys()]
    .filter(
      (filePath) =>
        contentPathSet.has(filePath) &&
        JINJA_SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    )
    .sort();
  const semanticFiles = await Promise.all(
    semanticPaths.map(async (filePath) => ({
      path: filePath,
      content: await readFile(path.join(input.snapshotDirectory, ...filePath.split('/')), 'utf8'),
    }))
  );
  const projected = projectDbtSemanticRegions({
    identities: input.identities,
    files: semanticFiles,
  });

  return {
    files,
    identities: input.identities,
    regions: projected.regions,
    diagnostics: projected.diagnostics,
  };
}

export const EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE: DbtProjectSemanticEvidence = Object.freeze({
  files: Object.freeze([]),
  identities: Object.freeze([]),
  regions: Object.freeze([]),
  diagnostics: Object.freeze([]),
});

function classifyFile(
  filePath: string,
  identities: readonly DbtProjectAnalysisIdentity[]
): DbtProjectAnalysisFile['kind'] {
  if (/^dbt_project\.ya?ml$/iu.test(filePath)) return 'project_config';
  if (/\.ya?ml$/iu.test(filePath)) return 'schema';
  const resourceTypes = new Set(identities.map((identity) => identity.resourceType));
  for (const kind of ['macro', 'model', 'snapshot', 'seed', 'test', 'source'] as const) {
    if (resourceTypes.has(kind)) return kind;
  }
  return 'other';
}

function groupIdentitiesByPath(
  identities: readonly DbtProjectAnalysisIdentity[]
): ReadonlyMap<string, readonly DbtProjectAnalysisIdentity[]> {
  const grouped = new Map<string, DbtProjectAnalysisIdentity[]>();
  for (const identity of identities) {
    if (identity.originalFilePath === undefined) continue;
    const values = grouped.get(identity.originalFilePath) ?? [];
    values.push(identity);
    grouped.set(identity.originalFilePath, values);
  }
  return grouped;
}
