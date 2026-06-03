/** Owned concern: project workspace file trees into Code route file-selection state. */
import type { WorkspaceFileEntry, WorkspaceGraphSnapshot } from '../../ports/workspace';
import type { DbtNode } from '../../types/dbt';

const WORKFLOW_ARTIFACT_PATH_PATTERN = /^pipelines\/.+\.ya?ml$/i;
const MODEL_ARTIFACT_PATH_PATTERN = /^models\/.+\.sql$/i;
const DEFAULT_TRANSFORMATION_WORKFLOW_ARTIFACT_PATH =
  'pipelines/project-transformation-preview.yaml';
const DBT_PROJECT_FILE_PATH = 'dbt_project.yml';
const DBT_SCHEMA_FILE_PATH = 'models/schema.yml';

function flattenCodeWorkspaceFiles(entries: readonly WorkspaceFileEntry[]): WorkspaceFileEntry[] {
  return entries.flatMap((entry) => {
    if (entry.kind === 'file') {
      return [entry];
    }

    if (entry.children) {
      return flattenCodeWorkspaceFiles(entry.children);
    }

    return [];
  });
}

function isWorkflowArtifactFile(entry: WorkspaceFileEntry): boolean {
  return entry.kind === 'file' && WORKFLOW_ARTIFACT_PATH_PATTERN.test(entry.path);
}

function isModelArtifactFile(entry: WorkspaceFileEntry): boolean {
  return entry.kind === 'file' && MODEL_ARTIFACT_PATH_PATTERN.test(entry.path);
}

function normalizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}

function addNonEmptyPath(paths: Set<string>, path: string | undefined): void {
  const trimmedPath = path?.trim();
  if (trimmedPath) {
    paths.add(trimmedPath);
  }
}

function isDbtNode(node: DbtNode): boolean {
  return node.package === 'dbt';
}

function isDbtModelNode(node: DbtNode): boolean {
  return isDbtNode(node) && node.type === 'MODEL';
}

function isNonDbtModelNode(node: DbtNode): boolean {
  return !isDbtNode(node) && node.type === 'MODEL';
}

function addGraphNodeFilePath(paths: Set<string>, node: DbtNode): void {
  addNonEmptyPath(paths, node.path);

  if (isDbtModelNode(node)) {
    paths.add(`models/${normalizeIdentifier(node.name, node.id)}.sql`);
    return;
  }

  if (isNonDbtModelNode(node)) {
    paths.add(`models/${node.id}.sql`);
  }
}

export function deriveCodeGraphFilePaths(
  graph: WorkspaceGraphSnapshot | undefined
): ReadonlySet<string> {
  const paths = new Set<string>();
  if (!graph || graph.nodes.length === 0) {
    return paths;
  }

  const hasDbtNodes = graph.nodes.some(isDbtNode);

  for (const node of graph.nodes) {
    addGraphNodeFilePath(paths, node);
  }

  if (hasDbtNodes) {
    paths.add(DBT_PROJECT_FILE_PATH);
    paths.add(DBT_SCHEMA_FILE_PATH);
  } else {
    paths.add(DEFAULT_TRANSFORMATION_WORKFLOW_ARTIFACT_PATH);
  }

  return paths;
}

function filterCodeWorkspaceFilesByPathScope(
  entries: readonly WorkspaceFileEntry[],
  scopedPaths: ReadonlySet<string>,
  includeWorkflowArtifacts: boolean
): WorkspaceFileEntry[] {
  return entries.flatMap((entry) => {
    if (entry.kind === 'file') {
      return scopedPaths.has(entry.path) ||
        (includeWorkflowArtifacts && isWorkflowArtifactFile(entry))
        ? [entry]
        : [];
    }

    const children = filterCodeWorkspaceFilesByPathScope(
      entry.children ?? [],
      scopedPaths,
      includeWorkflowArtifacts
    );
    return children.length > 0 ? [{ ...entry, children }] : [];
  });
}

export function resolveInitialCodeFilePath(
  entries: readonly WorkspaceFileEntry[]
): string | undefined {
  const files = flattenCodeWorkspaceFiles(entries);
  return (files.find(isWorkflowArtifactFile) ?? files.find(isModelArtifactFile) ?? files[0])?.path;
}

export function hasCodeWorkspaceFiles(entries: readonly WorkspaceFileEntry[]): boolean {
  return resolveInitialCodeFilePath(entries) !== undefined;
}

export function hasCodeWorkspaceFilePath(
  entries: readonly WorkspaceFileEntry[],
  path: string | undefined
): boolean {
  return path != null && flattenCodeWorkspaceFiles(entries).some((entry) => entry.path === path);
}

export function resolveGraphScopedCodeWorkspaceFileTree(args: {
  entries: readonly WorkspaceFileEntry[];
  graph: WorkspaceGraphSnapshot | undefined;
}): WorkspaceFileEntry[] {
  const graphFilePaths = deriveCodeGraphFilePaths(args.graph);
  if (graphFilePaths.size === 0) {
    return [...args.entries];
  }

  const includeWorkflowArtifacts =
    args.graph != null && args.graph.nodes.length > 0 && !args.graph.nodes.some(isDbtNode);
  const scopedTree = filterCodeWorkspaceFilesByPathScope(
    args.entries,
    graphFilePaths,
    includeWorkflowArtifacts
  );
  return hasCodeWorkspaceFiles(scopedTree) ? scopedTree : [...args.entries];
}
