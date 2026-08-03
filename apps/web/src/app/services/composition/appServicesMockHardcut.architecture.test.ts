/** Owned concern: enforce semantic boundaries for the web API-only app-services hardcut. */
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const HARDCUT_OWNED_CONCERN_MODULES = [
  ['src', 'app', 'services', 'composition', 'appServices.ts'],
  ['src', 'app', 'services', 'AppServicesContext.tsx'],
  ['src', 'app', 'services', 'workspace', 'workspacePorts.ts'],
  ['src', 'app', 'services', 'plans', 'plansService.ts'],
  ['src', 'app', 'services', 'runs', 'runsService.ts'],
  ['src', 'app', 'bootstrap', 'AuthRouteGate.tsx'],
  ['src', 'testing', 'appServicesTestDoubles.ts'],
  ['src', 'testing', 'fixtures', 'mockDbtData.ts'],
  ['src', 'testing', 'plansPortDoubles.ts'],
  ['src', 'testing', 'runsPortDoubles.ts'],
  ['src', 'testing', 'workspaceGraphDraftAuthoringPortDoubles.ts'],
  ['src', 'testing', 'workspaceGraphDraftAuthoringStoreDoubles.ts'],
  ['src', 'testing', 'workspacePortDoubles.ts'],
  ['src', 'app', 'services', 'composition', 'appServicesMockHardcut.architecture.test.ts'],
] as const;

const HARDCUT_DOCUMENTATION_FILES = [
  [
    '..',
    '..',
    'docs',
    'architecture',
    'components',
    'web',
    'f04-frontend-data-boundary-technical-manual-20260404.md',
  ],
  ['..', '..', 'docs', 'guides', 'f04-frontend-data-boundary-user-manual-20260404.md'],
  [
    '..',
    '..',
    'docs',
    'architecture',
    'components',
    'web',
    'workspace',
    'mock-runtime-hardcut-component.md',
  ],
  [
    '..',
    '..',
    'docs',
    'architecture',
    'components',
    'web',
    'workspace',
    'mock-runtime-hardcut-user-stories.md',
  ],
  [
    '..',
    '..',
    'docs',
    'architecture',
    'components',
    'web',
    'workspace',
    'workspace-port-decomposition-component.md',
  ],
  [
    '..',
    '..',
    'docs',
    'architecture',
    'components',
    'web',
    'workspace',
    'workspace-port-decomposition-user-stories.md',
  ],
  [
    '..',
    '..',
    'docs',
    'planning',
    'proposals',
    'mandatory',
    'frontend-and-ux',
    'web-api-mock-runtime-hardcut-plan-20260510.md',
  ],
  ['..', '..', 'docs', 'planning', 'reviews', '20260510-web-api-integration-gap-review.md'],
] as const;

const PRODUCT_COMPOSITION_FILES = [
  ['src', 'app', 'services', 'composition', 'appServices.ts'],
  ['src', 'app', 'services', 'workspace', 'workspacePorts.ts'],
  ['src', 'app', 'services', 'plans', 'plansService.ts'],
  ['src', 'app', 'services', 'runs', 'runsService.ts'],
  ['src', 'app', 'bootstrap', 'AuthRouteGate.tsx'],
] as const;

function readRepoFile(...segments: string[]): string {
  return readFileSync(resolve(process.cwd(), ...segments), 'utf8');
}

function listFilesRecursive(...segments: string[]): string[] {
  const root = resolve(process.cwd(), ...segments);
  const stack = [root];
  const files: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else {
        files.push(relative(process.cwd(), entryPath).split(sep).join('/'));
      }
    }
  }

  return files;
}

describe('app services mock hardcut architecture', () => {
  it('keeps product composition free of mock adapters and mode branches', () => {
    for (const filePath of PRODUCT_COMPOSITION_FILES) {
      const source = readRepoFile(...filePath);

      expect(source).not.toMatch(/from ['"].*\.mock['"]/);
      expect(source).not.toContain("mode === 'mock'");
      expect(source).not.toContain("'mock'");
      expect(source).not.toContain('createMock');
    }
  });

  it('keeps product runtime free of an exhausted data-source strategy', () => {
    const productFiles = listFilesRecursive('src').filter(
      (filePath) =>
        !filePath.includes('/testing/') &&
        !filePath.includes('/test/') &&
        !filePath.includes('.test.') &&
        !filePath.includes('.spec.')
    );
    const forbiddenStrategyTerms = [
      /\bDataSourceMode\b/,
      /\bresolveDataSource\b/,
      /\bgetRuntimeDataSourceMode\b/,
      /\bsetRuntimeDataSourceMode\b/,
      /\bVITE_DATA_SOURCE\b/,
      /\bdataSourceMode\b/,
    ];

    for (const filePath of productFiles) {
      const source = readRepoFile(...filePath.split('/'));

      for (const forbiddenTerm of forbiddenStrategyTerms) {
        expect(source, `${filePath} contains ${forbiddenTerm}`).not.toMatch(forbiddenTerm);
      }
    }
  });

  it('keeps product services free of non-test mock modules', () => {
    const serviceFiles = listFilesRecursive('src', 'app', 'services');
    const productionMockFiles = serviceFiles.filter(
      (filePath) => filePath.endsWith('.mock.ts') && !filePath.endsWith('.mock.test.ts')
    );

    expect(productionMockFiles).toEqual([]);
  });

  it('requires tests to inject doubles instead of enabling product runtime branches', () => {
    const source = readRepoFile('src', 'app', 'services', 'composition', 'appServices.ts');

    expect(source).not.toContain('readonly mode?');
    expect(source).toContain('buildAppServices(overrides: AppServicesOverrides = {})');
  });

  it('requires hardcut modules to declare their owned concern at the module boundary', () => {
    for (const filePath of HARDCUT_OWNED_CONCERN_MODULES) {
      const source = readRepoFile(...filePath).trimStart();

      expect(source.slice(0, 220), filePath.join('/')).toContain('Owned concern:');
    }
  });

  it('keeps hardcut documentation aligned to API-only product runtime and test-only doubles', () => {
    const forbiddenDriftTerms = [
      /test\/demo/i,
      /mock\/demo/i,
      /demo-only/i,
      /demo mode/i,
      /demo-local/i,
      /workspacePorts\.mock/i,
      /legacy/i,
    ];

    for (const filePath of HARDCUT_DOCUMENTATION_FILES) {
      const source = readRepoFile(...filePath);

      for (const forbiddenTerm of forbiddenDriftTerms) {
        expect(source, `${filePath.join('/')} contains ${forbiddenTerm}`).not.toMatch(
          forbiddenTerm
        );
      }
    }
  });

  it('keeps Source Import documentation aligned with implemented protected-runtime rails', () => {
    const componentSource = readRepoFile(
      '..',
      '..',
      'docs',
      'architecture',
      'components',
      'web',
      'workspace',
      'workspace-port-decomposition-component.md'
    );
    const userStoriesSource = readRepoFile(
      '..',
      '..',
      'docs',
      'architecture',
      'components',
      'web',
      'workspace',
      'workspace-port-decomposition-user-stories.md'
    );

    for (const source of [componentSource, userStoriesSource]) {
      expect(source).toContain('ListWarehouseConnections');
      expect(source).toContain('ListWarehouseConnectionSourceObjects');
      expect(source).toContain('ImportWarehouseSources');
      expect(source).not.toContain('warehouse source rails do not exist');
      expect(source).not.toContain('source import port returns unavailable capability');
      expect(source).not.toContain('generated graph/file changes remain test-only');
    }
  });
});
