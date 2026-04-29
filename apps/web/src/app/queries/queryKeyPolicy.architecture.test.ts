import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_FILE_SUFFIXES = ['.test.ts', '.test.tsx'];
const REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*stores\/(?:appStore|index)(?:\.ts)?['"]/,
  /import\s+['"][^'"]*stores\/(?:appStore|index)(?:\.ts)?['"]/,
];

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

describe('Query key policy (architecture)', () => {
  it('forbids inline queryKey arrays in runtime source files', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const offenders = sourceFiles
      .filter((filePath) => /queryKey\s*:\s*\[/.test(readFileSync(filePath, 'utf8')))
      .map(toRelativePath);

    expect(offenders).toEqual([]);
  });

  it('forbids runtime consumers from importing removed aggregate store surfaces', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const offenders = sourceFiles
      .filter((filePath) =>
        REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS.some((pattern) =>
          pattern.test(readFileSync(filePath, 'utf8'))
        )
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
      .filter((filePath) => /resolveDataSource\s*\(/.test(readFileSync(filePath, 'utf8')))
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
      .filter((filePath) =>
        /createWorkspaceService\s*\(|createRunsService\s*\(|createPlansService\s*\(/.test(
          readFileSync(filePath, 'utf8')
        )
      )
      .map(toRelativePath)
      .filter((filePath) => !allowedFactoryCallers.has(filePath));

    expect(offenders).toEqual([]);
  });

  it('forbids direct raw fetch of runtime capabilities from app query surfaces', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const offenders = sourceFiles
      .filter((filePath) =>
        /fetch\s*\(\s*['"]\/api\/capabilities['"]/.test(readFileSync(filePath, 'utf8'))
      )
      .map(toRelativePath);

    expect(offenders).toEqual([]);
  });

  it('keeps the app capabilities query on a governed composition boundary', () => {
    const querySource = readFileSync(
      path.join(ROOT_DIR, 'queries', 'useCapabilitiesQuery.ts'),
      'utf8'
    );

    expect(querySource).not.toMatch(
      /export\s*\{\s*[\s\S]*useRuntimeCapabilitiesQuery\s+as\s+useCapabilitiesQuery[\s\S]*\}\s*from\s*['"][^'"]*capabilities\/runtime-capabilities['"]/
    );
  });

  it('forbids direct useQuery ownership in selected operator views', () => {
    const governedViewFiles = [
      'views/CodeView.tsx',
      'views/diff/useDiffData.ts',
      'views/cost/useCostData.ts',
      'views/lineage/useLineageViewData.ts',
    ].map((relativePath) => path.join(ROOT_DIR, relativePath));

    const offenders = governedViewFiles
      .filter((filePath) =>
        /from\s+['"]@tanstack\/react-query['"]/.test(readFileSync(filePath, 'utf8'))
      )
      .map(toRelativePath);

    expect(offenders).toEqual([]);
  });
});
