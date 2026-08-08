const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCommandQueryRailReferenceIndexComponent,
} = require('./command-query-rail-reference-index.cjs');

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
