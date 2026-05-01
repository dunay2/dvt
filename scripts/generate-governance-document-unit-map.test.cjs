const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDocumentEntries,
  classifyDocument,
  resolveSubjectUnit,
} = require('./generate-governance-document-unit-map.cjs');

test('classifyDocument recognizes risk and evidence documents', () => {
  assert.equal(
    classifyDocument('docs/risk-register/quality/R-20260501-TEST.yaml.md'),
    'tracks risk'
  );
  assert.equal(classifyDocument('docs/evidence/ED-20260501-test.md'), 'proves evidence');
});

test('classifyDocument recognizes active governance documents', () => {
  assert.equal(
    classifyDocument('docs/adr/ADR-0001-temporal-integration-test-policy.md'),
    'governs unit'
  );
  assert.equal(
    classifyDocument('docs/planning/proposals/mandatory/runtime-and-contracts/example.md'),
    'governs unit'
  );
  assert.equal(
    classifyDocument('docs/planning/roadmap/strategic-product-roadmap.md'),
    'governs unit'
  );
  assert.equal(classifyDocument('docs/CONTRIBUTING.md'), 'governs unit');
});

test('resolveSubjectUnit maps plan-store docs before generic postgres or contracts rules', () => {
  assert.equal(
    resolveSubjectUnit('docs/guides/postgres-plan-store-technical-manual-20260403.md'),
    'SYS-PLANSTORE'
  );
});

test('resolveSubjectUnit maps frontend and worker docs to owning system units', () => {
  assert.equal(resolveSubjectUnit('docs/guides/top-app-bar-user-manual-20260404.md'), 'SYS-WEB');
  assert.equal(resolveSubjectUnit('docs/runbooks/outbox-worker-g5.md'), 'SYS-WORKERS');
});

test('resolveSubjectUnit does not match short tokens inside unrelated words', () => {
  assert.equal(
    resolveSubjectUnit(
      'docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md'
    ),
    'SYS-TRACEABILITY'
  );
  assert.equal(resolveSubjectUnit('docs/adr/ADR-0004-event-sourcing-strategy.md'), 'SYS-RUNTIME');
});

test('buildDocumentEntries records file owner and subject unit separately', () => {
  const units = [
    {
      id: 'SYS-DOCS-GOVERNANCE-ROOT',
      owns: ['docs/**'],
    },
  ];

  assert.deepEqual(
    buildDocumentEntries(['docs/guides/postgres-plan-store-user-manual.md'], units),
    [
      {
        path: 'docs/guides/postgres-plan-store-user-manual.md',
        classification: 'describes unit',
        documentOwnerUnit: 'SYS-DOCS-GOVERNANCE-ROOT',
        subjectUnit: 'SYS-PLANSTORE',
      },
    ]
  );
});
