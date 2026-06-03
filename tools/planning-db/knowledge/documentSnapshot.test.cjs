const test = require('node:test');
const assert = require('node:assert/strict');

const { buildKnowledgeSnapshotFromDocuments } = require('./documentSnapshot.cjs');

test('extracts mandatory proposal documents, sections, required actions, and task links', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments(
    [
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
    ],
    { planningTaskIds: ['AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE'] }
  );

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

test('keeps governance reference ids out of task links', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments(
    [
      {
        sourcePath: 'docs/planning/proposals/mandatory/runtime-and-contracts/reference-plan.md',
        raw: [
          '---',
          'title: Reference Plan',
          'planning_type: proposal',
          '---',
          '# Reference Plan',
          '',
          '- [ ] Add coverage for ADR-0055 and ARC-2 in task AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE.',
        ].join('\n'),
        contentSha256: 'f'.repeat(64),
      },
    ],
    { planningTaskIds: ['AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE'] }
  );

  assert.deepEqual(
    snapshot.actionLinks.map((link) => link.targetId),
    ['AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE']
  );
});

test('links short-prefix planning task ids from proposal action lines', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments(
    [
      {
        sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/f17c-plan.md',
        raw: [
          '---',
          'title: F17C Plan',
          'planning_type: proposal',
          '---',
          '# F17C Plan',
          '',
          '- F-17-C task records this implemented proposal as evidence-closed.',
          '- F-21 task records the execution template closeout.',
          '',
        ].join('\n'),
        contentSha256: '1'.repeat(64),
      },
    ],
    { planningTaskIds: ['F-17-C', 'F-21'] }
  );

  assert.deepEqual(
    snapshot.actionLinks.map((link) => link.targetId),
    ['F-17-C', 'F-21']
  );
});

test('ignores declarative UX rules that only mention action nouns', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments([
    {
      sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/declarative-ux-plan.md',
      raw: [
        '---',
        'title: Declarative UX Plan',
        'planning_type: proposal',
        '---',
        '# Declarative UX Plan',
        '',
        '- Hiding the guide must not disable node creation, toolbar Insert/Add, draft save, or keyboard insertion.',
        '- Add palette opens as a command palette or modal-less overlay.',
        '- Add palette only shows node types valid for the active workbench.',
        '- Add palette, View strip, Runtime panel, Inspector, and Admin navigation are shell-owned.',
        '- Run remains the only permanent primary action.',
        '- Scope selection remains reachable from the shell.',
        '- docs/planning/state/open-task-route.md',
      ].join('\n'),
      contentSha256: '2'.repeat(64),
    },
  ]);

  assert.equal(snapshot.actions.length, 0);
});

test('keeps explicit unowned action lines as planning intake', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments([
    {
      sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/action-plan.md',
      raw: [
        '---',
        'title: Action Plan',
        'planning_type: proposal',
        '---',
        '# Action Plan',
        '',
        '- Add the protected `ListWorkspacePlugins` query rail.',
        '- Action: classify this mandatory proposal through `E-PROP-DISP-1`.',
      ].join('\n'),
      contentSha256: '3'.repeat(64),
    },
  ]);

  assert.deepEqual(
    snapshot.actions.map((action) => action.summary),
    [
      'Add the protected `ListWorkspacePlugins` query rail.',
      'Action: classify this mandatory proposal through `E-PROP-DISP-1`.',
    ]
  );
});

test('ignores stale task references and action section headings', () => {
  const snapshot = buildKnowledgeSnapshotFromDocuments(
    [
      {
        sourcePath: 'docs/planning/proposals/mandatory/frontend-and-ux/legacy-f29-plan.md',
        raw: [
          '---',
          'title: Legacy F29 Plan',
          'planning_type: proposal',
          '---',
          '# Legacy F29 Plan',
          '',
          '- [Task: F-29] Add Canvas workbench tab route state model.',
          '- [Task: E-PROP-DISP-1] Add Canvas workbench tab read model.',
          '- Modify:',
          '- Modify if required:',
          '- Create:',
          '- Update route tests and shell chrome tests to assert the new navigation shape.',
        ].join('\n'),
        contentSha256: '4'.repeat(64),
      },
    ],
    { planningTaskIds: ['E-PROP-DISP-1'] }
  );

  assert.deepEqual(
    snapshot.actions.map((action) => action.summary),
    [
      '[Task: E-PROP-DISP-1] Add Canvas workbench tab read model.',
      'Update route tests and shell chrome tests to assert the new navigation shape.',
    ]
  );
  assert.deepEqual(snapshot.actionLinks, [
    {
      actionId: 'docs-planning-proposals-mandatory-frontend-and-ux-legacy-f29-plan-md::A1',
      targetType: 'task',
      targetId: 'E-PROP-DISP-1',
      relationType: 'implements',
    },
  ]);
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
