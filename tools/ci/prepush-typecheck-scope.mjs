import { CI_GLOBAL_PATTERNS, computeWorkspaceMatrix, matchesAnyPattern } from './scope-config.mjs';

export const PREPUSH_TYPECHECK_COMMANDS = {
  affected: {
    command: 'pnpm',
    args: ['ci:affected:typecheck'],
    label: 'pnpm ci:affected:typecheck',
  },
  full: {
    command: 'pnpm',
    args: ['type-check'],
    label: 'pnpm type-check',
  },
};

export function normalizeFilePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

export function isTypecheckRelevantFile(filePath) {
  const normalizedPath = normalizeFilePath(filePath);

  return (
    /\.(ts|tsx|mts|cts)$/.test(normalizedPath) ||
    /(^|\/)package\.json$/.test(normalizedPath) ||
    /(^|\/)pnpm-lock\.yaml$/.test(normalizedPath) ||
    /(^|\/)pnpm-workspace\.yaml$/.test(normalizedPath) ||
    /(^|\/)tsconfig[^/]*\.json$/.test(normalizedPath) ||
    /(^|\/)vitest\.config\.ts$/.test(normalizedPath)
  );
}

export function collectTypecheckRelevantFiles(changedFiles) {
  return changedFiles.map(normalizeFilePath).filter(isTypecheckRelevantFile);
}

export function classifyPrepushTypecheck(changedFiles) {
  const relevantFiles = collectTypecheckRelevantFiles(changedFiles);

  if (relevantFiles.length === 0) {
    return {
      mode: 'skip',
      reason: 'No TypeScript-affecting files changed',
      relevantFiles,
      affectedPackages: [],
      run: null,
    };
  }

  const globalRelevantChange = relevantFiles.some(
    (filePath) => filePath === 'package.json' || matchesAnyPattern(filePath, CI_GLOBAL_PATTERNS)
  );

  if (globalRelevantChange) {
    return {
      mode: 'full',
      reason: 'Global TypeScript graph inputs changed',
      relevantFiles,
      affectedPackages: [],
      run: PREPUSH_TYPECHECK_COMMANDS.full,
    };
  }

  const matrix = computeWorkspaceMatrix(relevantFiles);

  if (matrix.anyChanged) {
    return {
      mode: 'affected',
      reason: 'Workspace-scoped TypeScript changes detected',
      relevantFiles,
      affectedPackages: matrix.include.map(({ pkg }) => pkg),
      run: PREPUSH_TYPECHECK_COMMANDS.affected,
    };
  }

  return {
    mode: 'full',
    reason: 'Relevant files did not map to a workspace scope',
    relevantFiles,
    affectedPackages: [],
    run: PREPUSH_TYPECHECK_COMMANDS.full,
  };
}
