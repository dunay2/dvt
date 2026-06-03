import { execFileSync } from 'node:child_process';

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function parseChangedFiles(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath);
}

function errorText(error) {
  const parts = [error?.message, error?.stderr?.toString?.(), error?.stdout?.toString?.()];
  return parts.filter(Boolean).join('\n');
}

function isNoMergeBaseError(error) {
  return /\bno merge base\b/u.test(errorText(error));
}

function defaultRunGitDiff(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function listChangedFilesBetween(options = {}) {
  const baseRef = options.baseRef || process.env.GIT_BASE || 'origin/main';
  const headRef = options.headRef || process.env.GIT_HEAD || 'HEAD';
  const diffFilter = options.diffFilter || 'ACMR';
  const runGitDiff = options.runGitDiff || defaultRunGitDiff;
  const commonArgs = ['diff', '--name-only', `--diff-filter=${diffFilter}`];

  try {
    return parseChangedFiles(runGitDiff([...commonArgs, `${baseRef}...${headRef}`]));
  } catch (error) {
    if (!isNoMergeBaseError(error)) {
      throw error;
    }

    console.error(
      `[git-diff-files] No merge base for ${baseRef}...${headRef}; using direct tree diff.`
    );
    return parseChangedFiles(runGitDiff([...commonArgs, baseRef, headRef]));
  }
}
