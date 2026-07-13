import { mkdir, mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
} from '../../application/ports/dbtProjectAnalysis.js';
import { resolveWorkspaceScopeStorageRoot } from '../workspaceFiles/workspaceScopeStoragePath.js';

import { hashDbtAnalysis, sha256Hex } from './dbtAnalysisHash.js';
import {
  buildSanitizedProcessEnvironment,
  NODE_DBT_PROCESS_RUNNER,
  normalizeProcessDiagnostic,
  type DbtProcessRunner,
} from './dbtAnalyzerProcess.js';
import { projectDbtManifest } from './dbtManifestProjection.js';
import { hashProjectContent } from './dbtProjectContentRevision.js';

const ANALYZER_VERSION = 'dvt-dbt-analyzer.v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_000_000;
const DEFAULT_MAX_PROJECT_FILES = 10_000;
const DEFAULT_MAX_PROJECT_BYTES = 50_000_000;

type DbtCliProjectAnalyzerOptions = Readonly<{
  workspaceFilesRoot: string;
  profilesDirectory?: string;
  dbtExecutable?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  maxProjectFiles?: number;
  maxProjectBytes?: number;
  processRunner?: DbtProcessRunner;
  processEnvironment?: NodeJS.ProcessEnv;
  now?: () => Date;
}>;

export class DbtCliProjectAnalyzer implements IDbtProjectAnalyzerPort {
  private readonly workspaceFilesRoot: string;
  private readonly profilesDirectory: string | null;
  private readonly dbtExecutable: string;
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;
  private readonly maxProjectFiles: number;
  private readonly maxProjectBytes: number;
  private readonly processRunner: DbtProcessRunner;
  private readonly processEnvironment: NodeJS.ProcessEnv;
  private readonly now: () => Date;

  public constructor(options: DbtCliProjectAnalyzerOptions) {
    this.workspaceFilesRoot = path.resolve(options.workspaceFilesRoot);
    this.profilesDirectory =
      options.profilesDirectory === undefined ? null : path.resolve(options.profilesDirectory);
    this.dbtExecutable = options.dbtExecutable ?? 'dbt';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.maxProjectFiles = options.maxProjectFiles ?? DEFAULT_MAX_PROJECT_FILES;
    this.maxProjectBytes = options.maxProjectBytes ?? DEFAULT_MAX_PROJECT_BYTES;
    this.processRunner = options.processRunner ?? NODE_DBT_PROCESS_RUNNER;
    this.processEnvironment = options.processEnvironment ?? process.env;
    this.now = options.now ?? (() => new Date());
  }

  public async analyze(input: AnalyzeDbtProjectInput): Promise<DbtProjectAnalysis> {
    const analyzedAt = this.now().toISOString();
    const unavailableRevision = (reason: string) =>
      this.buildRevision(input.projectRoot, sha256Hex(reason), analyzedAt);

    let projectDirectory: string;
    try {
      projectDirectory = await this.resolveProjectDirectory(input);
    } catch {
      return this.unavailable(
        unavailableRevision(`missing:${input.projectRoot}`),
        'dbt_project_not_found',
        'The dbt project is not available in the authorized workspace.'
      );
    }

    let contentSetSha256: string;
    try {
      contentSetSha256 = (
        await hashProjectContent(projectDirectory, {
          maxFiles: this.maxProjectFiles,
          maxBytes: this.maxProjectBytes,
        })
      ).sha256;
    } catch {
      return this.unavailable(
        unavailableRevision(`unreadable:${input.projectRoot}`),
        'dbt_project_unreadable',
        'The dbt project could not be read safely.'
      );
    }

    const projectRevision = this.buildRevision(input.projectRoot, contentSetSha256, analyzedAt);
    const profilesDirectory = await this.resolveProfilesDirectory();
    if (profilesDirectory === null) {
      return this.unavailable(
        projectRevision,
        'dbt_analyzer_profiles_unavailable',
        'The server-managed dbt profiles directory is unavailable.'
      );
    }

    const analysisRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-analysis-'));
    const targetPath = path.join(analysisRoot, 'target');
    const logPath = path.join(analysisRoot, 'logs');
    await Promise.all([mkdir(targetPath), mkdir(logPath)]);

    try {
      const processResult = await this.processRunner.run({
        executable: this.dbtExecutable,
        args: [
          'parse',
          '--no-partial-parse',
          '--no-use-colors',
          '--project-dir',
          projectDirectory,
          '--profiles-dir',
          profilesDirectory,
          '--target-path',
          targetPath,
          '--log-path',
          logPath,
        ],
        cwd: projectDirectory,
        env: buildSanitizedProcessEnvironment(this.processEnvironment, analysisRoot),
        timeoutMs: this.timeoutMs,
        maxOutputBytes: this.maxOutputBytes,
      });

      if (processResult.kind === 'unavailable') {
        return this.unavailable(
          projectRevision,
          'dbt_analyzer_unavailable',
          'The server-managed dbt analyzer process is unavailable.'
        );
      }

      if (processResult.exitCode !== 0) {
        const diagnostics = [
          {
            code: 'dbt_project_invalid',
            severity: 'error' as const,
            message: normalizeProcessDiagnostic(processResult, [
              [projectDirectory, '<project>'],
              [profilesDirectory, '<profiles>'],
              [analysisRoot, '<analysis>'],
            ]),
          },
        ];
        return {
          status: 'invalid',
          projectRevision,
          analysisSha256: hashDbtAnalysis('invalid', contentSetSha256, [], [], diagnostics),
          resources: [],
          dependencies: [],
          diagnostics,
        };
      }

      const manifest = JSON.parse(
        await readFile(path.join(targetPath, 'manifest.json'), 'utf8')
      ) as unknown;
      const projection = projectDbtManifest(manifest);
      return {
        status: 'valid',
        projectRevision: {
          ...projectRevision,
          ...(projection.dbtVersion === undefined ? {} : { dbtVersion: projection.dbtVersion }),
        },
        analysisSha256: hashDbtAnalysis(
          'valid',
          contentSetSha256,
          projection.resources,
          projection.dependencies,
          projection.diagnostics
        ),
        resources: projection.resources,
        dependencies: projection.dependencies,
        diagnostics: projection.diagnostics,
      };
    } catch {
      return this.unavailable(
        projectRevision,
        'dbt_analyzer_unavailable',
        'The dbt analyzer could not produce a fresh manifest.'
      );
    } finally {
      await rm(analysisRoot, { recursive: true, force: true });
    }
  }

  private async resolveProjectDirectory(input: AnalyzeDbtProjectInput): Promise<string> {
    const scopeRoot = resolveWorkspaceScopeStorageRoot(this.workspaceFilesRoot, input.scope);
    const requestedDirectory = path.resolve(scopeRoot, ...input.projectRoot.split('/'));
    assertContainedPath(scopeRoot, requestedDirectory);

    const [realScopeRoot, realProjectDirectory] = await Promise.all([
      realpath(scopeRoot),
      realpath(requestedDirectory),
    ]);
    assertContainedPath(realScopeRoot, realProjectDirectory);
    if (!(await isFile(path.join(realProjectDirectory, 'dbt_project.yml')))) {
      throw new Error('dbt_project.yml was not found.');
    }
    return realProjectDirectory;
  }

  private async resolveProfilesDirectory(): Promise<string | null> {
    if (this.profilesDirectory === null) return null;
    try {
      const [realWorkspaceFilesRoot, realProfilesDirectory] = await Promise.all([
        realpath(this.workspaceFilesRoot),
        realpath(this.profilesDirectory),
      ]);
      if (isContainedPath(realWorkspaceFilesRoot, realProfilesDirectory)) return null;
      const hasProfile =
        (await isFile(path.join(realProfilesDirectory, 'profiles.yml'))) ||
        (await isFile(path.join(realProfilesDirectory, 'profiles.yaml')));
      return hasProfile ? realProfilesDirectory : null;
    } catch {
      return null;
    }
  }

  private buildRevision(projectRoot: string, contentSetSha256: string, analyzedAt: string) {
    return {
      projectRoot,
      contentSetSha256,
      analyzedAt,
      analyzerVersion: ANALYZER_VERSION,
    };
  }

  private unavailable(
    projectRevision: DbtProjectAnalysis['projectRevision'],
    code: string,
    message: string
  ): DbtProjectAnalysis {
    const diagnostics = [{ code, severity: 'error' as const, message }];
    return {
      status: 'unavailable',
      projectRevision,
      analysisSha256: hashDbtAnalysis(
        'unavailable',
        projectRevision.contentSetSha256,
        [],
        [],
        diagnostics
      ),
      resources: [],
      dependencies: [],
      diagnostics,
    };
  }
}

function assertContainedPath(root: string, candidate: string): void {
  if (!isContainedPath(root, candidate)) {
    throw new Error('The dbt project root escaped the authorized workspace scope.');
  }
}

function isContainedPath(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function isFile(candidate: string): Promise<boolean> {
  return stat(candidate)
    .then((value) => value.isFile())
    .catch(() => false);
}
