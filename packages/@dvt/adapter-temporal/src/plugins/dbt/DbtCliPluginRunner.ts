import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { IDbtProjectBundleReader } from '@dvt/artifacts';
import { x as extractTarball } from 'tar';

import type {
  DbtPluginExecutionInput,
  DbtPluginRunner,
  StepResult,
} from '../../activities/stepActivities.js';

const execFileAsync = promisify(execFile);
const DBT_PROJECT_FILENAMES = new Set(['dbt_project.yml', 'dbt_project.yaml']);

type DbtSubcommand = 'run' | 'test' | 'snapshot';

interface MaterializedDbtProject {
  projectDir: string;
  cleanup(): Promise<void>;
}

type MaterializeDbtProject = (input: DbtPluginExecutionInput) => Promise<MaterializedDbtProject>;
type RunDbtCommand = (
  dbtBin: string,
  args: readonly string[],
  options: {
    cwd: string;
  }
) => Promise<{
  stdout: string;
  stderr: string;
}>;

export interface DbtCliPluginRunnerOptions {
  bundleReader: IDbtProjectBundleReader;
  dbtBin?: string;
  workdirRoot?: string;
  materializeProject?: MaterializeDbtProject;
  runCommand?: RunDbtCommand;
}

export class DbtCliPluginRunner implements DbtPluginRunner {
  private readonly dbtBin: string;
  private readonly workdirRoot: string;
  private readonly materializeProject: MaterializeDbtProject;
  private readonly runCommand: RunDbtCommand;

  public constructor(options: DbtCliPluginRunnerOptions) {
    this.dbtBin = options.dbtBin ?? 'dbt';
    this.workdirRoot = options.workdirRoot ?? join(tmpdir(), 'dvt', 'temporal-worker');
    this.materializeProject =
      options.materializeProject ??
      ((input) => materializeDbtProject(input, options.bundleReader, this.workdirRoot));
    this.runCommand = options.runCommand ?? runDbtCommand;
  }

  public async execute(input: DbtPluginExecutionInput): Promise<StepResult> {
    const project = await this.materialize(input);
    if ('failure' in project) {
      return project.failure;
    }

    return await this.runWithProject(input, project.resource);
  }

  private async materialize(
    input: DbtPluginExecutionInput
  ): Promise<{ resource: MaterializedDbtProject } | { failure: StepResult }> {
    try {
      return {
        resource: await this.materializeProject(input),
      };
    } catch (error) {
      return {
        failure: buildFailedStepResult(
          input.step.stepId,
          'DBT_PROJECT_BUNDLE_READ_FAILED',
          toErrorMessage(error)
        ),
      };
    }
  }

  private async runWithProject(
    input: DbtPluginExecutionInput,
    project: MaterializedDbtProject
  ): Promise<StepResult> {
    try {
      const args = buildDbtCliArgs(
        input.step.kind,
        input.step.stepId,
        input.pluginContext.targetProfile
      );
      await this.runCommand(this.dbtBin, args, { cwd: project.projectDir });
      return {
        stepId: input.step.stepId,
        status: 'COMPLETED',
      };
    } catch (error) {
      return buildFailedStepResult(
        input.step.stepId,
        classifyDbtCliFailure(error),
        toDbtCliFailureMessage(error)
      );
    } finally {
      await safelyCleanupProject(project);
    }
  }
}

export async function assertDbtCliAvailable(
  dbtBin: string,
  runCommand: RunDbtCommand = runDbtCommand
): Promise<void> {
  await runCommand(dbtBin, ['--version'], { cwd: process.cwd() });
}

function buildDbtCliArgs(
  stepKind: string,
  stepId: string,
  targetProfile: string | undefined
): readonly string[] {
  const subcommand = toDbtSubcommand(stepKind);
  return [
    subcommand,
    '--select',
    stepId,
    ...(typeof targetProfile === 'string' && targetProfile.trim().length > 0
      ? ['--target', targetProfile]
      : []),
  ];
}

function toDbtSubcommand(stepKind: string): DbtSubcommand {
  switch (stepKind) {
    case 'DBT_MODEL':
      return 'run';
    case 'DBT_TEST':
      return 'test';
    case 'DBT_SNAPSHOT':
      return 'snapshot';
    default:
      throw new Error(`DBT_CLI_STEP_KIND_UNSUPPORTED:${stepKind}`);
  }
}

async function materializeDbtProject(
  input: DbtPluginExecutionInput,
  bundleReader: IDbtProjectBundleReader,
  workdirRoot: string
): Promise<MaterializedDbtProject> {
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
      sync: false,
    });
    const projectDir = await findDbtProjectDirectory(workingDirectory);
    return {
      projectDir,
      cleanup: async () => {
        await rm(workingDirectory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await rm(workingDirectory, { recursive: true, force: true }).catch(() => undefined);
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

    const nestedDirectory = await findDbtProjectDirectory(candidateDirectory).catch(
      () => undefined
    );
    if (nestedDirectory !== undefined) {
      return nestedDirectory;
    }
  }

  throw new Error('DBT_PROJECT_DIRECTORY_NOT_FOUND');
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

async function runDbtCommand(
  dbtBin: string,
  args: readonly string[],
  options: {
    cwd: string;
  }
): Promise<{
  stdout: string;
  stderr: string;
}> {
  const result = await execFileAsync(dbtBin, [...args], {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function classifyDbtCliFailure(error: unknown): string {
  if (isMissingBinaryError(error)) {
    return 'DBT_CLI_NOT_FOUND';
  }

  if (isNonZeroExitError(error)) {
    return 'DBT_CLI_EXIT_NON_ZERO';
  }

  const message = toErrorMessage(error);
  if (message === 'DBT_PROJECT_DIRECTORY_NOT_FOUND') {
    return message;
  }

  if (message.startsWith('DBT_CLI_STEP_KIND_UNSUPPORTED:')) {
    return message;
  }

  return 'DBT_CLI_EXECUTION_FAILED';
}

function toDbtCliFailureMessage(error: unknown): string {
  if (isExecFileErrorWithStderr(error)) {
    const stderr = error.stderr.trim();
    if (stderr.length > 0) {
      return stderr;
    }

    const stdout = error.stdout.trim();
    if (stdout.length > 0) {
      return stdout;
    }
  }

  return toErrorMessage(error);
}

function isMissingBinaryError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ((error as Error & { code?: unknown }).code === 'ENOENT' || error.message.includes('ENOENT'))
  );
}

function isNonZeroExitError(
  error: unknown
): error is Error & { code?: number | string | undefined; stdout: string; stderr: string } {
  return isExecFileErrorWithStderr(error) && error.code !== 'ENOENT';
}

function isExecFileErrorWithStderr(
  error: unknown
): error is Error & { code?: number | string | undefined; stdout: string; stderr: string } {
  return (
    error instanceof Error &&
    'stdout' in error &&
    'stderr' in error &&
    typeof (error as { stdout?: unknown }).stdout === 'string' &&
    typeof (error as { stderr?: unknown }).stderr === 'string'
  );
}

function buildFailedStepResult(stepId: string, failureReason: string, error?: string): StepResult {
  return {
    stepId,
    status: 'FAILED',
    failureReason,
    ...(error === undefined ? {} : { error }),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Unknown dbt plugin error';
}

function sanitizePathComponent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

async function safelyCleanupProject(project: MaterializedDbtProject | null): Promise<void> {
  if (project === null) {
    return;
  }

  try {
    await project.cleanup();
  } catch {
    // Cleanup must not mask the step execution outcome.
  }
}
