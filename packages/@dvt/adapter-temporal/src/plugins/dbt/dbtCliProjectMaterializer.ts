/**
 * @file packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliProjectMaterializer.ts
 * @ownedConcern Materialize DBT project bundles into worker-local temporary directories
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Isolate bundle reading, archive extraction, project discovery, and cleanup
 * @consequence DBT CLI orchestration stays independent from filesystem materialization details
 * @version 1.0.0
 */
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { IDbtProjectBundleReader } from '@dvt/artifacts';
import { x as extractTarball } from 'tar';

import type { DbtProjectMaterializer, MaterializedDbtProject } from './dbtCliTypes.js';
import type { DbtPluginExecutionInput } from './dbtPluginTypes.js';

const DBT_PROJECT_FILENAMES = new Set(['dbt_project.yml', 'dbt_project.yaml']);

export interface DbtProjectMaterializerOptions {
  readonly bundleReader: IDbtProjectBundleReader;
  readonly workdirRoot: string;
}

interface DbtProjectMaterializationRequest extends DbtProjectMaterializerOptions {
  readonly input: DbtPluginExecutionInput;
}

export function createDbtProjectMaterializer(
  options: DbtProjectMaterializerOptions
): DbtProjectMaterializer {
  return (input) =>
    materializeDbtProject({
      ...options,
      input,
    });
}

export async function cleanupMaterializedDbtProject(
  project: MaterializedDbtProject
): Promise<void> {
  try {
    await project.cleanup();
  } catch {
    // Cleanup must not mask the step execution outcome.
  }
}

async function materializeDbtProject(
  request: DbtProjectMaterializationRequest
): Promise<MaterializedDbtProject> {
  const { input, bundleReader, workdirRoot } = request;
  const projectBundleRef = input.pluginContext.projectBundleRef;
  const bundleBytes = await bundleReader.read(projectBundleRef, {
    expectedTenantId: input.runExecutionContext.tenantId,
  });
  await mkdir(workdirRoot, { recursive: true });
  const workingDirectory = await mkdtemp(
    join(
      workdirRoot,
      `run-${sanitizePathComponent(input.executionIdentity.runId)}-${sanitizePathComponent(input.step.stepId)}-`
    )
  );
  const archivePath = join(workingDirectory, 'project.tgz');

  try {
    await writeFile(archivePath, bundleBytes);
    await extractTarball({
      cwd: workingDirectory,
      file: archivePath,
      gzip: true,
    });
    const projectDir = await findDbtProjectDirectory(workingDirectory);
    return {
      projectDir,
      cleanup: () => removeWorkingDirectory(workingDirectory),
    };
  } catch (error) {
    await removeWorkingDirectoryIfPresent(workingDirectory);
    throw error;
  }
}

async function findDbtProjectDirectory(rootDirectory: string): Promise<string> {
  if (await hasDbtProjectFile(rootDirectory)) {
    return rootDirectory;
  }

  const entries = await readdir(rootDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidateDirectory = join(rootDirectory, entry.name);
    if (await hasDbtProjectFile(candidateDirectory)) {
      return candidateDirectory;
    }

    const nestedDirectory = await tryFindDbtProjectDirectory(candidateDirectory);
    if (nestedDirectory !== null) {
      return nestedDirectory;
    }
  }

  throw new Error('DBT_PROJECT_DIRECTORY_NOT_FOUND');
}

async function tryFindDbtProjectDirectory(rootDirectory: string): Promise<string | null> {
  try {
    return await findDbtProjectDirectory(rootDirectory);
  } catch {
    return null;
  }
}

async function hasDbtProjectFile(directory: string): Promise<boolean> {
  for (const filename of DBT_PROJECT_FILENAMES) {
    const candidatePath = join(directory, filename);
    try {
      const candidateStat = await stat(candidatePath);
      if (candidateStat.isFile()) {
        return true;
      }
    } catch {
      // Ignore missing candidates; the caller controls fallback scanning.
    }
  }

  return false;
}

function removeWorkingDirectory(workingDirectory: string): Promise<void> {
  return rm(workingDirectory, { recursive: true, force: true });
}

async function removeWorkingDirectoryIfPresent(workingDirectory: string): Promise<void> {
  try {
    await removeWorkingDirectory(workingDirectory);
  } catch {
    // Cleanup after materialization failure must not mask the original failure.
  }
}

function sanitizePathComponent(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9_-]+/g, '-');
}
