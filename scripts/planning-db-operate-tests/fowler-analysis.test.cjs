const test = require('node:test');
const {
  assert,
  parseArgs,
  planFowlerAnalysisOperation,
  writePlannedFowlerAnalysisOperation,
} = require('./helpers.cjs');

function baseArgs(action) {
  return [
    'fowler-analysis',
    action,
    '--path',
    'buzon/20260515-codex-fowler-we-hx-3-hardcut-analysis.md',
    '--actor',
    'codex',
    '--reason',
    'Canonical authority now lives in the Planning DB.',
    '--source-content-sha256',
    'a'.repeat(64),
  ];
}

test('parseArgs builds Fowler analysis DB-first command rails', () => {
  const disposition = parseArgs([
    ...baseArgs('record-disposition'),
    '--status',
    'accepted',
    '--kind',
    'canonicalized',
    '--target',
    'docs/architecture/fowler-opportunity-planning-governance.md',
  ]);

  assert.equal(disposition.kind, 'fowler_analysis_disposition_record');
  assert.equal(disposition.documentPath, 'buzon/20260515-codex-fowler-we-hx-3-hardcut-analysis.md');
  assert.equal(disposition.dispositionStatus, 'accepted');
  assert.equal(disposition.dispositionKind, 'canonicalized');
  assert.equal(
    disposition.canonicalTargetPath,
    'docs/architecture/fowler-opportunity-planning-governance.md'
  );

  const target = parseArgs([
    ...baseArgs('link-canonical-target'),
    '--target',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    '--status',
    'accepted',
    '--target-kind',
    'architecture_policy',
  ]);

  assert.equal(target.kind, 'fowler_analysis_canonical_target_link');
  assert.equal(target.targetStatus, 'accepted');
  assert.equal(target.targetKind, 'architecture_policy');

  const reference = parseArgs([
    ...baseArgs('resolve-reference'),
    '--reference',
    'docs/planning/proposals/mandatory/governance-and-docs/example.md',
    '--relation',
    'mentions',
    '--resolution',
    'replaced',
    '--target',
    'docs/architecture/fowler-opportunity-planning-governance.md',
  ]);

  assert.equal(reference.kind, 'fowler_analysis_reference_resolve');
  assert.equal(
    reference.referencePath,
    'docs/planning/proposals/mandatory/governance-and-docs/example.md'
  );
  assert.equal(reference.relationType, 'mentions');
  assert.equal(reference.resolutionStatus, 'replaced');

  const retirement = parseArgs([...baseArgs('approve-retirement'), '--decision', 'approved']);

  assert.equal(retirement.kind, 'fowler_analysis_retirement_approve');
  assert.equal(retirement.decisionStatus, 'approved');
});

test('parseArgs rejects Fowler analysis commands without required relational selectors', () => {
  assert.throws(
    () =>
      parseArgs([
        'fowler-analysis',
        'link-canonical-target',
        '--path',
        'buzon/example-fowler.md',
        '--actor',
        'codex',
        '--reason',
        'Missing target.',
        '--source-content-sha256',
        'b'.repeat(64),
      ]),
    /Missing required --target/
  );

  assert.throws(
    () =>
      parseArgs([
        'fowler-analysis',
        'resolve-reference',
        '--path',
        'buzon/example-fowler.md',
        '--actor',
        'codex',
        '--reason',
        'Missing reference.',
        '--source-content-sha256',
        'b'.repeat(64),
        '--relation',
        'mentions',
      ]),
    /Missing required --reference/
  );

  assert.throws(
    () => parseArgs([...baseArgs('record-disposition'), '--status', 'maybe']),
    /Invalid Fowler analysis disposition status/
  );
});

test('Fowler analysis planner emits disposition, target, reference and retirement facts', () => {
  const now = new Date('2026-06-10T09:00:00.000Z');
  const disposition = planFowlerAnalysisOperation({
    command: parseArgs([
      ...baseArgs('record-disposition'),
      '--target',
      'docs/architecture/fowler-opportunity-planning-governance.md',
    ]),
    operationId: 'op-fowler-disposition',
    now,
  });

  assert.equal(
    disposition.disposition.documentPath,
    'buzon/20260515-codex-fowler-we-hx-3-hardcut-analysis.md'
  );
  assert.equal(disposition.disposition.dispositionStatus, 'accepted');
  assert.equal(disposition.audit.operationType, 'fowler_analysis_disposition_record');
  assert.equal(
    disposition.audit.targetPath,
    'docs/architecture/fowler-opportunity-planning-governance.md'
  );

  const target = planFowlerAnalysisOperation({
    command: parseArgs([
      ...baseArgs('link-canonical-target'),
      '--target',
      'docs/architecture/fowler-opportunity-planning-governance.md',
    ]),
    operationId: 'op-fowler-target',
    now,
  });

  assert.equal(
    target.target.targetPath,
    'docs/architecture/fowler-opportunity-planning-governance.md'
  );
  assert.equal(target.target.targetStatus, 'accepted');
  assert.equal(target.audit.operationType, 'fowler_analysis_canonical_target_link');

  const reference = planFowlerAnalysisOperation({
    command: parseArgs([
      ...baseArgs('resolve-reference'),
      '--reference',
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
      '--relation',
      'mentions',
      '--resolution',
      'resolved',
    ]),
    operationId: 'op-fowler-reference',
    now,
  });

  assert.equal(
    reference.referenceResolution.referencePath,
    'docs/planning/proposals/mandatory/governance-and-docs/example.md'
  );
  assert.equal(reference.referenceResolution.resolutionStatus, 'resolved');
  assert.equal(reference.audit.operationType, 'fowler_analysis_reference_resolve');

  const retirement = planFowlerAnalysisOperation({
    command: parseArgs([...baseArgs('approve-retirement')]),
    operationId: 'op-fowler-retirement',
    now,
  });

  assert.equal(retirement.retirementDecision.decisionStatus, 'approved');
  assert.equal(retirement.audit.operationType, 'fowler_analysis_retirement_approve');
});

test('writePlannedFowlerAnalysisOperation persists facts and audit rows', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };
  const planned = planFowlerAnalysisOperation({
    command: parseArgs([
      ...baseArgs('resolve-reference'),
      '--reference',
      'docs/planning/proposals/mandatory/governance-and-docs/example.md',
      '--relation',
      'mentions',
      '--resolution',
      'replaced',
      '--target',
      'docs/architecture/fowler-opportunity-planning-governance.md',
    ]),
    operationId: 'op-fowler-reference',
    now: new Date('2026-06-10T09:00:00.000Z'),
  });

  await writePlannedFowlerAnalysisOperation(client, planned);

  assert.match(
    queries[0].sql,
    /insert into planning_query_store\.fowler_analysis_reference_resolutions/
  );
  assert.match(queries[1].sql, /insert into planning_query_store\.fowler_analysis_operations/);
  assert.equal(queries[0].params[0], 'buzon/20260515-codex-fowler-we-hx-3-hardcut-analysis.md');
  assert.equal(
    queries[0].params[1],
    'docs/planning/proposals/mandatory/governance-and-docs/example.md'
  );
  assert.equal(queries[0].params[3], 'replaced');
  assert.equal(queries[1].params[2], 'fowler_analysis_reference_resolve');
});
