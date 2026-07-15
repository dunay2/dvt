/** Owned concern: select and snapshot the authoritative executable DBT source set. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  snapshotProjectContent,
  type ProjectContentLimits,
  type ProjectContentRevision,
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
  const projectConfigPath = path.join(input.projectDirectory, 'dbt_project.yml');
  const projectConfig = await readFile(projectConfigPath, 'utf8');
  const pathPolicy = evaluateDbtProjectPathPolicy(projectConfig);
  if (!pathPolicy.ok) {
    throw new DbtProjectSourcePolicyError(pathPolicy.reason, projectConfig);
  }

  const partition = resolveDbtProjectDirectoryPartition(projectConfig);
  const includedDirectories = [
    ...partition.sourceDirectories,
    ...partition.installedDependencyDirectories,
  ];
  const revision = await snapshotProjectContent(
    input.projectDirectory,
    input.snapshotDirectory,
    input.limits,
    {
      excludedDirectoryPaths: partition.generatedArtifactDirectories,
      excludedDirectoryNames: EXCLUDED_DIRECTORY_NAMES,
      shouldIncludeFile: (relativePath) =>
        isCanonicalDbtProjectSourceFile(relativePath, includedDirectories),
    }
  );

  const snapshotConfig = await readFile(
    path.join(input.snapshotDirectory, 'dbt_project.yml'),
    'utf8'
  );
  if (snapshotConfig !== projectConfig) {
    throw new Error('The dbt project changed while its source snapshot was created.');
  }
  return revision;
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
