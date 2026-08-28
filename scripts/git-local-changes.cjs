/** Owned concern: expose the canonical local changed-file query rail for CI governance gates. */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

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
  });
  return parseGitLines(output);
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
      throw new Error(
        `Unable to read committed changed files between ${baseRef} and ${headRef}: ${
          directTreeError instanceof Error ? directTreeError.message : String(directTreeError)
        }`,
        { cause: mergeBaseError }
      );
    }
  }
}

function listLocalChangedFiles(options = {}) {
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
  toAbsoluteRepoPath,
  toPosix,
};
