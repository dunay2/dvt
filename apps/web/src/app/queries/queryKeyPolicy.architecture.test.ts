import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readArchitectureSources } from '../../testing/vitestSuites.architecture.support';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDED_FILE_SUFFIXES = ['.test.ts', '.test.tsx'];
const INLINE_QUERY_KEY_PATTERN = /queryKey\s*:\s*\[/;
const REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*stores\/appStore(?:\.ts)?['"]/,
  /from\s+['"][^'"]*stores\/index(?:\.ts)?['"]/,
  /import\s+['"][^'"]*stores\/appStore(?:\.ts)?['"]/,
  /import\s+['"][^'"]*stores\/index(?:\.ts)?['"]/,
];
const SERVICE_FACTORY_CALL_PATTERNS = [
  /createWorkspacePorts\s*\(/,
  /createRunsService\s*\(/,
  /createPlansService\s*\(/,
];
const RAW_CAPABILITIES_FETCH_PATTERNS = [
  "fetch('/api/capabilities'",
  'fetch("/api/capabilities"',
] as const;
let runtimeSources: Promise<Map<string, string>> | undefined;

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

function readRuntimeSources(): Promise<Map<string, string>> {
  if (!runtimeSources) {
    const files: string[] = [];
    collectSourceFiles(ROOT_DIR, files);
    runtimeSources = readArchitectureSources(files);
  }
  return runtimeSources;
}

function sourceContainsAnyPattern(source: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(source));
}

async function findRuntimeSourcePaths(predicate: (source: string) => boolean): Promise<string[]> {
  const sources = await readRuntimeSources();
  return [...sources]
    .filter(([, source]) => predicate(source))
    .map(([filePath]) => toRelativePath(filePath));
}

async function readRuntimeSource(relativePath: string): Promise<string> {
  const source = (await readRuntimeSources()).get(path.join(ROOT_DIR, relativePath));
  if (source === undefined) throw new Error(`Missing governed runtime source: ${relativePath}`);
  return source;
}

function sourceContainsRawCapabilitiesFetch(source: string): boolean {
  const compactSource = source.replace(/[ \n\r\t]/g, '');
  return RAW_CAPABILITIES_FETCH_PATTERNS.some((pattern) => compactSource.includes(pattern));
}

describe('Query key policy (architecture)', () => {
  it('forbids inline queryKey arrays in runtime source files', async () => {
    const offenders = await findRuntimeSourcePaths((source) =>
      INLINE_QUERY_KEY_PATTERN.test(source)
    );

    expect(offenders).toEqual([]);
  });

  it('forbids runtime consumers from importing removed aggregate store surfaces', async () => {
    const offenders = await findRuntimeSourcePaths((source) =>
      sourceContainsAnyPattern(source, REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS)
    );

    expect(offenders).toEqual([]);
  });

  it('enforces service-factory ownership to composition root and service modules', async () => {
    const allowedFactoryCallers = new Set([
      'services/composition/appServices.ts',
      'services/workspace/workspacePorts.ts',
      'services/runs/runsService.ts',
      'services/plans/plansService.ts',
    ]);

    const callers = await findRuntimeSourcePaths((source) =>
      sourceContainsAnyPattern(source, SERVICE_FACTORY_CALL_PATTERNS)
    );
    const offenders = callers.filter((filePath) => !allowedFactoryCallers.has(filePath));

    expect(offenders).toEqual([]);
  });

  it('forbids direct raw fetch of runtime capabilities from app query surfaces', async () => {
    const offenders = await findRuntimeSourcePaths(sourceContainsRawCapabilitiesFetch);

    expect(offenders).toEqual([]);
  });

  it('keeps the app capabilities query on a governed composition boundary', async () => {
    const querySource = await readRuntimeSource('queries/useCapabilitiesQuery.ts');

    expect(querySource).toContain('const capabilitiesPort = useCapabilitiesPort()');
    expect(querySource).toContain('createCapabilitiesQueryOptions(capabilitiesPort)');
    expect(querySource).toContain("from '@tanstack/react-query'");
  });

  it('forbids direct useQuery ownership in selected operator views', async () => {
    const governedViewFiles = [
      'plugins/dbt/DbtNodeRenderer.tsx',
      'views/admin/useAdminViewData.ts',
      'views/artifacts/useArtifactsViewModel.ts',
      'views/CodeView.tsx',
      'views/diff/useDiffData.ts',
      'views/cost/useCostData.ts',
      'views/lineage/useLineageViewData.ts',
      'views/runs/useRunWorkspace.ts',
    ];
    const offenders: string[] = [];
    for (const relativePath of governedViewFiles) {
      if (/from\s+['"]@tanstack\/react-query['"]/.test(await readRuntimeSource(relativePath))) {
        offenders.push(relativePath);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('recognizes the same forbidden query, aggregate-store and factory syntax', () => {
    expect(
      ['queryKey: []', 'queryKey \n: [id]'].every((source) => INLINE_QUERY_KEY_PATTERN.test(source))
    ).toBe(true);
    expect(INLINE_QUERY_KEY_PATTERN.test('queryKey: keys.all()')).toBe(false);
    const imports = [
      "from '../stores/appStore'",
      "from '../stores/index.ts'",
      "import '../stores/appStore.ts'",
      "import '../stores/index'",
    ];
    expect(
      imports.every((source) =>
        sourceContainsAnyPattern(source, REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS)
      )
    ).toBe(true);
    expect(
      sourceContainsAnyPattern(
        "from '../stores/canvasStore'",
        REMOVED_AGGREGATE_STORE_IMPORT_PATTERNS
      )
    ).toBe(false);
    expect(
      ['createWorkspacePorts()', 'createRunsService ()', 'createPlansService\n()'].every((source) =>
        sourceContainsAnyPattern(source, SERVICE_FACTORY_CALL_PATTERNS)
      )
    ).toBe(true);
    expect(
      sourceContainsAnyPattern('createPlansServiceOptions()', SERVICE_FACTORY_CALL_PATTERNS)
    ).toBe(false);
  });

  it('preserves the raw-fetch policy for both quotes and exactly four ASCII whitespace characters', () => {
    for (const quote of ["'", '"']) {
      for (const whitespace of ['', ' ', '\n', '\r', '\t', ' \n\r\t']) {
        expect(
          sourceContainsRawCapabilitiesFetch(
            `fetch${whitespace}(${whitespace}${quote}/api/capabilities${quote})`
          )
        ).toBe(true);
      }
    }
    for (const source of [
      "fetch('/api/capabilities/extra')",
      "fetch('\u00a0/api/capabilities')",
      "fetch(\v'/api/capabilities')",
      "fetch(\f'/api/capabilities')",
    ]) {
      expect(sourceContainsRawCapabilitiesFetch(source)).toBe(false);
    }
  });
});
