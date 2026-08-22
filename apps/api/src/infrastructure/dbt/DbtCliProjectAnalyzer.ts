import { mkdir, mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { sha256HexUtf8 } from '@dvt/crypto';

import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
} from '../../application/ports/dbtProjectAnalysis.js';

import { deriveDbtAnalysisSha256 } from './dbtAnalysisIdentity.js';
import {
  buildSanitizedProcessEnvironment,
  NODE_DBT_PROCESS_RUNNER,
  type DbtProcessRunner,
} from './dbtAnalyzerProcess.js';
import { projectDbtManifest } from './dbtManifestProjection.js';
import type { ProjectContentRevision } from './dbtProjectContentRevision.js';
import { evaluateDbtProjectSnapshotPathPolicy } from './dbtProjectPathPolicy.js';
import {
  buildDbtProjectSemanticEvidence,
  EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE,
  projectDbtProjectFiles,
} from './dbtProjectSemanticEvidence.js';
import {
  DEFAULT_DBT_PROJECT_SOURCE_LIMITS,
  DbtProjectSourcePolicyError,
  snapshotDbtProjectSource,
} from './dbtProjectSourceSnapshot.js';
import { resolveDbtProjectDirectory } from './dbtProjectWorkspaceBoundary.js';

const ANALYZER_VERSION = 'dvt-dbt-analyzer.v2';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_000_000;
const INVALID_PROJECT_DIAGNOSTIC_MESSAGE =
  'dbt parse rejected the project. Review it in a trusted dbt environment.';
const INVALID_COMPILE_DIAGNOSTIC_MESSAGE =
  'dbt compile rejected the selected models. Review them in a trusted dbt environment.';

export type DbtCliProjectAnalyzerOptions = Readonly<{
  workspaceFilesRoot: string;
  profilesDirectory?: string;
  dbtExecutable?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  maxProjectFiles?: number;
  maxProjectBytes?: number;
  maxProjectDirectories?: number;
  maxProjectDepth?: number;
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
  private readonly maxProjectDirectories: number;
  private readonly maxProjectDepth: number;
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
    this.maxProjectFiles = options.maxProjectFiles ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxFiles;
    this.maxProjectBytes = options.maxProjectBytes ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxBytes;
    this.maxProjectDirectories =
      options.maxProjectDirectories ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDirectories;
    this.maxProjectDepth = options.maxProjectDepth ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDepth;
    this.processRunner = options.processRunner ?? NODE_DBT_PROCESS_RUNNER;
    this.processEnvironment = options.processEnvironment ?? process.env;
    this.now = options.now ?? (() => new Date());
  }

  public async analyze(input: AnalyzeDbtProjectInput): Promise<DbtProjectAnalysis> {
    const operation = input.operation ?? { kind: 'parse' as const };
    const analyzedAt = this.now().toISOString();
    const unavailableRevision = (reason: string) =>
      this.buildRevision(input.projectRoot, sha256HexUtf8(reason), analyzedAt);

    let projectDirectory: string;
    let projectRevision = unavailableRevision(`analysis:${input.projectRoot}`);
    let snapshotSemanticEvidence = EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE;
    try {
      projectDirectory = await this.resolveProjectDirectory(input);
    } catch {
      return this.unavailable(
        unavailableRevision(`missing:${input.projectRoot}`),
        'dbt_project_not_found',
        'The dbt project is not available in the authorized workspace.'
      );
    }

    let analysisRoot: string;
    try {
      analysisRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-analysis-'));
    } catch {
      return this.unavailable(
        unavailableRevision(`analysis-root:${input.projectRoot}`),
        'dbt_analyzer_unavailable',
        'The server-managed dbt analyzer process is unavailable.'
      );
    }

    try {
      const snapshotDirectory = path.join(analysisRoot, 'project');
      let contentRevision: ProjectContentRevision;
      try {
        contentRevision = await snapshotDbtProjectSource({
          projectDirectory,
          snapshotDirectory,
          limits: {
            maxFiles: this.maxProjectFiles,
            maxBytes: this.maxProjectBytes,
            maxDirectories: this.maxProjectDirectories,
            maxDepth: this.maxProjectDepth,
          },
        });
      } catch (error) {
        if (error instanceof DbtProjectSourcePolicyError) {
          const invalidRevision = this.buildRevision(
            input.projectRoot,
            error.contentSetSha256,
            analyzedAt
          );
          return this.invalid(
            invalidRevision,
            error.contentSetSha256,
            EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE,
            operation.kind
          );
        }
        return this.unavailable(
          unavailableRevision(`unreadable:${input.projectRoot}`),
          'dbt_project_unreadable',
          'The dbt project could not be read safely.'
        );
      }

      const contentSetSha256 = contentRevision.sha256;
      snapshotSemanticEvidence = {
        files: projectDbtProjectFiles(contentRevision, []),
        identities: [],
        regions: [],
        diagnostics: [],
      };

      projectRevision = this.buildRevision(input.projectRoot, contentSetSha256, analyzedAt);
      const pathPolicy = await evaluateDbtProjectSnapshotPathPolicy(snapshotDirectory);
      if (!pathPolicy.ok) {
        return this.invalid(
          projectRevision,
          contentSetSha256,
          snapshotSemanticEvidence,
          operation.kind
        );
      }

      const profilesDirectory = await this.resolveProfilesDirectory();
      if (profilesDirectory === null) {
        return this.unavailable(
          projectRevision,
          'dbt_analyzer_profiles_unavailable',
          'The server-managed dbt profiles directory is unavailable.',
          snapshotSemanticEvidence
        );
      }

      const targetPath = path.join(analysisRoot, 'target');
      const logPath = path.join(analysisRoot, 'logs');
      await Promise.all([mkdir(targetPath), mkdir(logPath)]);

      const processResult = await this.processRunner.run({
        executable: this.dbtExecutable,
        args: [
          operation.kind === 'compile' ? 'compile' : 'parse',
          '--no-partial-parse',
          '--no-use-colors',
          '--project-dir',
          snapshotDirectory,
          '--profiles-dir',
          profilesDirectory,
          '--target-path',
          targetPath,
          '--log-path',
          logPath,
          ...(operation.kind === 'compile' ? ['--select', ...operation.selectors] : []),
        ],
        cwd: snapshotDirectory,
        env: buildSanitizedProcessEnvironment(this.processEnvironment, analysisRoot),
        timeoutMs: this.timeoutMs,
        maxOutputBytes: this.maxOutputBytes,
      });

      if (processResult.kind === 'unavailable') {
        return this.unavailable(
          projectRevision,
          'dbt_analyzer_unavailable',
          'The server-managed dbt analyzer process is unavailable.',
          snapshotSemanticEvidence
        );
      }

      if (processResult.exitCode !== 0) {
        return this.invalid(
          projectRevision,
          contentSetSha256,
          snapshotSemanticEvidence,
          operation.kind
        );
      }

      const manifest = JSON.parse(
        await readFile(path.join(targetPath, 'manifest.json'), 'utf8')
      ) as unknown;
      const projection = projectDbtManifest(manifest);
      const semanticEvidence = await buildDbtProjectSemanticEvidence({
        snapshotDirectory,
        contentRevision,
        identities: projection.identities,
      });
      return {
        status: 'valid',
        ...(projection.adapterType === undefined ? {} : { adapterType: projection.adapterType }),
        projectRevision: {
          ...projectRevision,
          projectName: projection.projectName,
          ...(projection.dbtVersion === undefined ? {} : { dbtVersion: projection.dbtVersion }),
        },
        analysisSha256: deriveDbtAnalysisSha256({
          status: 'valid',
          contentSetSha256,
          analyzerVersion: ANALYZER_VERSION,
          ...(projection.dbtVersion === undefined ? {} : { dbtVersion: projection.dbtVersion }),
          ...(projection.adapterType === undefined ? {} : { adapterType: projection.adapterType }),
          resources: projection.resources,
          dependencies: projection.dependencies,
          diagnostics: projection.diagnostics,
          semanticEvidence,
        }),
        resources: projection.resources,
        dependencies: projection.dependencies,
        diagnostics: projection.diagnostics,
        semanticEvidence,
      };
    } catch {
      return this.unavailable(
        projectRevision,
        'dbt_analyzer_unavailable',
        'The dbt analyzer could not produce a fresh manifest.',
        snapshotSemanticEvidence
      );
    } finally {
      await rm(analysisRoot, { recursive: true, force: true });
    }
  }

  private async resolveProjectDirectory(input: AnalyzeDbtProjectInput): Promise<string> {
    return resolveDbtProjectDirectory({
      workspaceFilesRoot: this.workspaceFilesRoot,
      scope: input.scope,
      projectRoot: input.projectRoot,
    });
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
    message: string,
    semanticEvidence = EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE
  ): DbtProjectAnalysis {
    const diagnostics = [{ code, severity: 'error' as const, message }];
    return {
      status: 'unavailable',
      projectRevision,
      analysisSha256: deriveDbtAnalysisSha256({
        status: 'unavailable',
        contentSetSha256: projectRevision.contentSetSha256,
        analyzerVersion: projectRevision.analyzerVersion,
        ...(projectRevision.dbtVersion === undefined
          ? {}
          : { dbtVersion: projectRevision.dbtVersion }),
        resources: [],
        dependencies: [],
        diagnostics,
        semanticEvidence,
      }),
      resources: [],
      dependencies: [],
      diagnostics,
      semanticEvidence,
    };
  }

  private invalid(
    projectRevision: DbtProjectAnalysis['projectRevision'],
    contentSetSha256: string,
    semanticEvidence = EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE,
    operation: NonNullable<AnalyzeDbtProjectInput['operation']>['kind'] = 'parse'
  ): DbtProjectAnalysis {
    const diagnostics = [
      {
        code: 'dbt_project_invalid',
        severity: 'error' as const,
        message:
          operation === 'compile'
            ? INVALID_COMPILE_DIAGNOSTIC_MESSAGE
            : INVALID_PROJECT_DIAGNOSTIC_MESSAGE,
      },
    ];
    return {
      status: 'invalid',
      projectRevision,
      analysisSha256: deriveDbtAnalysisSha256({
        status: 'invalid',
        contentSetSha256,
        analyzerVersion: projectRevision.analyzerVersion,
        ...(projectRevision.dbtVersion === undefined
          ? {}
          : { dbtVersion: projectRevision.dbtVersion }),
        resources: [],
        dependencies: [],
        diagnostics,
        semanticEvidence,
      }),
      resources: [],
      dependencies: [],
      diagnostics,
      semanticEvidence,
    };
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
