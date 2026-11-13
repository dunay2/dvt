/**
 * Owned concern: Verify real repository/export evidence and independent deterministic acquisition.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  API_REACHABILITY_CLASSIFICATIONS,
  collectApiExportReachabilityEvidence,
  collectApiProductionReachability,
  formatApiReachabilityReport,
  listFilesRecursive,
} from '../check-architecture-dependencies.mjs';

test('export reachability identifies a production module export used only by tests', () => {
  const evidence = collectApiExportReachabilityEvidence({
    modules: [
      {
        source: 'apps/api/src/runtime.ts',
        dependencies: [{ module: './factory.js', resolved: 'apps/api/src/factory.ts' }],
      },
      { source: 'apps/api/src/factory.ts', dependencies: [] },
      {
        source: 'apps/api/test/factory.test.ts',
        dependencies: [{ module: '../src/factory.js', resolved: 'apps/api/src/factory.ts' }],
      },
    ],
    productionSources: new Set(['apps/api/src/runtime.ts', 'apps/api/src/factory.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/runtime.ts',
        "import { createRuntime } from './factory.js';\nexport const runtime = createRuntime();\n",
      ],
      [
        'apps/api/src/factory.ts',
        'export function createRuntime() { return {}; }\nexport function createWorkflowEngine() { return {}; }\n',
      ],
      [
        'apps/api/test/factory.test.ts',
        "import { createWorkflowEngine } from '../src/factory.js';\nvoid createWorkflowEngine;\n",
      ],
    ]),
  });

  assert.deepEqual(
    evidence.find(({ symbol }) => symbol === 'createWorkflowEngine'),
    {
      source: 'apps/api/src/factory.ts',
      symbol: 'createWorkflowEngine',
      classification: 'test-support-export',
      consumers: ['apps/api/test/factory.test.ts'],
    }
  );
});

test('current API report classifies every source and exposes cleanup candidates deterministically', async () => {
  const first = await collectApiProductionReachability(process.cwd(), { changedSourceFiles: [] });
  const second = await collectApiProductionReachability(process.cwd(), { changedSourceFiles: [] });

  const currentSourceCount = listFilesRecursive(resolve('apps/api/src')).filter((source) =>
    /\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/u.test(source)
  ).length;
  assert.equal(first.classifications.length, currentSourceCount);
  assert.deepEqual(
    first.classifications.filter(({ classification }) =>
      [
        API_REACHABILITY_CLASSIFICATIONS.testSupport,
        API_REACHABILITY_CLASSIFICATIONS.orphan,
      ].includes(classification)
    ),
    []
  );
  assert.equal(
    first.exportEvidence.find(({ symbol }) => symbol === 'createWorkflowEngine'),
    undefined
  );
  assert.equal(
    first.exportEvidence.find(
      ({ source }) =>
        source.includes('ManifestArtifactResolutionError') ||
        source.includes('ManifestArtifactResolver')
    ),
    undefined
  );
  assert.deepEqual(
    first.exportEvidence.filter(({ classification }) => classification === 'test-support-export'),
    []
  );
  assert.equal(
    first.exportEvidence.find(
      ({ source, symbol }) =>
        source === 'apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts' &&
        symbol === 'DbtProjectImportRuntime'
    )?.classification,
    'production-export'
  );
  assert.ok(
    first.classifications.some(
      ({ classification }) =>
        classification === API_REACHABILITY_CLASSIFICATIONS.conditionalProduction
    )
  );
  assert.ok(
    first.classifications.some(
      ({ classification }) => classification === API_REACHABILITY_CLASSIFICATIONS.validNullObject
    )
  );
  assert.ok(first.profileEvidence.every(({ sources }) => sources.length > 0));
  assert.equal(formatApiReachabilityReport(first), formatApiReachabilityReport(second));
});
