/** Owned concern: select and snapshot the authoritative executable DBT source set. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  hashProjectContent,
  snapshotProjectContent,
  type ProjectContentLimits,
  type ProjectContentRevision,
  type ProjectContentSelection,
} from './dbtProjectContentRevision.js';
import {
  evaluateDbtProjectPathPolicy,
  resolveDbtProjectDirectoryPartition,
} from './dbtProjectPathPolicy.js';

const DBT_ROOT_SOURCE_FILES = new Set([
  'dbt_project.yml',
  'dependencies.yml',
  'package-lock.yml',
  'packages.yml',
  'selectors.yml',
]);
const DBT_SOURCE_EXTENSIONS = new Set(['.csv', '.md', '.py', '.sql', '.yaml', '.yml']);
const EXCLUDED_DIRECTORY_NAMES = [
  '.dvt',
  '.git',
  '.next',
  '.turbo',
  '.venv',
  '.vite',
  '__pycache__',
  'dist',
  'node_modules',
  'venv',
] as const;
const SENSITIVE_FILE_NAME =
  /^(?:\.env(?:\..+)?|credentials?(?:\..+)?|profiles?\.(?:yml|yaml)|secrets?(?:\..+)?|service[-_]?account(?:\..+)?)$/iu;
const SENSITIVE_FILE_EXTENSION = /\.(?:key|p12|pem|pfx)$/iu;

export const DEFAULT_DBT_PROJECT_SOURCE_LIMITS: ProjectContentLimits = Object.freeze({
  maxFiles: 10_000,
  maxBytes: 50_000_000,
  maxDirectories: 5_000,
  maxDepth: 64,
});

export class DbtProjectSourcePolicyError extends Error {
  public readonly contentSetSha256: string;

  public constructor(
    readonly reason: string,
    projectConfig: string
  ) {
    super(`DBT project source policy rejected the project: ${reason}`);
    this.name = 'DbtProjectSourcePolicyError';
    this.contentSetSha256 = createHash('sha256').update(projectConfig, 'utf8').digest('hex');
  }
}

export async function snapshotDbtProjectSource(input: {
  readonly projectDirectory: string;
  readonly snapshotDirectory: string;
  readonly limits: ProjectContentLimits;
}): Promise<ProjectContentRevision> {
  const sourcePolicy = await loadDbtProjectSourcePolicy(input.projectDirectory);
  const revision = await snapshotProjectContent(
    input.projectDirectory,
    input.snapshotDirectory,
    input.limits,
    sourcePolicy.selection
  );

  await verifyDbtProjectConfigUnchanged(input.projectDirectory, sourcePolicy.projectConfig);
  return revision;
}

export async function hashDbtProjectSource(input: {
  readonly projectDirectory: string;
  readonly limits: ProjectContentLimits;
}): Promise<ProjectContentRevision> {
  const sourcePolicy = await loadDbtProjectSourcePolicy(input.projectDirectory);
  const revision = await hashProjectContent(
    input.projectDirectory,
    input.limits,
    sourcePolicy.selection
  );
  await verifyDbtProjectConfigUnchanged(input.projectDirectory, sourcePolicy.projectConfig);
  return revision;
}

async function loadDbtProjectSourcePolicy(projectDirectory: string): Promise<
  Readonly<{
    projectConfig: string;
    selection: ProjectContentSelection;
  }>
> {
  const projectConfig = await readFile(path.join(projectDirectory, 'dbt_project.yml'), 'utf8');
  const pathPolicy = evaluateDbtProjectPathPolicy(projectConfig);
  if (!pathPolicy.ok) {
    throw new DbtProjectSourcePolicyError(pathPolicy.reason, projectConfig);
  }

  const partition = resolveDbtProjectDirectoryPartition(projectConfig);
  const includedDirectories = [
    ...partition.sourceDirectories,
    ...partition.installedDependencyDirectories,
  ];
  return {
    projectConfig,
    selection: {
      excludedDirectoryPaths: partition.generatedArtifactDirectories,
      excludedDirectoryNames: EXCLUDED_DIRECTORY_NAMES,
      shouldIncludeFile: (relativePath) =>
        isCanonicalDbtProjectSourceFile(relativePath, includedDirectories),
    },
  };
}

async function verifyDbtProjectConfigUnchanged(
  projectDirectory: string,
  expectedProjectConfig: string
): Promise<void> {
  const currentProjectConfig = await readFile(
    path.join(projectDirectory, 'dbt_project.yml'),
    'utf8'
  );
  if (currentProjectConfig !== expectedProjectConfig) {
    throw new Error('The dbt project changed while its source revision was read.');
  }
}

function isCanonicalDbtProjectSourceFile(
  relativePath: string,
  includedDirectories: readonly string[]
): boolean {
  if (DBT_ROOT_SOURCE_FILES.has(relativePath)) return true;

  const fileName = path.posix.basename(relativePath);
  if (SENSITIVE_FILE_NAME.test(fileName) || SENSITIVE_FILE_EXTENSION.test(fileName)) {
    return false;
  }
  if (!DBT_SOURCE_EXTENSIONS.has(path.posix.extname(fileName).toLowerCase())) {
    return false;
  }

  return includedDirectories.some(
    (directory) => directory === '.' || relativePath.startsWith(`${directory}/`)
  );
}
