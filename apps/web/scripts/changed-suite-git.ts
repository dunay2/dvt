/**
 * Owned concern: read the changed Git set and committed browser catalog witnesses.
 * @reason GH-3853 separates CLI admission, Git acquisition and evidence execution.
 * @consequence The existing changed-suite rail retains direct owners and unchanged inputs.
 */
import { execFileSync } from 'node:child_process';

import { WEB_CYPRESS_CATALOG_PATH, type WebCypressCatalogSnapshots } from '../cypress.catalog';

type GitOutputRunner = (args: readonly string[], cwd: string) => string[];
type ReadChangedFilesOptions = Readonly<{
  env?: Readonly<Record<string, string | undefined>>;
  gitOutput?: GitOutputRunner;
}>;

function gitOutput(args: readonly string[], cwd: string): string[] {
  const output = execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  return output.split('\0').filter((line) => line.length > 0);
}

export function readChangedFiles(
  repoRoot: string,
  options: ReadChangedFilesOptions = {}
): string[] {
  const runGitOutput = options.gitOutput ?? gitOutput;
  const env = options.env ?? process.env;
  const baseRef = env.GIT_BASE || 'origin/main';
  const headRef = env.GIT_HEAD || 'HEAD';
  const diffArgs = ['diff', '--name-only', '--no-renames', '-z'] as const;
  const files = new Set([
    ...runGitOutput([...diffArgs, baseRef, headRef], repoRoot),
    ...runGitOutput([...diffArgs, '--cached'], repoRoot),
    ...runGitOutput(diffArgs, repoRoot),
    ...runGitOutput(['ls-files', '-z', '--others', '--exclude-standard'], repoRoot),
  ]);
  return [...files].sort((left, right) => left.localeCompare(right));
}

export function readBrowserCatalogSnapshots(
  repoRoot: string,
  options: ReadChangedFilesOptions = {}
): WebCypressCatalogSnapshots {
  const runGit = options.gitOutput ?? gitOutput;
  const { GIT_BASE: base, GIT_HEAD: head } = readGitComparison(repoRoot, options);
  const dirtyQueries = [
    ['diff', '--name-only', '-z', '--cached', '--', WEB_CYPRESS_CATALOG_PATH],
    ['diff', '--name-only', '-z', '--', WEB_CYPRESS_CATALOG_PATH],
    ['ls-files', '--others', '--exclude-standard', '-z', '--', WEB_CYPRESS_CATALOG_PATH],
  ];
  const dirty = dirtyQueries.some((args) => runGit(args, repoRoot).length > 0);

  function readSnapshot(commit: string): unknown {
    const paths = runGit(
      ['ls-tree', '--name-only', '-z', commit, '--', WEB_CYPRESS_CATALOG_PATH],
      repoRoot
    );
    if (!paths.includes(WEB_CYPRESS_CATALOG_PATH)) return null;
    const source = runGit(['show', `${commit}:${WEB_CYPRESS_CATALOG_PATH}`], repoRoot).join('\0');
    try {
      return JSON.parse(source) as unknown;
    } catch {
      return null;
    }
  }
  return { base: readSnapshot(base), head: readSnapshot(head), ...(dirty ? { dirty: true } : {}) };
}

export function readGitComparison(
  repoRoot: string,
  options: ReadChangedFilesOptions = {}
): Readonly<{ GIT_BASE: string; GIT_HEAD: string }> {
  const runGit = options.gitOutput ?? gitOutput;
  const env = options.env ?? process.env;
  const resolveCommit = (ref: string): string =>
    runGit(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], repoRoot)
      .join('')
      .trim();
  const base = resolveCommit(env.GIT_BASE || 'origin/main');
  const head = resolveCommit(env.GIT_HEAD || 'HEAD');
  if (!base || !head) throw new Error('Browser evidence requires verified Git references.');
  return { GIT_BASE: base, GIT_HEAD: head };
}
