import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import type { WebVitestChangedSuiteName } from '../../vitest.suites';
import { WEB_VITEST_SUITES } from '../../vitest.suites';

export const webRoot = process.cwd();
const sourceRoot = resolve(webRoot, 'src');

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/');
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = resolve(dir, entry);
    const stats = statSync(entryPath);
    return stats.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

export function listWebVitestFiles(): string[] {
  return listFiles(sourceRoot)
    .filter((filePath) => /\.(test|spec)\.(ts|tsx)$/.test(filePath))
    .map((filePath) => normalizePath(relative(webRoot, filePath)))
    .sort((a, b) => a.localeCompare(b));
}

export function countTestCases(relativePath: string): number {
  const content = readFileSync(resolve(webRoot, relativePath), 'utf8');
  return [...content.matchAll(/\b(?:it|test)(?:\.each)?\(/g)].length;
}

export function countLines(relativePath: string): number {
  const content = readFileSync(resolve(webRoot, relativePath), 'utf8');
  return content.split(/\r?\n/).length;
}

function escapeRegexChar(value: string): string {
  return /[\\^$+?.()|[\]{}]/.test(value) ? `\\${value}` : value;
}

function expandBraceAlternatives(pattern: string): string[] {
  const match = /\{([^{}]+)\}/.exec(pattern);
  if (!match) {
    return [pattern];
  }

  const token = match[0];
  const alternatives = match[1] ?? '';
  return alternatives
    .split(',')
    .flatMap((alternative) => expandBraceAlternatives(pattern.replace(token, alternative)));
}

function catalogGlobMatchesPath(glob: string, filePath: string): boolean {
  return expandBraceAlternatives(glob).some((expandedGlob) => {
    let pattern = '';
    for (let index = 0; index < expandedGlob.length; index += 1) {
      const character = expandedGlob.charAt(index);
      const nextCharacter = expandedGlob.charAt(index + 1);
      const afterNextCharacter = expandedGlob.charAt(index + 2);

      if (character === '*' && nextCharacter === '*' && afterNextCharacter === '/') {
        pattern += '(?:.*/)?';
        index += 2;
        continue;
      }

      if (character === '*' && nextCharacter === '*') {
        pattern += '.*';
        index += 1;
        continue;
      }

      pattern += character === '*' ? '[^/]*' : escapeRegexChar(character);
    }

    return new RegExp(`^${pattern}$`).test(filePath);
  });
}

export function suiteMatchesFile(suiteName: WebVitestChangedSuiteName, filePath: string): boolean {
  const suite = WEB_VITEST_SUITES[suiteName];
  return (
    suite.include.some((glob) => catalogGlobMatchesPath(glob, filePath)) &&
    suite.exclude.every((glob) => !catalogGlobMatchesPath(glob, filePath))
  );
}

export function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(webRoot, '..', '..', relativePath), 'utf8');
}

export function hasRawIntakePathReference(source: string): boolean {
  return rawIntakePathReferencePatterns().some((pattern) => pattern.test(source));
}

function rawIntakePathReferencePatterns(): RegExp[] {
  const rawIntakeDirectoryName = ['buz', 'on'].join('');
  return [
    new RegExp(String.raw`${rawIntakeDirectoryName}[/\\]`),
    new RegExp(String.raw`['"\`]${rawIntakeDirectoryName}['"\`]`),
  ];
}
