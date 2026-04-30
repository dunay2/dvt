import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_FILE_SUFFIXES = ['.test.ts', '.test.tsx'];
const REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*stores\/appStore(?:\.ts)?['"]/,
  /from\s+['"][^'"]*stores\/index(?:\.ts)?['"]/,
  /import\s+['"][^'"]*stores\/appStore(?:\.ts)?['"]/,
  /import\s+['"][^'"]*stores\/index(?:\.ts)?['"]/,
];
const SERVICE_FACTORY_CALL_PATTERNS = [
  /createWorkspaceService\s*\(/,
  /createRunsService\s*\(/,
  /createPlansService\s*\(/,
];
const RAW_CAPABILITIES_FETCH_PATTERNS = [
  "fetch('/api/capabilities'",
  'fetch("/api/capabilities"',
] as const;

function toRelativePath(filePath: string): string {
  return path.relative(ROOT_DIR, filePath).replaceAll('\\', '/');
}

function collectSourceFiles(dirPath: string, results: string[]): void {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, results);
      continue;
    }

    const extension = path.extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(extension)) {
      continue;
    }
    if (EXCLUDED_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      continue;
    }
    results.push(fullPath);
  }
}

function fileContainsPattern(filePath: string, pattern: RegExp): boolean {
  return pattern.test(readFileSync(filePath, 'utf8'));
}

function fileContainsAnyPattern(filePath: string, patterns: readonly RegExp[]): boolean {
  const source = readFileSync(filePath, 'utf8');
  return patterns.some((pattern) => pattern.test(source));
}

function isAsciiWhitespace(character: string): boolean {
  return character === ' ' || character === '\n' || character === '\r' || character === '\t';
}

function stripAsciiWhitespace(source: string): string {
  return Array.from(source)
    .filter((character) => !isAsciiWhitespace(character))
    .join('');
}

function fileContainsRawCapabilitiesFetch(filePath: string): boolean {
  const source = stripAsciiWhitespace(readFileSync(filePath, 'utf8'));
  return RAW_CAPABILITIES_FETCH_PATTERNS.some((pattern) => source.includes(pattern));
}

describe('Query key policy (architecture)', () => {
  it('forbids inline queryKey arrays in runtime source files', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const offenders = sourceFiles
      .filter((filePath) => fileContainsPattern(filePath, /queryKey\s*:\s*\[/))
      .map(toRelativePath);

    expect(offenders).toEqual([]);
  });

  it('forbids runtime consumers from importing removed aggregate store surfaces', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const offenders = sourceFiles
      .filter((filePath) =>
        fileContainsAnyPattern(filePath, REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS)
      )
      .map(toRelativePath);

    expect(offenders).toEqual([]);
  });

  it('enforces mode-resolution ownership to composition root and config modules', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const allowedResolveDataSourceCallers = new Set([
      'services/composition/appServices.ts',
      'services/config/dataSource.ts',
      'services/config/runtimeDataSourceMode.ts',
    ]);

    const offenders = sourceFiles
      .filter((filePath) => fileContainsPattern(filePath, /resolveDataSource\s*\(/))
      .map(toRelativePath)
      .filter((filePath) => !allowedResolveDataSourceCallers.has(filePath));

    expect(offenders).toEqual([]);
  });

  it('enforces service-factory ownership to composition root and service modules', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const allowedFactoryCallers = new Set([
      'services/composition/appServices.ts',
      'services/workspace/workspaceService.ts',
      'services/runs/runsService.ts',
      'services/plans/plansService.ts',
    ]);

    const offenders = sourceFiles
      .filter((filePath) => fileContainsAnyPattern(filePath, SERVICE_FACTORY_CALL_PATTERNS))
      .map(toRelativePath)
      .filter((filePath) => !allowedFactoryCallers.has(filePath));

    expect(offenders).toEqual([]);
  });

  it('forbids direct raw fetch of runtime capabilities from app query surfaces', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const offenders = sourceFiles.filter(fileContainsRawCapabilitiesFetch).map(toRelativePath);

    expect(offenders).toEqual([]);
  });

  it('keeps the app capabilities query on a governed composition boundary', () => {
    const querySource = readFileSync(
      path.join(ROOT_DIR, 'queries', 'useCapabilitiesQuery.ts'),
      'utf8'
    );

    expect(querySource).not.toContain('useRuntimeCapabilitiesQuery as useCapabilitiesQuery');
  });

  it('forbids direct useQuery ownership in selected operator views', () => {
    const governedViewFiles = [
      'views/CodeView.tsx',
      'views/diff/useDiffData.ts',
      'views/cost/useCostData.ts',
      'views/lineage/useLineageViewData.ts',
    ].map((relativePath) => path.join(ROOT_DIR, relativePath));

    const offenders = governedViewFiles
      .filter((filePath) => fileContainsPattern(filePath, /from\s+['"]@tanstack\/react-query['"]/))
      .map(toRelativePath);

    expect(offenders).toEqual([]);
  });
});
