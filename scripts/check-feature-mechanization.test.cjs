/** Owned concern: prove feature mechanization manifest and implementation guard behavior. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  extractFeatureMechanizationManifests,
  FeatureMechanizationGitDiffReader,
  normalizeDbFeatureMechanizationManifestRows,
  readFeatureMechanizationManifestsFromDb,
  shouldRefreshFeatureMechanizationManifestDb,
  validateFeatureImplementationManifests,
  validateFeatureMechanizationManifest,
  validateFeatureMechanizationDocs,
  validateFeatureMechanizationManifestEntries,
} = require('./check-feature-mechanization.cjs');

const validManifest = {
  version: 1,
  featureId: 'TF-E2-M-B',
  mechanizationStatus: 'closed',
  noHumanDecisionsRemaining: true,
  implementationPlan:
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-b-canvas-draft-denial-posture-implementation-plan-20260501.md',
  componentGuides: [
    'docs/architecture/components/web/graph/canvas-draft-access-posture-component.md',
  ],
  userStories: [
    'docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-user-stories.md',
  ],
  governingSources: [
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
  ],
  allowedImplementationSurfaces: ['apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts'],
  forbiddenImplementationSurfaces: ['apps/web/src/app/views/canvas/** token refresh'],
  commandQueryRails: [
    {
      name: 'GetWorkspaceGraphDraft',
      type: 'query',
      dddOwner: 'WorkspaceGraphDraft read boundary',
    },
  ],
  domainObjects: [
    {
      name: 'CanvasDraftAccessPosture',
      type: 'presentation model',
      owner: 'Canvas draft access posture component',
    },
  ],
  fowlerSignals: ['boundary drift'],
  architectureGuards: [
    {
      name: 'canvasStartupAndDraftRecovery.architecture.test.ts',
      command: 'pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts',
    },
  ],
  cypressFlows: [
    {
      name: 'canvas-draft-access-posture.cy.ts',
      command:
        'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
    },
  ],
  redGreenCycles: [
    {
      id: 'auth-transport-posture',
      redTest: 'pnpm --filter @dvt/web test -- canvasDraftAuthTransportPosture.test.ts',
      expectedFailure: 'canvasDraftAuthTransportPosture.ts does not exist',
      patchSurfaces: ['apps/web/src/app/views/canvas/canvasDraftAuthTransportPosture.ts'],
      greenTest: 'pnpm --filter @dvt/web test -- canvasDraftAuthTransportPosture.test.ts',
    },
  ],
  symbols: [
    {
      name: 'CanvasDraftAccessPosture',
      path: 'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts',
      dddOwner: 'Canvas draft access posture component',
      cqRails: ['GetWorkspaceGraphDraft'],
      fowlerSignals: ['boundary drift'],
      architectureGuard: 'canvasStartupAndDraftRecovery.architecture.test.ts',
      cypressCoverage: 'canvas-draft-access-posture.cy.ts',
      unitTests: ['canvasDraftAccessPostureModel.test.ts'],
    },
  ],
  completionGate: ['pnpm --filter @dvt/web typecheck', 'pnpm verify:prepush'],
};

function markdownWithManifest(manifest = validManifest) {
  return [
    '# TF-E2-M-B',
    '',
    '```feature-mechanization',
    JSON.stringify(manifest, null, 2),
    '```',
    '',
  ].join('\n');
}

test('extractFeatureMechanizationManifests reads feature-mechanization fenced blocks', () => {
  const manifests = extractFeatureMechanizationManifests(markdownWithManifest(), 'plan.md');

  assert.equal(manifests.length, 1);
  assert.equal(manifests[0].manifest.featureId, 'TF-E2-M-B');
  assert.equal(manifests[0].sourcePath, 'plan.md');
});

test('validateFeatureMechanizationManifest accepts a closed mechanical feature contract', () => {
  const result = validateFeatureMechanizationManifest(validManifest, 'plan.md');

  assert.deepEqual(result.errors, []);
});

test('validateFeatureMechanizationManifest accepts a closed feature without implementation symbols', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      symbols: [],
    },
    'plan.md'
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureMechanizationManifest rejects an implemented feature without symbols', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      mechanizationStatus: 'implemented',
      symbols: [],
    },
    'plan.md'
  );

  assert.match(result.errors.join('\n'), /missing symbols/);
});

test('validateFeatureMechanizationManifest rejects open human decisions', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      noHumanDecisionsRemaining: false,
    },
    'plan.md'
  );

  assert.match(result.errors.join('\n'), /must set noHumanDecisionsRemaining to true/);
});

test('validateFeatureMechanizationManifest rejects red-green cycles without expected failure', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      redGreenCycles: [
        {
          ...validManifest.redGreenCycles[0],
          expectedFailure: '',
        },
      ],
    },
    'plan.md'
  );

  assert.match(result.errors.join('\n'), /expectedFailure/);
});

test('validateFeatureMechanizationManifest rejects symbols without C&Q, DDD, Fowler, architecture, Cypress, and unit tests', () => {
  const result = validateFeatureMechanizationManifest(
    {
      ...validManifest,
      symbols: [
        {
          name: 'CanvasDraftAccessPosture',
          path: 'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts',
        },
      ],
    },
    'plan.md'
  );

  assert.match(result.errors.join('\n'), /missing dddOwner/);
  assert.match(result.errors.join('\n'), /missing cqRails/);
  assert.match(result.errors.join('\n'), /missing fowlerSignals/);
  assert.match(result.errors.join('\n'), /missing architectureGuard/);
  assert.match(result.errors.join('\n'), /missing cypressCoverage/);
  assert.match(result.errors.join('\n'), /missing unitTests/);
});

test('validateFeatureMechanizationDocs requires requested feature manifests to exist', () => {
  const result = validateFeatureMechanizationDocs(
    [
      {
        path: 'plan.md',
        content: markdownWithManifest(),
      },
    ],
    {
      requiredFeatureIds: ['TF-E2-MISSING'],
    }
  );

  assert.match(
    result.errors.join('\n'),
    /Required feature TF-E2-MISSING has no feature mechanization manifest/
  );
});

test('validateFeatureMechanizationDocs accepts requested closed feature manifests', () => {
  const result = validateFeatureMechanizationDocs(
    [
      {
        path: 'plan.md',
        content: markdownWithManifest(),
      },
    ],
    {
      requiredFeatureIds: ['TF-E2-M-B'],
    }
  );

  assert.deepEqual(result.errors, []);
});

test('normalizeDbFeatureMechanizationManifestRows returns distinct manifest entries from query rows', () => {
  const rows = [
    {
      source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
      raw_manifest: validManifest,
    },
    {
      source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
      raw_manifest: validManifest,
    },
    {
      source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/other.md',
      raw_manifest: {
        ...validManifest,
        featureId: 'TF-E2-OTHER',
      },
    },
  ];

  assert.deepEqual(normalizeDbFeatureMechanizationManifestRows(rows), [
    {
      sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
      manifest: validManifest,
    },
    {
      sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/other.md',
      manifest: {
        ...validManifest,
        featureId: 'TF-E2-OTHER',
      },
    },
  ]);
});

test('normalizeDbFeatureMechanizationManifestRows aggregates DB-authored local rail manifests by feature', () => {
  const firstLocalManifest = {
    ...validManifest,
    commandQueryRails: [
      {
        name: 'SelectWorkspaceScope',
        type: 'command',
        dddOwner: 'Workspace shell session',
      },
    ],
    symbols: [
      {
        ...validManifest.symbols[0],
        name: 'selectWorkspaceScope',
        cqRails: ['SelectWorkspaceScope'],
      },
    ],
  };
  const secondLocalManifest = {
    ...validManifest,
    commandQueryRails: [
      {
        name: 'GetWorkspaceScopeSelection',
        type: 'query',
        dddOwner: 'Workspace shell session',
      },
    ],
    symbols: [
      {
        ...validManifest.symbols[0],
        name: 'readWorkspaceScopeSelection',
        cqRails: ['GetWorkspaceScopeSelection'],
      },
    ],
  };

  const result = normalizeDbFeatureMechanizationManifestRows([
    {
      source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/workspace-scope.md',
      raw_manifest: firstLocalManifest,
    },
    {
      source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/workspace-scope.md',
      raw_manifest: secondLocalManifest,
    },
  ]);

  assert.equal(result.length, 1);
  assert.deepEqual(
    result[0].manifest.commandQueryRails.map((rail) => rail.name),
    ['SelectWorkspaceScope', 'GetWorkspaceScopeSelection']
  );
  assert.deepEqual(
    result[0].manifest.symbols.map((symbol) => symbol.name),
    ['selectWorkspaceScope', 'readWorkspaceScopeSelection']
  );
});

test('validateFeatureMechanizationManifestEntries validates DB-backed manifests', () => {
  const result = validateFeatureMechanizationManifestEntries(
    [
      {
        sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
        manifest: validManifest,
      },
    ],
    {
      requiredFeatureIds: ['TF-E2-M-B'],
    }
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.manifestCount, 1);
  assert.deepEqual(result.features, ['TF-E2-M-B']);
});

test('readFeatureMechanizationManifestsFromDb imports and queries DB manifests', async () => {
  const importCalls = [];
  const queryCalls = [];
  const client = {
    async query(sql, params) {
      queryCalls.push({ sql, params });
      assert.match(sql, /raw_manifest \? 'featureId'/);

      if (params) {
        assert.match(sql, /planning_query_store\.command_query_rails/);
        return {
          rows: [
            {
              source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
              source_content_sha256: 'stale',
            },
          ],
        };
      }

      return {
        rows: [
          {
            source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
            raw_manifest: validManifest,
          },
        ],
      };
    },
  };

  const result = await readFeatureMechanizationManifestsFromDb({
    client,
    databaseUrl: 'postgresql://example.local/planning',
    currentSourceHashes: new Map([
      ['docs/planning/proposals/mandatory/frontend-and-ux/example.md', 'fresh'],
    ]),
    deps: {
      async runPlanningImport(options, deps) {
        importCalls.push({
          databaseUrl: options.databaseUrl,
          ifStale: options.ifStale,
          silent: options.silent,
          logger: typeof deps.logger.log,
        });
      },
    },
  });

  assert.deepEqual(importCalls, [
    {
      databaseUrl: 'postgresql://example.local/planning',
      ifStale: false,
      silent: true,
      logger: 'function',
    },
  ]);
  assert.equal(queryCalls.length, 2);
  assert.match(queryCalls[1].sql, /planning_query_store\.command_query_rail_manifest_query/);
  assert.match(queryCalls[1].sql, /planning_query_store\.feature_mechanization_local_rails/);
  assert.equal(
    queryCalls[1].sql.match(/rail_id not like 'current#rail-decision#%'/g)?.length,
    2,
    'current rail decisions must be excluded from both feature-manifest projections'
  );
  assert.match(queryCalls[1].sql, /partition by rail_id/);
  assert.doesNotMatch(queryCalls[1].sql, /distinct on/i);
  assert.deepEqual(result, [
    {
      sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
      manifest: validManifest,
    },
  ]);
});

test('readFeatureMechanizationManifestsFromDb skips import when DB manifests are fresh', async () => {
  const importCalls = [];
  const queryCalls = [];
  const client = {
    async query(sql, params) {
      queryCalls.push({ sql, params });

      if (params) {
        assert.match(sql, /planning_query_store\.command_query_rails/);
        return {
          rows: [
            {
              source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
              source_content_sha256: 'fresh',
            },
          ],
        };
      }

      return {
        rows: [
          {
            source_path: 'docs/planning/proposals/mandatory/frontend-and-ux/example.md',
            raw_manifest: validManifest,
          },
        ],
      };
    },
  };

  const result = await readFeatureMechanizationManifestsFromDb({
    client,
    currentSourceHashes: new Map([
      ['docs/planning/proposals/mandatory/frontend-and-ux/example.md', 'fresh'],
    ]),
    deps: {
      async runPlanningImport() {
        importCalls.push('unexpected');
      },
    },
  });

  assert.deepEqual(importCalls, []);
  assert.match(queryCalls[1].sql, /planning_query_store\.command_query_rail_manifest_query/);
  assert.match(queryCalls[1].sql, /planning_query_store\.feature_mechanization_local_rails/);
  assert.equal(result.length, 1);
});

test('shouldRefreshFeatureMechanizationManifestDb refreshes an empty DB projection', async () => {
  const client = {
    async query(sql) {
      assert.match(sql, /count\(\*\)::int as manifest_count/);
      return { rows: [{ manifest_count: 0 }] };
    },
  };

  assert.equal(await shouldRefreshFeatureMechanizationManifestDb(client, new Map()), true);
});

test('validateFeatureImplementationManifests rejects changed files outside allowed implementation surfaces', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: validManifest,
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/unplannedCanvasShortcut.ts'],
    }
  );

  assert.match(result.errors.join('\n'), /outside allowedImplementationSurfaces/);
});

test('validateFeatureImplementationManifests rejects changed files on forbidden implementation surfaces', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/src/app/views/canvas/**',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/tokenRefreshShortcut.ts'],
    }
  );

  assert.match(result.errors.join('\n'), /matches forbiddenImplementationSurfaces/);
});

test('validateFeatureImplementationManifests permits deletion of a forbidden surface', () => {
  const deletedPath = 'apps/web/src/app/views/canvas/tokenRefreshShortcut.ts';
  const ownedPath = validManifest.allowedImplementationSurfaces[0];
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          forbiddenImplementationSurfaces: [deletedPath],
        },
      },
    ],
    {
      changedFiles: [ownedPath, deletedPath],
      deletedFiles: [deletedPath],
      currentFiles: [ownedPath],
    }
  );

  assert.equal(result.errors.length, 0);
});

test('validateFeatureImplementationManifests rejects deletion outside allowed and forbidden surfaces', () => {
  const deletedPath = 'apps/api/src/retiredCatalog.ts';
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: validManifest,
      },
    ],
    {
      changedFiles: [deletedPath],
      deletedFiles: [deletedPath],
    }
  );

  assert.match(result.errors.join('\n'), /outside allowedImplementationSurfaces/);
});

test('validateFeatureImplementationManifests permits deletion of a complete forbidden subtree', () => {
  const deletedPath = 'apps/api/docs/retired-component.md';
  const ownedPath = validManifest.allowedImplementationSurfaces[0];
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'api-retirement-plan.md',
        manifest: {
          ...validManifest,
          featureId: 'R1-1D-API-GOVERNANCE-HARDCUT',
          forbiddenImplementationSurfaces: ['apps/api/docs/**'],
        },
      },
    ],
    {
      changedFiles: [ownedPath, deletedPath],
      deletedFiles: [deletedPath],
      currentFiles: [ownedPath, 'apps/api/src/server.ts'],
    }
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureImplementationManifests rejects deletion authorized only by another feature wildcard', () => {
  const deletedPath = 'apps/api/src/auth.ts';
  const ownedPath = validManifest.allowedImplementationSurfaces[0];
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'canvas-plan.md',
        manifest: {
          ...validManifest,
          featureId: 'TF-E2-M-C',
        },
      },
      {
        sourcePath: 'unrelated-api-plan.md',
        manifest: {
          ...validManifest,
          featureId: 'UNRELATED-API',
          allowedImplementationSurfaces: ['apps/worker/**'],
          forbiddenImplementationSurfaces: ['apps/api/** backend authorization changes'],
        },
      },
    ],
    {
      changedFiles: [ownedPath, deletedPath],
      deletedFiles: [deletedPath],
      currentFiles: [ownedPath],
    }
  );

  assert.match(result.errors.join('\n'), /outside allowedImplementationSurfaces/);
});

test('validateFeatureImplementationManifests rejects deletion authorized only by another feature exact path', () => {
  const deletedPath = 'apps/api/src/auth.ts';
  const ownedPath = validManifest.allowedImplementationSurfaces[0];
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'canvas-plan.md',
        manifest: {
          ...validManifest,
          featureId: 'TF-E2-M-C',
          allowedImplementationSurfaces: [ownedPath],
        },
      },
      {
        sourcePath: 'unrelated-api-plan.md',
        manifest: {
          ...validManifest,
          featureId: 'UNRELATED-API',
          allowedImplementationSurfaces: ['apps/worker/**'],
          forbiddenImplementationSurfaces: [deletedPath],
        },
      },
    ],
    {
      changedFiles: [ownedPath, deletedPath],
      deletedFiles: [deletedPath],
      currentFiles: [ownedPath],
    }
  );

  assert.match(result.errors.join('\n'), /outside allowedImplementationSurfaces/);
});

test('validateFeatureImplementationManifests applies forbidden surfaces only from the owning feature manifest', () => {
  const canvasFeatureManifest = {
    ...validManifest,
    featureId: 'TF-E2-M-C',
    allowedImplementationSurfaces: [
      'apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts',
    ],
    forbiddenImplementationSurfaces: ['apps/api/** backend authorization changes'],
  };
  const previousFeatureManifest = {
    ...validManifest,
    featureId: 'TF-E2-M-B',
    allowedImplementationSurfaces: ['apps/web/src/app/services/api/**'],
    forbiddenImplementationSurfaces: ['apps/web/src/app/views/canvas/** JWT decoding'],
  };

  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'previous-plan.md',
        manifest: previousFeatureManifest,
      },
      {
        sourcePath: 'current-plan.md',
        manifest: canvasFeatureManifest,
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts'],
    }
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureImplementationManifests prefers the most specific allowed surface before applying forbids', () => {
  const broadDocsManifest = {
    ...validManifest,
    featureId: 'GD-BROAD-DOCS',
    allowedImplementationSurfaces: ['docs/**/index.md'],
    forbiddenImplementationSurfaces: ['docs/archive/**'],
  };
  const archiveManifest = {
    ...validManifest,
    featureId: 'GD-PLANNER-LOCAL-DOC-ARCHIVE-20260601',
    allowedImplementationSurfaces: ['docs/archive/index.md', 'docs/archive/planner/**'],
    forbiddenImplementationSurfaces: ['apps/**'],
  };

  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'broad-docs-plan.md',
        manifest: broadDocsManifest,
      },
      {
        sourcePath: 'archive-plan.md',
        manifest: archiveManifest,
      },
    ],
    {
      changedFiles: ['docs/archive/index.md', 'docs/archive/planner/index.md'],
    }
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureImplementationManifests rejects added exported code symbols missing from the manifest', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: validManifest,
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts'],
      addedLinesByPath: {
        'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts': [
          'export function createUnplannedCanvasPosture() {',
          "  return 'unsafe';",
          '}',
        ],
      },
    }
  );

  assert.match(result.errors.join('\n'), /createUnplannedCanvasPosture/);
  assert.match(result.errors.join('\n'), /not declared in feature mechanization symbols/);
});

test('validateFeatureImplementationManifests accepts added exported code symbols declared in the manifest', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          forbiddenImplementationSurfaces: ['apps/web/src/app/services/api/** token refresh'],
          symbols: [
            ...validManifest.symbols,
            {
              ...validManifest.symbols[0],
              name: 'createPlannedCanvasPosture',
            },
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts'],
      addedLinesByPath: {
        'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel.ts': [
          'export function createPlannedCanvasPosture() {',
          "  return 'safe';",
          '}',
        ],
      },
    }
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureImplementationManifests does not require symbol declarations for test shards', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
            'scripts/planning-db-query-tests/helpers.cjs',
          ],
        },
      },
    ],
    {
      changedFiles: [
        'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
        'scripts/planning-db-query-tests/helpers.cjs',
      ],
      addedLinesByPath: {
        'scripts/planning-db-operate-tests/feature-mechanization.test.cjs': [
          "const test = require('node:test');",
          "const assert = require('node:assert/strict');",
          'function featureMechanizationRecordArgs() {',
          '  return [];',
          '}',
        ],
        'scripts/planning-db-query-tests/helpers.cjs': [
          "const path = require('node:path');",
          'function runPlanningDbQueryCli() {',
          '  return null;',
          '}',
        ],
      },
    }
  );

  assert.deepEqual(result.errors, []);
});

test('validateFeatureImplementationManifests rejects Cypress intercepts for workspace graph drafts', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'],
      fileContentsByPath: {
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts':
          "cy.intercept('GET', '/workspace/graph/draft', { fixture: 'draft.json' });",
      },
    }
  );

  assert.match(result.errors.join('\n'), /must not use cy\.intercept\(\).*workspace\/graph\/draft/);
});

test('validateFeatureImplementationManifests rejects Cypress direct PUT seeding for workspace graph drafts', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'],
      fileContentsByPath: {
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts':
          "cy.request('PUT', '/workspace/graph/draft', { nodes: [] });",
      },
    }
  );

  assert.match(result.errors.join('\n'), /must not issue direct PUT.*workspace\/graph\/draft/);
});

test('validateFeatureImplementationManifests allows Cypress draft GET preflight with unrelated PUT requests', () => {
  const result = validateFeatureImplementationManifests(
    [
      {
        sourcePath: 'plan.md',
        manifest: {
          ...validManifest,
          allowedImplementationSurfaces: [
            ...validManifest.allowedImplementationSurfaces,
            'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts',
          ],
        },
      },
    ],
    {
      changedFiles: ['apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts'],
      fileContentsByPath: {
        'apps/web/cypress/e2e/canvas/canvas-draft-access-posture.cy.ts': [
          "cy.request('GET', '/workspace/graph/draft');",
          "cy.request('PUT', '/workspace/session', { active: true });",
        ].join('\n'),
      },
    }
  );

  assert.deepEqual(result.errors, []);
});

test('FeatureMechanizationGitDiffReader includes untracked files in implementation diffs', () => {
  const reader = new FeatureMechanizationGitDiffReader({
    baseRef: 'origin/main',
    repoRootPath: process.cwd(),
  });
  const readGitCalls = [];

  reader.readGitLines = (args) => {
    readGitCalls.push(args.join(' '));

    if (args[0] === 'diff') {
      return ['apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts'];
    }

    if (args[0] === 'ls-files') {
      return ['apps/web/src/app/views/canvas/newCanvasRail.ts'];
    }

    return [];
  };

  const changedFiles = reader.readChangedFiles();

  assert.deepEqual(changedFiles, [
    'apps/web/src/app/views/canvas/canvasFirstAuthoringLiveProof.ts',
    'apps/web/src/app/views/canvas/newCanvasRail.ts',
  ]);
  assert.equal(
    readGitCalls.some((call) => call.startsWith('ls-files --others')),
    true
  );
});

test('FeatureMechanizationGitDiffReader avoids two-dot base diffs that include unrelated branch drift', () => {
  const reader = new FeatureMechanizationGitDiffReader({
    baseRef: 'origin/main',
    repoRootPath: process.cwd(),
  });
  const runGitCalls = [];

  reader.runGit = (args) => {
    runGitCalls.push(args.join(' '));
    return '';
  };

  reader.read();

  assert.ok(runGitCalls.includes('diff --name-only --diff-filter=ACMRD origin/main...HEAD'));
  assert.ok(runGitCalls.includes('diff --cached --name-only --diff-filter=ACMRD'));
  assert.ok(runGitCalls.includes('diff --name-only --diff-filter=ACMRD'));
  assert.ok(
    runGitCalls.includes('diff --unified=0 --no-ext-diff --diff-filter=ACMRD origin/main...HEAD')
  );
  assert.ok(runGitCalls.includes('diff --cached --unified=0 --no-ext-diff --diff-filter=ACMRD'));
  assert.ok(runGitCalls.includes('diff --unified=0 --no-ext-diff --diff-filter=ACMRD'));
  assert.ok(!runGitCalls.includes('diff --name-only --diff-filter=ACMRD origin/main'));
  assert.ok(
    !runGitCalls.includes('diff --unified=0 --no-ext-diff --diff-filter=ACMRD origin/main')
  );
});

test('FeatureMechanizationGitDiffReader treats untracked file contents as added lines', () => {
  const repoRootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-feature-mechanization-'));
  const relativePath = 'apps/web/src/app/views/canvas/newCanvasRail.ts';
  const absolutePath = path.join(repoRootPath, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(
    absolutePath,
    [
      '/** Owned concern: validate untracked feature symbols. */',
      'export function createNewCanvasRail() {',
      "  return 'canvas';",
      '}',
    ].join('\n')
  );

  try {
    const reader = new FeatureMechanizationGitDiffReader({
      baseRef: 'origin/main',
      repoRootPath,
    });
    reader.readGitLines = (args) => {
      if (args[0] === 'ls-files') {
        return [relativePath];
      }

      return [];
    };

    const diff = reader.read();

    assert.deepEqual(diff.changedFiles, [relativePath]);
    assert.ok(
      diff.addedLinesByPath[relativePath].includes('export function createNewCanvasRail() {')
    );
  } finally {
    fs.rmSync(repoRootPath, { recursive: true, force: true });
  }
});

test('FeatureMechanizationGitDiffReader reports tracked deletions explicitly', () => {
  const repoRootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-feature-mechanization-'));
  const deletedPath = 'apps/api/src/retiredCatalog.ts';
  const retainedPath = 'apps/api/src/server.ts';

  try {
    fs.mkdirSync(path.join(repoRootPath, 'apps/api/src'), { recursive: true });
    fs.writeFileSync(path.join(repoRootPath, retainedPath), 'export {};\n');
    const reader = new FeatureMechanizationGitDiffReader({
      baseRef: 'origin/main',
      repoRootPath,
    });
    reader.readGitLines = (args) => {
      if (args[0] === 'diff' && args.includes('--name-only')) {
        return [deletedPath];
      }

      if (args[0] === 'ls-files' && args.includes('--cached')) {
        return [deletedPath, retainedPath];
      }

      return [];
    };
    reader.runGit = () => '';

    const diff = reader.read();

    assert.deepEqual(diff.changedFiles, [deletedPath]);
    assert.deepEqual(diff.currentFiles, [retainedPath]);
    assert.deepEqual(diff.deletedFiles, [deletedPath]);
  } finally {
    fs.rmSync(repoRootPath, { recursive: true, force: true });
  }
});
