/**
 * Owned concern: bind persisted DBT plans to immutable project-bundle and
 * run-execution-context artifacts before delegating to engine start-run.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import {
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RESULT_KIND,
  buildCanonicalDbtProjectBundleRelativePath,
  type ExecutionPlan,
  type RunExecutionContext,
  type RunExecutionContextRef,
  type RunExecutionPolicy,
  type ScopedPlanRef,
  type StartRunCommand,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
} from '@dvt/contracts';
import { TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS } from '@dvt/temporal-dbt-plugin';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import { parseStoredExecutablePlan } from './storedExecutablePlan.js';

type StoredPlanArtifactForRunBinding = {
  readonly bytes: Uint8Array;
  readonly executionPolicy?: RunExecutionPolicy;
};

type StoredPlanArtifactReaderForRunBinding = {
  fetchStoredPlanArtifactForValidation(
    input: ScopedPlanRef
  ): Promise<StoredPlanArtifactForRunBinding>;
};

type DbtWorkspaceBundleFile = {
  readonly workspacePath: string;
  readonly bytes: Buffer;
};

type DbtWorkspaceBundleInspection = {
  readonly files: readonly DbtWorkspaceBundleFile[];
  readonly hasProfile: boolean;
};

type DbtRunArtifactBinding =
  | {
      readonly ok: true;
      readonly runExecutionContextRef: RunExecutionContextRef;
    }
  | {
      readonly ok: false;
      readonly reason: string;
    };

const gzipAsync = promisify(gzip);

const DBT_EXECUTABLE_STEP_KINDS = new Set<string>(TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS);
const DBT_PROJECT_FILENAMES = new Set(['dbt_project.yml', 'dbt_project.yaml']);
const DBT_INCLUDED_EXACT_FILES = new Set([
  'dbt_project.yml',
  'dbt_project.yaml',
  'packages.yml',
  'selectors.yml',
]);
const DBT_PROFILE_FILENAMES = new Set(['profiles.yml']);
const DBT_INCLUDED_DIRECTORIES = new Set([
  'analyses',
  'macros',
  'models',
  'seeds',
  'snapshots',
  'tests',
]);
const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vite',
  'dist',
  'node_modules',
]);
const TAR_BLOCK_SIZE = 512;
const DBT_WORKSPACE_PROFILE_REJECTION_REASON =
  'dbt workspace profiles.yml requires a server-owned profile reference before runtime execution';

export class DbtRunExecutionContextBindingUseCase implements IStartRunUseCase {
  public constructor(
    private readonly deps: {
      readonly delegate: IStartRunUseCase;
      readonly planStore: StoredPlanArtifactReaderForRunBinding;
      readonly resolveWorkspaceRoot: (scope: WorkspaceStorageScope) => string;
      readonly dbtBundleStore: DbtProjectBundleArtifactStore | undefined;
    }
  ) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    if (command.planRef === undefined || command.runExecutionContextRef !== undefined) {
      return this.deps.delegate.execute(command, context);
    }
    const commandWithPlanRef: StartRunCommand & {
      readonly planRef: NonNullable<StartRunCommand['planRef']>;
    } = {
      ...command,
      planRef: command.planRef,
    };

    const scopedPlanRef = toScopedPlanRef(commandWithPlanRef, context);
    const artifact = await this.deps.planStore.fetchStoredPlanArtifactForValidation(scopedPlanRef);
    const plan = parseStoredExecutablePlan(artifact.bytes, { rejectUnknownStepKinds: false });
    if (!isDbtPlan(plan)) {
      return this.deps.delegate.execute(command, context);
    }

    const binding = await this.createDbtRunArtifactBinding({
      command: commandWithPlanRef,
      context,
      executionPolicy: artifact.executionPolicy,
    });
    if (!binding.ok) {
      return rejectRunExecutionContext(binding.reason);
    }

    return this.deps.delegate.execute(
      {
        ...command,
        runExecutionContextRef: binding.runExecutionContextRef,
      },
      context
    );
  }

  private async createDbtRunArtifactBinding(input: {
    readonly command: StartRunCommand & {
      readonly planRef: NonNullable<StartRunCommand['planRef']>;
    };
    readonly context: AuthorizedCommandExecutionContext;
    readonly executionPolicy: RunExecutionPolicy | undefined;
  }): Promise<DbtRunArtifactBinding> {
    if (this.deps.dbtBundleStore === undefined) {
      return { ok: false, reason: 'dbt project bundle artifact store is not configured' };
    }
    if (this.deps.dbtBundleStore.kind !== 'file') {
      return {
        ok: false,
        reason: 'dbt project bundle artifact auto-binding requires a file artifact store',
      };
    }

    const workspaceScope = toWorkspaceStorageScope(input.context);
    if (workspaceScope === null) {
      return {
        ok: false,
        reason: 'dbt project bundle requires tenant, project, and environment scope',
      };
    }
    const workspaceBundle = await inspectDbtWorkspaceBundle(
      this.deps.resolveWorkspaceRoot(workspaceScope)
    );
    if (workspaceBundle.hasProfile) {
      return { ok: false, reason: DBT_WORKSPACE_PROFILE_REJECTION_REASON };
    }
    if (
      workspaceBundle.files.some((file) => DBT_PROJECT_FILENAMES.has(file.workspacePath)) === false
    ) {
      return { ok: false, reason: 'dbt project bundle requires dbt_project.yml' };
    }

    const bundleBytes = await createGzippedTarball(workspaceBundle.files);
    const bundleSha256 = sha256Hex(bundleBytes);
    const tenantId = input.context.scope.tenantId.value;
    const bundleRelativePath = buildCanonicalDbtProjectBundleRelativePath(tenantId, bundleSha256);
    const bundlePath = resolve(this.deps.dbtBundleStore.rootPath, bundleRelativePath);
    await mkdir(dirname(bundlePath), { recursive: true });
    await writeFile(bundlePath, bundleBytes);

    const projectBundleRef = {
      uri: pathToFileURL(bundlePath).href,
      kind: 'dbt-project-bundle' as const,
      sha256: bundleSha256,
      tenantId,
      sizeBytes: bundleBytes.byteLength,
    };
    const runExecutionContextInput = {
      command: input.command,
      context: input.context,
      projectBundleRef,
      ...(input.executionPolicy?.pluginCompatibilityFingerprint === undefined
        ? {}
        : {
            pluginCompatibilityFingerprint: input.executionPolicy.pluginCompatibilityFingerprint,
          }),
    };
    const runExecutionContext = buildRunExecutionContext(runExecutionContextInput);
    const runExecutionContextBytes = Buffer.from(
      JSON.stringify(runExecutionContext, null, 2),
      'utf8'
    );
    const runExecutionContextSha256 = sha256Hex(runExecutionContextBytes);
    const runExecutionContextPath = resolve(
      this.deps.dbtBundleStore.rootPath,
      'run-contexts',
      tenantId,
      `${input.command.runId}.json`
    );
    await mkdir(dirname(runExecutionContextPath), { recursive: true });
    await writeFile(runExecutionContextPath, runExecutionContextBytes);

    return {
      ok: true,
      runExecutionContextRef: parseRunExecutionContextRef({
        uri: pathToFileURL(runExecutionContextPath).href,
        sha256: runExecutionContextSha256,
        schemaVersion: runExecutionContext.schemaVersion,
        planId: input.command.planRef.planId,
        planVersion: input.command.planRef.planVersion,
        ...(input.executionPolicy?.pluginCompatibilityFingerprint === undefined
          ? {}
          : {
              pluginCompatibilityFingerprint: input.executionPolicy.pluginCompatibilityFingerprint,
            }),
      }),
    };
  }
}

function toWorkspaceStorageScope(
  context: AuthorizedCommandExecutionContext
): WorkspaceStorageScope | null {
  const projectId = context.scope.projectId?.value;
  const environmentId = context.scope.environmentId?.value;
  if (projectId === undefined || environmentId === undefined) {
    return null;
  }

  return {
    tenantId: context.scope.tenantId.value,
    projectId,
    environmentId,
  };
}

function toScopedPlanRef(
  command: StartRunCommand & { readonly planRef: NonNullable<StartRunCommand['planRef']> },
  context: AuthorizedCommandExecutionContext
): ScopedPlanRef {
  return {
    tenantId: context.scope.tenantId.value,
    projectId: context.scope.projectId?.value ?? '',
    environmentId: context.scope.environmentId?.value ?? '',
    planRef: command.planRef,
  };
}

function isDbtPlan(plan: ExecutionPlan): boolean {
  return plan.steps.some((step) => DBT_EXECUTABLE_STEP_KINDS.has(step.kind));
}

async function inspectDbtWorkspaceBundle(
  workspaceRoot: string
): Promise<DbtWorkspaceBundleInspection> {
  const root = resolve(workspaceRoot);
  const files: DbtWorkspaceBundleFile[] = [];
  let hasProfile = false;

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
          continue;
        }
        await visit(join(directory, entry.name));
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const absolutePath = join(directory, entry.name);
      const workspacePath = normalizeWorkspacePath(relative(root, absolutePath));
      if (isDbtProfilePath(workspacePath)) {
        hasProfile = true;
        continue;
      }
      if (!shouldIncludeDbtWorkspacePath(workspacePath)) {
        continue;
      }

      files.push({
        workspacePath,
        bytes: await readFile(absolutePath),
      });
    }
  }

  await visit(root);
  return {
    files: files.sort((left, right) => left.workspacePath.localeCompare(right.workspacePath)),
    hasProfile,
  };
}

function isDbtProfilePath(workspacePath: string): boolean {
  const pathSegments = workspacePath.split('/');
  const fileName = pathSegments.at(-1);
  return fileName !== undefined && DBT_PROFILE_FILENAMES.has(fileName);
}

function shouldIncludeDbtWorkspacePath(workspacePath: string): boolean {
  const pathSegments = workspacePath.split('/');
  if (DBT_INCLUDED_EXACT_FILES.has(workspacePath)) {
    return true;
  }

  const topLevelDirectory = pathSegments[0];
  return topLevelDirectory !== undefined && DBT_INCLUDED_DIRECTORIES.has(topLevelDirectory);
}

function normalizeWorkspacePath(value: string): string {
  return value.split(sep).join('/');
}

async function createGzippedTarball(files: readonly DbtWorkspaceBundleFile[]): Promise<Buffer> {
  const tarBytes = Buffer.concat([...createTarEntries(files), Buffer.alloc(TAR_BLOCK_SIZE * 2, 0)]);
  return gzipAsync(tarBytes);
}

function createTarEntries(files: readonly DbtWorkspaceBundleFile[]): Buffer[] {
  const entries: Buffer[] = [];
  const directories = new Set<string>(['bundle/']);

  for (const file of files) {
    let current = 'bundle';
    for (const segment of dirname(file.workspacePath)
      .split('/')
      .filter((value) => value !== '.')) {
      current = `${current}/${segment}`;
      directories.add(`${current}/`);
    }
  }

  for (const directory of [...directories].sort()) {
    entries.push(createTarHeader(directory, 0, '5'), Buffer.alloc(0));
  }
  for (const file of files) {
    const tarPath = `bundle/${file.workspacePath}`;
    entries.push(createTarHeader(tarPath, file.bytes.byteLength, '0'));
    entries.push(file.bytes);
    entries.push(Buffer.alloc(padToTarBlock(file.bytes.byteLength), 0));
  }

  return entries;
}

function createTarHeader(name: string, size: number, typeflag: '0' | '5'): Buffer {
  const header = Buffer.alloc(TAR_BLOCK_SIZE, 0);
  writeTarString(header, name, 0, 100);
  writeTarOctal(header, typeflag === '5' ? 0o755 : 0o644, 100, 8);
  writeTarOctal(header, 0, 108, 8);
  writeTarOctal(header, 0, 116, 8);
  writeTarOctal(header, size, 124, 12);
  writeTarOctal(header, 0, 136, 12);
  header.fill(0x20, 148, 156);
  writeTarString(header, typeflag, 156, 1);
  writeTarString(header, 'ustar', 257, 6);
  writeTarString(header, '00', 263, 2);
  const checksum = header.reduce((total, value) => total + value, 0);
  writeTarOctal(header, checksum, 148, 8);
  return header;
}

function writeTarString(header: Buffer, value: string, offset: number, length: number): void {
  const rendered = Buffer.from(value, 'utf8');
  if (rendered.byteLength > length) {
    throw new Error(`TAR_PATH_TOO_LONG: ${basename(value)}`);
  }
  rendered.copy(header, offset, 0, rendered.byteLength);
}

function writeTarOctal(header: Buffer, value: number, offset: number, length: number): void {
  const rendered = `${value.toString(8).padStart(length - 2, '0')}\0 `;
  header.write(rendered.slice(0, length), offset, length, 'ascii');
}

function padToTarBlock(size: number): number {
  const remainder = size % TAR_BLOCK_SIZE;
  return remainder === 0 ? 0 : TAR_BLOCK_SIZE - remainder;
}

function buildRunExecutionContext(input: {
  readonly command: StartRunCommand & { readonly planRef: NonNullable<StartRunCommand['planRef']> };
  readonly context: AuthorizedCommandExecutionContext;
  readonly projectBundleRef: {
    readonly uri: string;
    readonly kind: 'dbt-project-bundle';
    readonly sha256: string;
    readonly tenantId: string;
    readonly sizeBytes: number;
  };
  readonly pluginCompatibilityFingerprint?: string;
}): RunExecutionContext {
  return parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: input.command.planRef.planId,
    planVersion: input.command.planRef.planVersion,
    planSha256: input.command.planRef.sha256,
    ...(input.pluginCompatibilityFingerprint === undefined
      ? {}
      : { pluginCompatibilityFingerprint: input.pluginCompatibilityFingerprint }),
    tenantId: input.context.scope.tenantId.value,
    projectId: input.context.scope.projectId?.value ?? '',
    environmentId: input.context.scope.environmentId?.value ?? '',
    targetAdapter: input.command.targetAdapter,
    createdAtIso: input.context.authorizedAt.toISOString(),
    createdBy: input.context.principal.principalId,
    pluginContexts: {
      dbt: {
        projectBundleRef: input.projectBundleRef,
      },
    },
  });
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function rejectRunExecutionContext(reason: string): StartRunUseCaseResult {
  return {
    ok: true,
    value: {
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code: START_RUN_PLAN_REJECTION_CODE.rejected,
      reason,
      cause: 'run_execution_context',
    },
  };
}
