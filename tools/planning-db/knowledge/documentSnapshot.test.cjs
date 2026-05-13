const test = require('node:test');
const assert = require('node:assert/strict');

const { buildKnowledgeSnapshotFromDocuments } = require('./documentSnapshot.cjs');

test('extracts mandatory proposal documents, sections, required actions, and task links', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments([
    {
      sourcePath: 'docs/planning/proposals/mandatory/runtime-and-contracts/example-plan.md',
      raw: [
        '---',
        'title: Example Plan',
        'status: Review',
        'owner: Runtime',
        'planning_type: proposal',
        '---',
        '',
        '# Example Plan',
        '',
        '## Action Items',
        '',
        '- [ ] Implement the DB rail. Task: AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE',
        '',
      ].join('\n'),
      contentSha256: 'a'.repeat(64),
    },
  ]);

  assert.equal(snapshot.documents.length, 1);
  assert.equal(snapshot.documents[0].documentType, 'proposal');
  assert.equal(snapshot.documents[0].mandatory, true);
  assert.equal(snapshot.sections[0].heading, 'Example Plan');
  assert.equal(snapshot.proposals[0].proposalStatus, 'Review');
  assert.equal(snapshot.actions.length, 1);
  assert.equal(snapshot.actions[0].required, true);
  assert.equal(snapshot.actionLinks[0].targetType, 'task');
  assert.equal(snapshot.actionLinks[0].targetId, 'AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE');
});

test('classifies Fowler analysis and review documents without making them tasks', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments([
    {
      sourcePath: 'buzon/20260513-codex-fowler-example-analysis.md',
      raw: '# Fowler Example\n\n## Finding\n\n- Hidden Authority in runtime ownership.',
      contentSha256: 'b'.repeat(64),
    },
    {
      sourcePath: 'docs/planning/reviews/architecture-and-governance/example-review.md',
      raw: '---\ntitle: Example Review\nplanning_type: review\n---\n# Example Review\n',
      contentSha256: 'c'.repeat(64),
    },
  ]);

  assert.deepEqual(
    snapshot.documents.map((document) => document.documentType),
    ['fowler_analysis', 'review']
  );
  assert.equal(
    snapshot.documents.every((document) => document.documentType !== 'task'),
    true
  );
});

test('extracts governed document references as document links', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments([
    {
      sourcePath: 'docs/planning/reviews/example-review.md',
      raw: [
        '---',
        'title: Example Review',
        'planning_type: review',
        '---',
        '# Example Review',
        '',
        'See [proposal](../proposals/mandatory/example-plan.md).',
      ].join('\n'),
      contentSha256: 'd'.repeat(64),
    },
    {
      sourcePath: 'docs/planning/proposals/mandatory/example-plan.md',
      raw: '---\ntitle: Example Plan\nplanning_type: proposal\n---\n# Example Plan\n',
      contentSha256: 'e'.repeat(64),
    },
  ]);

  assert.deepEqual(snapshot.documentLinks, [
    {
      fromDocumentId: 'docs-planning-reviews-example-review-md',
      toDocumentId: 'docs-planning-proposals-mandatory-example-plan-md',
      relationType: 'references',
    },
  ]);
});
