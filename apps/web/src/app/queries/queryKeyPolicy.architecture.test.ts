import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_FILE_SUFFIXES = ['.test.ts', '.test.tsx'];

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

  it('forbids runtime consumers from importing legacy appStore directly', () => {
    const sourceFiles: string[] = [];
    collectSourceFiles(ROOT_DIR, sourceFiles);

    const offenders = sourceFiles
      .filter((filePath) => !toRelativePath(filePath).endsWith('stores/appStore.ts'))
      .filter((filePath) =>
        /from\s+['"][^'"]*stores\/appStore(?:\.ts)?['"]|import\s+['"][^'"]*stores\/appStore(?:\.ts)?['"]/.test(
          readFileSync(filePath, 'utf8')
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
});
