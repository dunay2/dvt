/**
 * Owned concern: own one analysis request snapshot lifecycle; reuse cannot outlive source/context validation.
 * @decision Keep snapshot disposal and eligible reuse coordination under one request owner.
 * @consequence Executed, joined and retained evidence face the same current-context check.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { sha256HexUtf8 } from '@dvt/crypto';

import type {
  AnalyzeDbtProjectInput,
  DbtProjectAnalysis,
} from '../../application/ports/dbtProjectAnalysis.js';

import {
  dbtAnalysisReuseKey,
  isDbtAnalysisContextCurrent,
  readDbtAnalysisContext,
  resolveDbtProfilesDirectory,
  writeDbtProfilesSnapshot,
} from './dbtAnalysisContext.js';
import {
  ANALYZER_VERSION,
  buildDbtAnalysisRevision,
  invalidDbtAnalysis,
  unavailableDbtAnalysis,
  type DbtAnalysisWork,
} from './dbtAnalysisResult.js';
import type { DbtAnalysisReuse } from './dbtAnalysisReuse.js';
import { isDbtAnalysisReuseEligible } from './dbtAnalysisReuseEligibility.js';
import type { DbtProcessRunner } from './dbtAnalyzerProcess.js';
import type { ProjectContentLimits } from './dbtProjectContentRevision.js';
import { evaluateDbtProjectSnapshotPathPolicy } from './dbtProjectPathPolicy.js';
import {
  EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE,
  projectDbtProjectFiles,
} from './dbtProjectSemanticEvidence.js';
import { resolveDbtProjectDirectory } from './dbtProjectWorkspaceBoundary.js';
import {
  analyzeDbtSnapshot,
  prepareDbtAnalysisSnapshot,
  type DbtSnapshotAnalysisInput,
} from './dbtSnapshotAnalysis.js';

export type DbtAnalysisRequestRuntime = Readonly<{
  workspaceFilesRoot: string;
  profilesDirectory: string | null;
  dbtExecutable: string;
  timeoutMs: number;
  maxOutputBytes: number;
  sourceLimits: ProjectContentLimits;
  processRunner: DbtProcessRunner;
  processEnvironment: NodeJS.ProcessEnv;
  now: () => Date;
  reuse: DbtAnalysisReuse;
}>;

export async function analyzeDbtProjectRequest(
  input: AnalyzeDbtProjectInput,
  runtime: DbtAnalysisRequestRuntime,
  work: DbtAnalysisWork
): Promise<DbtProjectAnalysis> {
  const operation = input.operation ?? { kind: 'parse' as const };
  const analyzedAt = runtime.now().toISOString();
  const unavailableRevision = (reason: string) =>
    buildDbtAnalysisRevision(input.projectRoot, sha256HexUtf8(reason), analyzedAt);

  let projectDirectory: string;
  let projectRevision = unavailableRevision(`analysis:${input.projectRoot}`);
  let snapshotSemanticEvidence = EMPTY_DBT_PROJECT_SEMANTIC_EVIDENCE;
  try {
    projectDirectory = await resolveDbtProjectDirectory({
      workspaceFilesRoot: runtime.workspaceFilesRoot,
      scope: input.scope,
      projectRoot: input.projectRoot,
    });
  } catch {
    return unavailableDbtAnalysis(
      unavailableRevision(`missing:${input.projectRoot}`),
      'dbt_project_not_found',
      'The dbt project is not available in the authorized workspace.'
    );
  }

  let analysisRoot: string;
  try {
    analysisRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-analysis-'));
  } catch {
    return unavailableDbtAnalysis(
      unavailableRevision(`analysis-root:${input.projectRoot}`),
      'dbt_analyzer_unavailable',
      'The server-managed dbt analyzer process is unavailable.'
    );
  }

  try {
    const snapshotDirectory = path.join(analysisRoot, 'project');
    const snapshotStart = performance.now();
    const prepared = await prepareDbtAnalysisSnapshot({
      projectDirectory,
      snapshotDirectory,
      projectRoot: input.projectRoot,
      analyzedAt,
      operation: operation.kind,
      sourceLimits: runtime.sourceLimits,
    });
    if (!prepared.ok) return prepared.analysis;
    const contentRevision = prepared.contentRevision;

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

    projectRevision = buildDbtAnalysisRevision(input.projectRoot, contentSetSha256, analyzedAt);
    const pathPolicy = await evaluateDbtProjectSnapshotPathPolicy(snapshotDirectory);
    if (!pathPolicy.ok) {
      return invalidDbtAnalysis(projectRevision, snapshotSemanticEvidence, operation.kind);
    }

    const profilesDirectory = await resolveDbtProfilesDirectory(
      runtime.workspaceFilesRoot,
      runtime.profilesDirectory
    );
    if (profilesDirectory === null) {
      return unavailableDbtAnalysis(
        projectRevision,
        'dbt_analyzer_profiles_unavailable',
        'The server-managed dbt profiles directory is unavailable.',
        snapshotSemanticEvidence
      );
    }

    const context = await readDbtAnalysisContext(profilesDirectory, runtime.processEnvironment);
    const snapshot: DbtSnapshotAnalysisInput = {
      input,
      analysisRoot,
      snapshotDirectory,
      profilesDirectory,
      contentRevision,
      projectRevision,
      snapshotSemanticEvidence,
      environment: runtime.processEnvironment,
      work,
    };
    const eligible = await isDbtAnalysisReuseEligible({
      snapshotDirectory,
      contentRevision,
      profileContents: context.profiles.map((profile) => profile.contents.toString('utf8')),
    });
    if (!eligible) return await analyzeDbtSnapshot(snapshot, runtime);
    const key = dbtAnalysisReuseKey({
      request: input,
      projectDirectory,
      contentSetSha256,
      contextIdentity: context.identity,
      analyzerVersion: ANALYZER_VERSION,
    });
    const verifyCurrent = async (analysis: DbtProjectAnalysis) => {
      if (
        analysis.status !== 'valid' ||
        (await isDbtAnalysisContextCurrent({
          request: input,
          ...runtime,
          projectDirectory,
          contentSetSha256,
          context,
        }))
      )
        return analysis;
      return unavailableDbtAnalysis(
        projectRevision,
        'dbt_project_changed_during_analysis',
        'The dbt project or its managed analysis context changed during analysis.',
        snapshotSemanticEvidence
      );
    };
    const result = await runtime.reuse.getOrAnalyze(key, async () =>
      verifyCurrent(
        await analyzeDbtSnapshot(
          {
            ...snapshot,
            profilesDirectory: await writeDbtProfilesSnapshot(analysisRoot, context),
            environment: context.environment,
          },
          runtime
        )
      )
    );
    work.reuse = result.disposition;
    return result.disposition === 'joined' || result.disposition === 'reused'
      ? await verifyCurrent(result.analysis)
      : result.analysis;
  } catch {
    return unavailableDbtAnalysis(
      projectRevision,
      'dbt_analyzer_unavailable',
      'The dbt analyzer could not produce a fresh manifest.',
      snapshotSemanticEvidence
    );
  } finally {
    await rm(analysisRoot, { recursive: true, force: true });
  }
}
