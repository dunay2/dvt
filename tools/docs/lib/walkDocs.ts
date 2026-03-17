/**
 * @file tools/docs/lib/walkDocs.ts
 * Recursively walk a directory tree and return .md file paths.
 */
import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const DEFAULT_EXCLUDE: readonly string[] = [
  'node_modules',
  'dist',
  '.git',
  'docs-dist',
  '.tmp',
  'coverage',
  '.pnpm-store',
];

export interface WalkOptions {
  excludeDirs?: string[];
}

/**
 * Recursively walk `dir` and return absolute paths of all `.md` files.
 */
export function walkMarkdown(dir: string, opts: WalkOptions = {}): string[] {
  const excludeDirs = opts.excludeDirs ?? DEFAULT_EXCLUDE;
  const results: string[] = [];

  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkMarkdown(full, opts));
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      results.push(full);
    }
  }

  return results;
}

export interface FileMeta {
  filePath: string;
  filename: string;
  relPath: string;
}

/**
 * Walk and return enriched file entries (path + filename + relative path from `root`).
 */
export function walkMarkdownWithMeta(dir: string, root: string, opts?: WalkOptions): FileMeta[] {
  return walkMarkdown(dir, opts).map((filePath) => ({
    filePath,
    filename: filePath.replace(/\\/g, '/').split('/').at(-1) ?? '',
    relPath: filePath.replace(/\\/g, '/').replace(root.replace(/\\/g, '/') + '/', ''),
  }));
}
