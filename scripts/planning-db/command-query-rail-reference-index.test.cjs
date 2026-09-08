const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCommandQueryRailCatalogComponent,
} = require('./command-query-rail-catalog.cjs');
const {
  createCommandQueryRailReferenceIndexComponent,
} = require('./command-query-rail-reference-index.cjs');

const catalog = createCommandQueryRailCatalogComponent();
const referenceIndex = createCommandQueryRailReferenceIndexComponent();

test('implementation references exclude declarative schema and executable test evidence', () => {
  const sourceFiles = [
    {
      path: 'tools/planning-db/schema.sql',
      content: "select 'ImportDbtProject';",
    },
    {
      path: 'scripts/planning-db-import.test.cjs',
      content: "test('ImportDbtProject catalog state', () => {});",
    },
    {
      path: 'apps/web/cypress/e2e/canvas/dbt-project-import.cy.ts',
      content: "cy.contains('ImportDbtProject');",
    },
    {
      path: 'apps/api/src/application/services/importDbtProjectUseCase.ts',
      content: 'export class ImportDbtProjectUseCase {}',
    },
  ];

  assert.deepEqual(
    referenceIndex.collectSourceImplementationRefs('ImportDbtProject', sourceFiles),
    [
      {
        name: 'ImportDbtProject',
        path: 'apps/api/src/application/services/importDbtProjectUseCase.ts',
        sourceKind: 'source_code',
      },
    ]
  );
});

test('explicitly unimplemented rails do not infer implementation from evidence generators', () => {
  const rail = referenceIndex.attachCommandQueryRailRefs(
    {
      railName: 'ExportDbtProject',
      railStatus: 'not-implemented',
      symbolRefs: [],
      documentationRefs: [],
      sourcePath:
        'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    },
    {
      sourceFiles: [
        {
          path: 'scripts/generate-dbt-project-roundtrip-capability-status.cjs',
          content: "const requiredRails = ['ExportDbtProject'];",
        },
      ],
      governanceSnapshot: { files: [], components: [] },
      referenceDocuments: [],
    }
  );

  assert.deepEqual(rail.implementationRefs, []);
  assert.equal(rail.implementationRefCount, 0);
  assert.equal(rail.isGap, true);
});

test('feature plan rail tables do not become second documented rail authorities', () => {
  const featurePlans = ['GH-2920', 'GH-2935', 'VTX2-2936'].map((featureId) => ({
    path: `docs/planning/proposals/mandatory/frontend-and-ux/${featureId.toLowerCase()}.md`,
    content: [
      '## Command rail',
      '',
      '| Rail | Type | Bounded context | DDD object |',
      '| --- | --- | --- | --- |',
      '| `ConfigureCanvasDvtNode` | command | Canvas semantic authoring | `DvtSubstraitAuthoringSidecarV1` |',
      '',
      '```feature-mechanization',
      'version: 1',
      `featureId: ${featureId}`,
      'mechanizationStatus: implemented',
      'commandQueryRails:',
      '  - name: ConfigureCanvasDvtNode',
      '    type: command',
      '    status: implemented',
      '    dddOwner: DvtSubstraitAuthoringSidecarV1',
      'symbols: []',
      '```',
    ].join('\n'),
  }));
  const canonicalCatalog = {
    path: 'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
    content: [
      '| Rail | Type | Status | DDD owner |',
      '| --- | --- | --- | --- |',
      '| `ConfigureCanvasDvtNode` | command | accepted | `DvtNodeAuthoringMetadata` |',
    ].join('\n'),
  };

  const snapshot = catalog.buildCommandQueryRailSnapshot({
    docs: featurePlans,
    referenceDocuments: [...featurePlans, canonicalCatalog],
    sourceFiles: [],
  });
  const rows = snapshot.rails.filter(
    (rail) => rail.railName === 'ConfigureCanvasDvtNode'
  );
  const featureUsageRows = rows.filter(
    (rail) => rail.featureId !== 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG'
  );
  const documentedAuthorityRows = rows.filter(
    (rail) => rail.featureId === 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG'
  );

  assert.equal(featureUsageRows.length, 3);
  assert.ok(
    featureUsageRows.every(
      (rail) => rail.dddOwner === 'DvtSubstraitAuthoringSidecarV1'
    )
  );
  assert.deepEqual(
    documentedAuthorityRows.map((rail) => ({
      sourcePath: rail.sourcePath,
      dddOwner: rail.dddOwner,
      railStatus: rail.railStatus,
    })),
    [
      {
        sourcePath:
          'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md',
        dddOwner: 'DvtNodeAuthoringMetadata',
        railStatus: 'accepted',
      },
    ]
  );
});
