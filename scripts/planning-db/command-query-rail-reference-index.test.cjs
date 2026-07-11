const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCommandQueryRailReferenceIndexComponent,
} = require('./command-query-rail-reference-index.cjs');

const referenceIndex = createCommandQueryRailReferenceIndexComponent();

test('implementation references exclude governance migrations and executable test evidence', () => {
  const sourceFiles = [
    {
      path: 'tools/planning-db/migrations/226_reconcile_remaining_frontend_gap_rails.sql',
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
