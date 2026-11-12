/**
 * Owned concern: identify and revalidate managed native analysis inputs; credentials stay private.
 * @decision Identify exact managed profile/environment bytes and recheck live inputs.
 * @consequence Reuse cannot accept evidence from a changed source or managed context.
 */
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256HexUtf8 } from '@dvt/crypto';

import type { AnalyzeDbtProjectInput } from '../../application/ports/dbtProjectAnalysis.js';

import { buildSanitizedProcessEnvironment } from './dbtAnalyzerProcess.js';
import type { ProjectContentLimits } from './dbtProjectContentRevision.js';
import { hashDbtProjectSource } from './dbtProjectSourceSnapshot.js';
import { resolveDbtProjectDirectory } from './dbtProjectWorkspaceBoundary.js';

export type DbtAnalysisContext = Readonly<{
  identity: string;
  profiles: readonly Readonly<{ name: string; contents: Buffer }>[];
  environment: NodeJS.ProcessEnv;
}>;

/** Private execution inputs; neither credential bytes nor their identity leave the adapter. */
export async function readDbtAnalysisContext(
  profilesDirectory: string,
  processEnvironment: NodeJS.ProcessEnv
): Promise<DbtAnalysisContext> {
  const profiles: { name: string; contents: Buffer }[] = [];
  for (const name of ['profiles.yml', 'profiles.yaml']) {
    try {
      profiles.push({ name, contents: await readFile(path.join(profilesDirectory, name)) });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  if (profiles.length === 0) throw new Error('Managed dbt profiles are unavailable.');
  const environment = buildSanitizedProcessEnvironment(processEnvironment, '<isolated-home>');
  const identity = sha256HexUtf8(
    JSON.stringify({
      profiles: profiles.map(({ name, contents }) => [name, contents.toString('base64')]),
      environment: Object.entries(environment).sort(([a], [b]) => a.localeCompare(b)),
    })
  );
  return { identity, profiles, environment };
}

/** Execute the bytes used in the reuse identity, independent of concurrent profile edits. */
export async function writeDbtProfilesSnapshot(
  analysisRoot: string,
  context: DbtAnalysisContext
): Promise<string> {
  const directory = path.join(analysisRoot, 'profiles');
  await mkdir(directory, { mode: 0o700 });
  await Promise.all(
    context.profiles.map(({ name, contents }) =>
      writeFile(path.join(directory, name), contents, { mode: 0o600, flag: 'wx' })
    )
  );
  return directory;
}

/** Managed profiles must exist outside all workspace-controlled files. */
export async function resolveDbtProfilesDirectory(
  workspaceFilesRoot: string,
  profilesDirectory: string | null
): Promise<string | null> {
  if (profilesDirectory === null) return null;
  try {
    const [realWorkspaceFilesRoot, realProfilesDirectory] = await Promise.all([
      realpath(workspaceFilesRoot),
      realpath(profilesDirectory),
    ]);
    const relative = path.relative(realWorkspaceFilesRoot, realProfilesDirectory);
    if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) return null;
    const hasProfile =
      (await isFile(path.join(realProfilesDirectory, 'profiles.yml'))) ||
      (await isFile(path.join(realProfilesDirectory, 'profiles.yaml')));
    return hasProfile ? realProfilesDirectory : null;
  } catch {
    return null;
  }
}

export async function isDbtAnalysisContextCurrent(input: {
  readonly request: AnalyzeDbtProjectInput;
  readonly workspaceFilesRoot: string;
  readonly profilesDirectory: string | null;
  readonly processEnvironment: NodeJS.ProcessEnv;
  readonly sourceLimits: ProjectContentLimits;
  readonly projectDirectory: string;
  readonly contentSetSha256: string;
  readonly context: DbtAnalysisContext;
}): Promise<boolean> {
  try {
    const currentDirectory = await resolveDbtProjectDirectory({
      workspaceFilesRoot: input.workspaceFilesRoot,
      scope: input.request.scope,
      projectRoot: input.request.projectRoot,
    });
    if (currentDirectory !== input.projectDirectory) return false;
    const profilesDirectory = await resolveDbtProfilesDirectory(
      input.workspaceFilesRoot,
      input.profilesDirectory
    );
    if (profilesDirectory === null) return false;
    const [revision, currentContext] = await Promise.all([
      hashDbtProjectSource({
        projectDirectory: input.projectDirectory,
        limits: input.sourceLimits,
      }),
      readDbtAnalysisContext(profilesDirectory, input.processEnvironment),
    ]);
    return (
      revision.sha256 === input.contentSetSha256 &&
      currentContext.identity === input.context.identity
    );
  } catch {
    return false;
  }
}

export function dbtAnalysisReuseKey(input: {
  readonly request: AnalyzeDbtProjectInput;
  readonly projectDirectory: string;
  readonly contentSetSha256: string;
  readonly contextIdentity: string;
  readonly analyzerVersion: string;
}): string {
  const { request, projectDirectory, contentSetSha256, contextIdentity, analyzerVersion } = input;
  const operation = request.operation ?? { kind: 'parse' as const };
  return JSON.stringify([
    request.scope.tenantId,
    request.scope.projectId,
    request.scope.environmentId,
    projectDirectory,
    request.projectRoot,
    contentSetSha256,
    contextIdentity,
    analyzerVersion,
    operation.kind,
    operation.kind === 'compile' ? [...new Set(operation.selectors)].sort() : null,
    operation.kind === 'compile' ? (operation.targetName ?? null) : null,
  ]);
}

async function isFile(candidate: string): Promise<boolean> {
  return stat(candidate)
    .then((value) => value.isFile())
    .catch(() => false);
}
