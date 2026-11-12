/**
 * Owned concern: execute one prepared native snapshot and project only its current-run manifest.
 * @decision Prepare one bounded source copy and read only its native current-run manifest.
 * @consequence Workspace-generated or stale target artifacts cannot satisfy analysis.
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { sha256HexUtf8 } from '@dvt/crypto';

import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
} from '../../application/ports/dbtProjectAnalysis.js';

import {
  buildDbtAnalysisResult,
  buildDbtAnalysisRevision,
  invalidDbtAnalysis,
  unavailableDbtAnalysis,
  type DbtAnalysisWork,
} from './dbtAnalysisResult.js';
import { buildSanitizedProcessEnvironment, type DbtProcessRunner } from './dbtAnalyzerProcess.js';
import { projectDbtManifest } from './dbtManifestProjection.js';
import type { ProjectContentLimits, ProjectContentRevision } from './dbtProjectContentRevision.js';
import { buildDbtProjectSemanticEvidence } from './dbtProjectSemanticEvidence.js';
import {
  DbtProjectSourcePolicyError,
  snapshotDbtProjectSource,
} from './dbtProjectSourceSnapshot.js';

export type DbtSnapshotAnalysisInput = Readonly<{
  input: AnalyzeDbtProjectInput;
  analysisRoot: string;
  snapshotDirectory: string;
  profilesDirectory: string;
  contentRevision: ProjectContentRevision;
  projectRevision: DbtProjectAnalysis['projectRevision'];
  snapshotSemanticEvidence: DbtProjectAnalysis['semanticEvidence'];
  environment: NodeJS.ProcessEnv;
  work: DbtAnalysisWork;
}>;

type NativeExecution = Readonly<{
  dbtExecutable: string;
  timeoutMs: number;
  maxOutputBytes: number;
  processRunner: DbtProcessRunner;
}>;

/** Copy/hash one source snapshot, preserving typed source-policy rejection. */
export async function prepareDbtAnalysisSnapshot(input: {
  readonly projectDirectory: string;
  readonly snapshotDirectory: string;
  readonly projectRoot: string;
  readonly analyzedAt: string;
  readonly operation: NonNullable<AnalyzeDbtProjectInput['operation']>['kind'];
  readonly sourceLimits: ProjectContentLimits;
}): Promise<
  | Readonly<{ ok: true; contentRevision: ProjectContentRevision }>
  | Readonly<{ ok: false; analysis: DbtProjectAnalysis }>
> {
  try {
    const contentRevision = await snapshotDbtProjectSource({
      projectDirectory: input.projectDirectory,
      snapshotDirectory: input.snapshotDirectory,
      limits: input.sourceLimits,
    });
    return { ok: true, contentRevision };
  } catch (error) {
    const revision = buildDbtAnalysisRevision(
      input.projectRoot,
      error instanceof DbtProjectSourcePolicyError
        ? error.contentSetSha256
        : sha256HexUtf8(`unreadable:${input.projectRoot}`),
      input.analyzedAt
    );
    const analysis =
      error instanceof DbtProjectSourcePolicyError
        ? invalidDbtAnalysis(revision, undefined, input.operation)
        : unavailableDbtAnalysis(
            revision,
            'dbt_project_unreadable',
            'The dbt project could not be read safely.'
          );
    return { ok: false, analysis };
  }
}

export async function analyzeDbtSnapshot(
  snapshot: DbtSnapshotAnalysisInput,
  execution: NativeExecution
): Promise<DbtProjectAnalysis> {
  const {
    input,
    analysisRoot,
    snapshotDirectory,
    profilesDirectory,
    contentRevision,
    projectRevision,
    snapshotSemanticEvidence,
    environment,
    work,
  } = snapshot;
  const operation = input.operation ?? { kind: 'parse' as const };
  const targetPath = path.join(analysisRoot, 'target');
  const logPath = path.join(analysisRoot, 'logs');
  await Promise.all([mkdir(targetPath), mkdir(logPath)]);

  const processStart = performance.now();
  const processResult = await execution.processRunner.run({
    executable: execution.dbtExecutable,
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
      ...(operation.kind === 'compile' && operation.targetName !== undefined
        ? ['--target', operation.targetName]
        : []),
    ],
    cwd: snapshotDirectory,
    env: buildSanitizedProcessEnvironment(environment, analysisRoot),
    timeoutMs: execution.timeoutMs,
    maxOutputBytes: execution.maxOutputBytes,
  });
  work.processMs = performance.now() - processStart;
  if (processResult.kind === 'unavailable') {
    return unavailableDbtAnalysis(
      projectRevision,
      'dbt_analyzer_unavailable',
      'The server-managed dbt analyzer process is unavailable.',
      snapshotSemanticEvidence
    );
  }
  if (processResult.exitCode !== 0) {
    return invalidDbtAnalysis(projectRevision, snapshotSemanticEvidence, operation.kind);
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
  const analysis = buildDbtAnalysisResult({
    status: 'valid',
    ...(projection.adapterType === undefined ? {} : { adapterType: projection.adapterType }),
    projectRevision: {
      ...projectRevision,
      projectName: projection.projectName,
      ...(projection.dbtVersion === undefined ? {} : { dbtVersion: projection.dbtVersion }),
    },
    resources: projection.resources,
    dependencies: projection.dependencies,
    diagnostics: projection.diagnostics,
    semanticEvidence,
  });
  work.projectionMs = performance.now() - projectionStart;
  return analysis;
}
