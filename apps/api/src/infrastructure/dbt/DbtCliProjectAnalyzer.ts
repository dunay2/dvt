/**
 * Owned concern: implement the scoped analyzer ports with one configured native lifecycle and bounded reuse instance.
 * @decision Keep one configured native request lifecycle and reuse instance behind the existing ports.
 * @consequence Consumers share evidence without sharing authorization decisions.
 */
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
  IDbtProjectSourceRevisionReader,
} from '../../application/ports/dbtProjectAnalysis.js';

import { analyzeDbtProjectRequest, type DbtAnalysisRequestRuntime } from './dbtAnalysisRequest.js';
import type { DbtAnalysisMeasurement, DbtAnalysisWork } from './dbtAnalysisResult.js';
import { DbtAnalysisReuse } from './dbtAnalysisReuse.js';
import { NODE_DBT_PROCESS_RUNNER, type DbtProcessRunner } from './dbtAnalyzerProcess.js';
import {
  DEFAULT_DBT_PROJECT_SOURCE_LIMITS,
  hashDbtProjectSource,
} from './dbtProjectSourceSnapshot.js';
import { resolveDbtProjectDirectory } from './dbtProjectWorkspaceBoundary.js';

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
  private readonly runtime: DbtAnalysisRequestRuntime;
  private readonly onAnalysis: DbtCliProjectAnalyzerOptions['onAnalysis'];

  public constructor(options: DbtCliProjectAnalyzerOptions) {
    this.runtime = {
      workspaceFilesRoot: path.resolve(options.workspaceFilesRoot),
      profilesDirectory:
        options.profilesDirectory === undefined ? null : path.resolve(options.profilesDirectory),
      dbtExecutable: options.dbtExecutable ?? 'dbt',
      timeoutMs: options.timeoutMs ?? 30_000,
      maxOutputBytes: options.maxOutputBytes ?? 1_000_000,
      sourceLimits: {
        maxFiles: options.maxProjectFiles ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxFiles,
        maxBytes: options.maxProjectBytes ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxBytes,
        maxDirectories:
          options.maxProjectDirectories ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDirectories,
        maxDepth: options.maxProjectDepth ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDepth,
      },
      processRunner: options.processRunner ?? NODE_DBT_PROCESS_RUNNER,
      processEnvironment: options.processEnvironment ?? process.env,
      now: options.now ?? (() => new Date()),
      reuse: new DbtAnalysisReuse(options.maxCachedAnalyses, options.maxCachedAnalysisBytes),
    };
    this.onAnalysis = options.onAnalysis;
  }

  public async readSourceRevision(
    input: Pick<AnalyzeDbtProjectInput, 'scope' | 'projectRoot'>
  ): Promise<string> {
    const projectDirectory = await resolveDbtProjectDirectory({
      workspaceFilesRoot: this.runtime.workspaceFilesRoot,
      ...input,
    });
    const revision = await hashDbtProjectSource({
      projectDirectory,
      limits: this.runtime.sourceLimits,
    });
    return revision.sha256;
  }

  public async analyze(input: AnalyzeDbtProjectInput): Promise<DbtProjectAnalysis> {
    const start = performance.now();
    const work: DbtAnalysisWork = {
      reuse: 'bypassed',
      snapshotMs: 0,
      processMs: 0,
      projectionMs: 0,
      sourceFiles: 0,
      sourceBytes: 0,
    };
    const analysis = await analyzeDbtProjectRequest(input, this.runtime, work);
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
}
