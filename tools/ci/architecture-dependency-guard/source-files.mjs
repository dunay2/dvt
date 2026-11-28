/** @ownedConcern Discover and read the repository source inputs of the dependency guard. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const SKIPPED_DIRECTORY_NAMES = new Set([
  '.generated-docs',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);

export function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

export function listFilesRecursive(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  return readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
      return [];
    }

    const absolutePath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      return listFilesRecursive(absolutePath);
    }

    return entry.isFile() ? [absolutePath] : [];
  });
}

export function readSourceContents(baseDir, sourcePaths) {
  return new Map(
    [...new Set(sourcePaths)].sort().flatMap((source) => {
      const absolutePath = resolve(baseDir, source);
      return existsSync(absolutePath) ? [[source, readFileSync(absolutePath, 'utf8')]] : [];
    })
  );
}
