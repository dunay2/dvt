/** Owned concern: expose the canonical local changed-file query rail for CI governance gates. */
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createGitRepositoryEnvironment } = require('./lib/git-repository-environment.cjs');

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function parseGitLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix);
}

function defaultRunGitLines(args, options = {}) {
  const output = execFileSync('git', args, {
    cwd: options.repoRootPath || process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    ...(options.env ? { env: options.env } : {}),
  });
  return args.includes('-z')
    ? output.split('\0').filter(Boolean).map(toPosix)
    : parseGitLines(output);
}

function resolveIterationComparison(options = {}) {
  const { baseRef } = options;
  if (
    typeof baseRef !== 'string' ||
    baseRef.trim() !== baseRef ||
    !baseRef ||
    /^-/u.test(baseRef) ||
    /[\r\n\0]/u.test(baseRef)
  ) {
    throw new Error('Iteration requires an explicit ancestor commit ref.');
  }
  const runGitLines = options.runGitLines || defaultRunGitLines;
  const repoOptions = {
    repoRootPath: options.repoRootPath,
    env: createGitRepositoryEnvironment(),
  };
  try {
    const resolve = (ref) => {
      const result = runGitLines(
        ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`],
        repoOptions
      );
      if (result.length !== 1 || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(result[0])) {
        throw new Error(`Invalid commit identity: ${ref}`);
      }
      return result[0];
    };
    const baseSha = resolve(baseRef);
    const headSha = resolve('HEAD');
    runGitLines(['merge-base', '--is-ancestor', baseSha, headSha], repoOptions);
    return { baseSha, headSha };
  } catch (cause) {
    throw new Error(
      'Unable to establish iteration comparison: require an existing ancestor commit and known ancestry.',
      { cause }
    );
  }
}

function listStrictLocalChangedFiles(options) {
  const commitPattern = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
  if (
    !commitPattern.test(options.baseRef || '') ||
    !commitPattern.test(options.headRef || '') ||
    options.includeUntracked === false ||
    options.diffFilter !== undefined ||
    options.pathspecs?.length
  ) {
    throw new Error(
      'Strict iteration requires exact base/head commit identities and the complete local frontier.'
    );
  }
  const runGitLines = options.runGitLines || defaultRunGitLines;
  const repoOptions = {
    repoRootPath: options.repoRootPath,
    env: createGitRepositoryEnvironment(),
  };
  try {
    const currentHead = runGitLines(
      ['rev-parse', '--verify', '--end-of-options', 'HEAD^{commit}'],
      repoOptions
    );
    if (currentHead.length !== 1 || currentHead[0] !== options.headRef) {
      throw new Error('Observed HEAD changed before strict iteration acquisition.');
    }
    runGitLines(['merge-base', '--is-ancestor', options.baseRef, options.headRef], repoOptions);
    const sources = [
      [
        'diff',
        '--no-ext-diff',
        '--no-renames',
        '--name-only',
        '-z',
        options.baseRef,
        options.headRef,
      ],
      ['diff', '--no-ext-diff', '--no-renames', '--cached', '--name-only', '-z'],
      ['diff', '--no-ext-diff', '--no-renames', '--name-only', '-z'],
      ['ls-files', '--others', '--exclude-standard', '-z'],
    ];
    return unique(sources.flatMap((args) => runGitLines(args, repoOptions))).sort();
  } catch (cause) {
    throw new Error(
      'Unable to read strict iteration frontier for the observed HEAD; no fallback is permitted.',
      { cause }
    );
  }
}

function safeGitLines(runGitLines, args, options) {
  try {
    return runGitLines(args, options);
  } catch {
    return [];
  }
}

function hasGitRef(runGitLines, ref, options) {
  try {
    runGitLines(['rev-parse', '--verify', ref], options);
    return true;
  } catch {
    return false;
  }
}

function hasUpstream(runGitLines, options) {
  try {
    runGitLines(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], options);
    return true;
  } catch {
    return false;
  }
}

function unique(items) {
  return Array.from(new Set(items));
}

function resolveDiffBaseRefs(options = {}) {
  const runGitLines = options.runGitLines || defaultRunGitLines;
  const repoOptions = { repoRootPath: options.repoRootPath };
  const configuredBaseRef = options.baseRef || process.env.GIT_BASE || 'origin/main';
  const candidates = [configuredBaseRef];

  if (hasUpstream(runGitLines, repoOptions)) {
    candidates.push('@{u}');
  }

  if (hasGitRef(runGitLines, 'origin/main', repoOptions)) {
    candidates.push('origin/main');
  }

  candidates.push('HEAD~1');
  for (const candidate of unique(candidates.filter(Boolean))) {
    if (candidate === '@{u}') {
      if (hasUpstream(runGitLines, repoOptions)) {
        return [candidate];
      }
      continue;
    }

    if (hasGitRef(runGitLines, candidate, repoOptions)) {
      return [candidate];
    }
  }

  return [];
}

function withPathspec(args, pathspecs) {
  if (!pathspecs || pathspecs.length === 0) {
    return args;
  }

  return [...args, '--', ...pathspecs];
}

function listCommittedChangedFiles(options = {}) {
  const runGitLines = options.runGitLines || defaultRunGitLines;
  const repoOptions = { repoRootPath: options.repoRootPath };
  const diffFilter = options.diffFilter || 'ACMR';
  const pathspecs = options.pathspecs || [];
  const baseRef = options.baseRef || process.env.GIT_BASE;
  const headRef = options.headRef || process.env.GIT_HEAD || 'HEAD';

  if (!baseRef) {
    throw new Error('GIT_BASE is required to read committed changed files.');
  }

  const mergeBaseArgs = withPathspec(
    ['diff', '--name-only', `--diff-filter=${diffFilter}`, `${baseRef}...${headRef}`],
    pathspecs
  );
  const directTreeArgs = withPathspec(
    ['diff', '--name-only', `--diff-filter=${diffFilter}`, baseRef, headRef],
    pathspecs
  );

  try {
    return unique(runGitLines(mergeBaseArgs, repoOptions)).sort();
  } catch (mergeBaseError) {
    try {
      // Shallow PR checkouts can contain both trees without enough ancestry to compute a merge base.
      // A direct tree diff is fail-closed for governance scope: it may broaden the changed set, but it
      // cannot hide a tree difference between the exact requested refs.
      return unique(runGitLines(directTreeArgs, repoOptions)).sort();
    } catch (directTreeError) {
      const mergeBaseMessage =
        mergeBaseError instanceof Error ? mergeBaseError.message : String(mergeBaseError);
      throw new Error(
        `Unable to read committed changed files between ${baseRef} and ${headRef}. ` +
          `Merge-base diff failed (${mergeBaseMessage}); direct tree diff also failed.`,
        { cause: directTreeError }
      );
    }
  }
}

function listLocalChangedFiles(options = {}) {
  if (options.strict) return listStrictLocalChangedFiles(options);
  const runGitLines = options.runGitLines || defaultRunGitLines;
  const repoOptions = { repoRootPath: options.repoRootPath };
  const diffFilter = options.diffFilter || 'ACMR';
  const pathspecs = options.pathspecs || [];
  const includeUntracked = options.includeUntracked !== false;
  const changedFiles = new Set();

  for (const baseRef of resolveDiffBaseRefs({ ...options, runGitLines })) {
    const diffArgs = ['diff', '--name-only', `--diff-filter=${diffFilter}`];
    for (const filePath of safeGitLines(
      runGitLines,
      withPathspec([...diffArgs, `${baseRef}...HEAD`], pathspecs),
      repoOptions
    )) {
      changedFiles.add(filePath);
    }
  }

  for (const filePath of safeGitLines(
    runGitLines,
    withPathspec(['diff', '--cached', '--name-only', `--diff-filter=${diffFilter}`], pathspecs),
    repoOptions
  )) {
    changedFiles.add(filePath);
  }

  for (const filePath of safeGitLines(
    runGitLines,
    withPathspec(['diff', '--name-only', `--diff-filter=${diffFilter}`], pathspecs),
    repoOptions
  )) {
    changedFiles.add(filePath);
  }

  if (includeUntracked) {
    for (const filePath of safeGitLines(
      runGitLines,
      withPathspec(['ls-files', '--others', '--exclude-standard'], pathspecs),
      repoOptions
    )) {
      changedFiles.add(filePath);
    }
  }

  return Array.from(changedFiles).sort();
}

function toAbsoluteRepoPath(repoRootPath, filePath) {
  return path.resolve(repoRootPath || process.cwd(), filePath);
}

module.exports = {
  defaultRunGitLines,
  listCommittedChangedFiles,
  listLocalChangedFiles,
  parseGitLines,
  resolveDiffBaseRefs,
  resolveIterationComparison,
  toAbsoluteRepoPath,
  toPosix,
};
