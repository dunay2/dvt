import { mkdir, mkdtemp, readFile, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { sha256HexUtf8 } from '@dvt/crypto';

import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
  IDbtProjectSourceRevisionReader,
} from '../../application/ports/dbtProjectAnalysis.js';

import { deriveDbtAnalysisSha256 } from './dbtAnalysisIdentity.js';
import {
  buildSanitizedProcessEnvironment,
  NODE_DBT_PROCESS_RUNNER,
  type DbtProcessRunner,
} from './dbtAnalyzerProcess.js';
import { projectDbtManifest } from './dbtManifestProjection.js';
import {
  readDbtParseAnalysisContext,
  writeDbtParseProfilesSnapshot,
  type DbtParseAnalysisContext,
} from './dbtParseAnalysisContext.js';
import { DbtParseAnalysisReuse, type DbtParseReuseDisposition } from './dbtParseAnalysisReuse.js';
import { isDbtParseReuseEligible } from './dbtParseReuseEligibility.js';
import type { ProjectContentLimits, ProjectContentRevision } from './dbtProjectContentRevision.js';
import { evaluateDbtProjectSnapshotPathPolicy } from './dbtProjectPathPolicy.js';
import {
  buildDbtProjectSemanticEvidence,
  EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE,
  projectDbtProjectFiles,
} from './dbtProjectSemanticEvidence.js';
import {
  DEFAULT_DBT_PROJECT_SOURCE_LIMITS,
  DbtProjectSourcePolicyError,
  hashDbtProjectSource,
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

type AnalysisWork = {
  reuse: DbtParseReuseDisposition;
  snapshotMs: number;
  processMs: number;
  projectionMs: number;
  sourceFiles: number;
  sourceBytes: number;
};
export type DbtAnalysisMeasurement = Readonly<
  AnalysisWork & {
    operation: 'parse' | 'compile';
    status: DbtProjectAnalysis['status'];
    totalMs: number;
  }
>;
type SnapshotAnalysisInput = Readonly<{
  input: AnalyzeDbtProjectInput;
  analysisRoot: string;
  snapshotDirectory: string;
  profilesDirectory: string;
  contentRevision: ProjectContentRevision;
  projectRevision: DbtProjectAnalysis['projectRevision'];
  snapshotSemanticEvidence: DbtProjectAnalysis['semanticEvidence'];
  environment: NodeJS.ProcessEnv;
  work: AnalysisWork;
}>;

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
  maxCachedAnalyses?: number;
  maxCachedAnalysisBytes?: number;
  onAnalysis?: (measurement: DbtAnalysisMeasurement) => void;
}>;

export class DbtCliProjectAnalyzer
  implements IDbtProjectAnalyzerPort, IDbtProjectSourceRevisionReader
{
  private readonly workspaceFilesRoot: string;
  private readonly profilesDirectory: string | null;
  private readonly dbtExecutable: string;
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;
  private readonly sourceLimits: ProjectContentLimits;
  private readonly processRunner: DbtProcessRunner;
  private readonly processEnvironment: NodeJS.ProcessEnv;
  private readonly now: () => Date;
  private readonly reuse: DbtParseAnalysisReuse;
  private readonly onAnalysis: DbtCliProjectAnalyzerOptions['onAnalysis'];

  public constructor(options: DbtCliProjectAnalyzerOptions) {
    this.workspaceFilesRoot = path.resolve(options.workspaceFilesRoot);
    this.profilesDirectory =
      options.profilesDirectory === undefined ? null : path.resolve(options.profilesDirectory);
    this.dbtExecutable = options.dbtExecutable ?? 'dbt';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.sourceLimits = {
      maxFiles: options.maxProjectFiles ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxFiles,
      maxBytes: options.maxProjectBytes ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxBytes,
      maxDirectories:
        options.maxProjectDirectories ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDirectories,
      maxDepth: options.maxProjectDepth ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDepth,
    };
    this.processRunner = options.processRunner ?? NODE_DBT_PROCESS_RUNNER;
    this.processEnvironment = options.processEnvironment ?? process.env;
    this.now = options.now ?? (() => new Date());
    this.reuse = new DbtParseAnalysisReuse(
      options.maxCachedAnalyses,
      options.maxCachedAnalysisBytes
    );
    this.onAnalysis = options.onAnalysis;
  }

  public async readSourceRevision(
    input: Pick<AnalyzeDbtProjectInput, 'scope' | 'projectRoot'>
  ): Promise<string> {
    const projectDirectory = await this.resolveProjectDirectory(input);
    const revision = await hashDbtProjectSource({ projectDirectory, limits: this.sourceLimits });
    return revision.sha256;
  }

  public async analyze(input: AnalyzeDbtProjectInput): Promise<DbtProjectAnalysis> {
    const start = performance.now();
    const work: AnalysisWork = {
      reuse: 'bypassed',
      snapshotMs: 0,
      processMs: 0,
      projectionMs: 0,
      sourceFiles: 0,
      sourceBytes: 0,
    };
    const analysis = await this.analyzeRequest(input, work);
    try {
      this.onAnalysis?.({
        ...work,
        operation: input.operation?.kind ?? 'parse',
        status: analysis.status,
        totalMs: performance.now() - start,
      });
    } catch {
      /* Observability cannot change the analysis outcome. */
    }
    return analysis;
  }

  private async analyzeRequest(
    input: AnalyzeDbtProjectInput,
    work: AnalysisWork
  ): Promise<DbtProjectAnalysis> {
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
      const snapshotStart = performance.now();
      try {
        contentRevision = await snapshotDbtProjectSource({
          projectDirectory,
          snapshotDirectory,
          limits: this.sourceLimits,
        });
      } catch (error) {
        if (error instanceof DbtProjectSourcePolicyError) {
          const invalidRevision = this.buildRevision(
            input.projectRoot,
            error.contentSetSha256,
            analyzedAt
          );
          return this.invalid(invalidRevision, EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE, operation.kind);
        }
        return this.unavailable(
          unavailableRevision(`unreadable:${input.projectRoot}`),
          'dbt_project_unreadable',
          'The dbt project could not be read safely.'
        );
      }

      work.snapshotMs = performance.now() - snapshotStart;
      work.sourceFiles = contentRevision.files;
      work.sourceBytes = contentRevision.bytes;
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
        return this.invalid(projectRevision, snapshotSemanticEvidence, operation.kind);
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

      const context =
        operation.kind === 'parse'
          ? await readDbtParseAnalysisContext(profilesDirectory, this.processEnvironment)
          : null;
      const snapshot: SnapshotAnalysisInput = {
        input,
        analysisRoot,
        snapshotDirectory,
        profilesDirectory,
        contentRevision,
        projectRevision,
        snapshotSemanticEvidence,
        environment: this.processEnvironment,
        work,
      };
      const eligible =
        context !== null &&
        (await isDbtParseReuseEligible({
          snapshotDirectory,
          contentRevision,
          profileContents: context.profiles.map((profile) => profile.contents.toString('utf8')),
        }));
      if (!eligible || context === null) return await this.analyzeSnapshot(snapshot);
      const key = JSON.stringify([
        input.scope.tenantId,
        input.scope.projectId,
        input.scope.environmentId,
        projectDirectory,
        input.projectRoot,
        contentSetSha256,
        context.identity,
        ANALYZER_VERSION,
      ]);
      const verifyCurrent = async (analysis: DbtProjectAnalysis) => {
        if (
          analysis.status !== 'valid' ||
          (await this.isContextCurrent(input, projectDirectory, contentSetSha256, context))
        )
          return analysis;
        return this.unavailable(
          projectRevision,
          'dbt_project_changed_during_analysis',
          'The dbt project or its managed analysis context changed during analysis.',
          snapshotSemanticEvidence
        );
      };
      const result = await this.reuse.getOrAnalyze(key, async () =>
        verifyCurrent(
          await this.analyzeSnapshot({
            ...snapshot,
            profilesDirectory: await writeDbtParseProfilesSnapshot(analysisRoot, context),
            environment: context.environment,
          })
        )
      );
      work.reuse = result.disposition;
      return result.disposition === 'joined' || result.disposition === 'reused'
        ? await verifyCurrent(result.analysis)
        : result.analysis;
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

  private async isContextCurrent(
    input: AnalyzeDbtProjectInput,
    projectDirectory: string,
    contentSetSha256: string,
    context: DbtParseAnalysisContext
  ): Promise<boolean> {
    try {
      if ((await this.resolveProjectDirectory(input)) !== projectDirectory) return false;
      const profilesDirectory = await this.resolveProfilesDirectory();
      if (profilesDirectory === null) return false;
      const [revision, currentContext] = await Promise.all([
        hashDbtProjectSource({ projectDirectory, limits: this.sourceLimits }),
        readDbtParseAnalysisContext(profilesDirectory, this.processEnvironment),
      ]);
      return revision.sha256 === contentSetSha256 && currentContext.identity === context.identity;
    } catch {
      return false;
    }
  }

  private async analyzeSnapshot({
    input,
    analysisRoot,
    snapshotDirectory,
    profilesDirectory,
    contentRevision,
    projectRevision,
    snapshotSemanticEvidence,
    environment,
    work,
  }: SnapshotAnalysisInput): Promise<DbtProjectAnalysis> {
    const operation = input.operation ?? { kind: 'parse' as const };
    const contentSetSha256 = contentRevision.sha256;
    const targetPath = path.join(analysisRoot, 'target');
    const logPath = path.join(analysisRoot, 'logs');
    await Promise.all([mkdir(targetPath), mkdir(logPath)]);

    const processStart = performance.now();
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
      env: buildSanitizedProcessEnvironment(environment, analysisRoot),
      timeoutMs: this.timeoutMs,
      maxOutputBytes: this.maxOutputBytes,
    });

    work.processMs = performance.now() - processStart;
    if (processResult.kind === 'unavailable') {
      return this.unavailable(
        projectRevision,
        'dbt_analyzer_unavailable',
        'The server-managed dbt analyzer process is unavailable.',
        snapshotSemanticEvidence
      );
    }

    if (processResult.exitCode !== 0) {
      return this.invalid(projectRevision, snapshotSemanticEvidence, operation.kind);
    }

    const projectionStart = performance.now();
    const manifest = JSON.parse(
      await readFile(path.join(targetPath, 'manifest.json'), 'utf8')
    ) as unknown;
    const projection = projectDbtManifest(manifest);
    const semanticEvidence = await buildDbtProjectSemanticEvidence({
      snapshotDirectory,
      contentRevision,
      identities: projection.identities,
    });
    const analysis: DbtProjectAnalysis = {
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
    work.projectionMs = performance.now() - projectionStart;
    return analysis;
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
    return this.failure(
      'unavailable',
      projectRevision,
      [{ code, severity: 'error', message }],
      semanticEvidence
    );
  }

  private invalid(
    projectRevision: DbtProjectAnalysis['projectRevision'],
    semanticEvidence = EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE,
    operation: NonNullable<AnalyzeDbtProjectInput['operation']>['kind'] = 'parse'
  ): DbtProjectAnalysis {
    return this.failure(
      'invalid',
      projectRevision,
      [
        {
          code: 'dbt_project_invalid',
          severity: 'error',
          message:
            operation === 'compile'
              ? INVALID_COMPILE_DIAGNOSTIC_MESSAGE
              : INVALID_PROJECT_DIAGNOSTIC_MESSAGE,
        },
      ],
      semanticEvidence
    );
  }

  private failure(
    status: 'invalid' | 'unavailable',
    projectRevision: DbtProjectAnalysis['projectRevision'],
    diagnostics: DbtProjectAnalysis['diagnostics'],
    semanticEvidence: DbtProjectAnalysis['semanticEvidence']
  ): DbtProjectAnalysis {
    return {
      status,
      projectRevision,
      analysisSha256: deriveDbtAnalysisSha256({
        status,
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
