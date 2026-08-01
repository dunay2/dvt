import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { DbtProjectAnalysisFile } from '../../application/ports/dbtProjectAnalysis.js';
import type {
  AnalyzeDbtProjectCandidateInput,
  DbtProjectCandidateAnalysisResult,
  IDbtProjectCandidateAnalyzerPort,
} from '../../application/ports/dbtProjectCandidateAnalysis.js';
import { resolveWorkspaceScopeStorageRoot } from '../workspaceFiles/workspaceScopeStoragePath.js';

import {
  DbtCliProjectAnalyzer,
  type DbtCliProjectAnalyzerOptions,
} from './DbtCliProjectAnalyzer.js';
import {
  DEFAULT_DBT_PROJECT_SOURCE_LIMITS,
  snapshotDbtProjectSource,
} from './dbtProjectSourceSnapshot.js';
import { resolveDbtProjectDirectory } from './dbtProjectWorkspaceBoundary.js';

export class InvalidDbtProjectCandidateError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidDbtProjectCandidateError';
  }
}

export class DbtCliProjectCandidateAnalyzer implements IDbtProjectCandidateAnalyzerPort {
  public constructor(private readonly options: DbtCliProjectAnalyzerOptions) {}

  public async analyzeCandidate(
    input: AnalyzeDbtProjectCandidateInput
  ): Promise<DbtProjectCandidateAnalysisResult> {
    let projectDirectory: string;
    try {
      projectDirectory = await resolveDbtProjectDirectory({
        workspaceFilesRoot: this.options.workspaceFilesRoot,
        scope: input.scope,
        projectRoot: input.projectRoot,
      });
    } catch {
      return projectConflict();
    }
    const candidateWorkspaceRoot = await mkdtemp(
      path.join(tmpdir(), 'dvt-dbt-candidate-analysis-')
    );

    try {
      const candidateProjectDirectory = resolveCandidateProjectDirectory({
        candidateWorkspaceRoot,
        scope: input.scope,
        projectRoot: input.projectRoot,
      });
      let revision: Awaited<ReturnType<typeof snapshotDbtProjectSource>>;
      try {
        revision = await snapshotDbtProjectSource({
          projectDirectory,
          snapshotDirectory: candidateProjectDirectory,
          limits: {
            maxFiles: this.options.maxProjectFiles ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxFiles,
            maxBytes: this.options.maxProjectBytes ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxBytes,
            maxDirectories:
              this.options.maxProjectDirectories ??
              DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDirectories,
            maxDepth: this.options.maxProjectDepth ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDepth,
          },
        });
      } catch {
        return projectConflict();
      }
      const changedPaths = findChangedPaths(input.expectedFiles, revision.entries);
      if (revision.sha256 !== input.expectedContentSetSha256 || changedPaths.length > 0) {
        return {
          kind: 'conflict',
          reason: 'project_revision_changed',
          changedPaths: changedPaths.length > 0 ? changedPaths : ['.'],
        };
      }

      const expectedTarget = input.expectedFiles.find((file) => file.path === input.candidate.path);
      if (
        expectedTarget === undefined ||
        expectedTarget.revisionSha256 !== input.candidate.expectedContentSha256
      ) {
        throw new InvalidDbtProjectCandidateError(
          'The candidate target is not bound to the analyzed project revision.'
        );
      }
      const candidatePath = resolveCandidateFilePath(
        candidateProjectDirectory,
        input.candidate.path
      );
      await writeFile(candidatePath, input.candidate.content, 'utf8');

      const analysis = await new DbtCliProjectAnalyzer({
        ...this.options,
        workspaceFilesRoot: candidateWorkspaceRoot,
      }).analyze({
        scope: input.scope,
        projectRoot: input.projectRoot,
      });
      return { kind: 'analyzed', analysis };
    } finally {
      await rm(candidateWorkspaceRoot, { recursive: true, force: true });
    }
  }
}

function projectConflict(): DbtProjectCandidateAnalysisResult {
  return { kind: 'conflict', reason: 'project_revision_changed', changedPaths: ['.'] };
}

function resolveCandidateProjectDirectory(
  input: Readonly<{
    candidateWorkspaceRoot: string;
    scope: AnalyzeDbtProjectCandidateInput['scope'];
    projectRoot: string;
  }>
): string {
  const scopeRoot = resolveWorkspaceScopeStorageRoot(input.candidateWorkspaceRoot, input.scope);
  const projectSegments = input.projectRoot === '.' ? [] : input.projectRoot.split('/');
  const candidate = path.resolve(scopeRoot, ...projectSegments);
  assertContained(scopeRoot, candidate);
  return candidate;
}

function resolveCandidateFilePath(projectDirectory: string, portablePath: string): string {
  const normalized = path.posix.normalize(portablePath);
  if (
    normalized !== portablePath ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    path.posix.isAbsolute(portablePath) ||
    path.win32.parse(portablePath).root.length > 0
  ) {
    throw new InvalidDbtProjectCandidateError('The candidate file path is unsafe.');
  }
  const candidate = path.resolve(projectDirectory, ...normalized.split('/'));
  assertContained(projectDirectory, candidate);
  return candidate;
}

function assertContained(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new InvalidDbtProjectCandidateError('The candidate path escaped its project root.');
  }
}

function findChangedPaths(
  expectedFiles: readonly DbtProjectAnalysisFile[],
  actualFiles: readonly Readonly<{ path: string; sha256: string; bytes: number }>[]
): readonly string[] {
  const expectedByPath = new Map(expectedFiles.map((file) => [file.path, file]));
  const actualByPath = new Map(actualFiles.map((file) => [file.path, file]));
  const paths = new Set([...expectedByPath.keys(), ...actualByPath.keys()]);
  return [...paths]
    .filter((filePath) => {
      const expected = expectedByPath.get(filePath);
      const actual = actualByPath.get(filePath);
      return (
        expected === undefined ||
        actual === undefined ||
        expected.revisionSha256 !== actual.sha256 ||
        expected.byteLength !== actual.bytes
      );
    })
    .sort((left, right) => left.localeCompare(right));
}
