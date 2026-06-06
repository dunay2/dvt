const test = require('node:test');
const { assert, runPlanningDbOperateCli } = require('./helpers.cjs');

test('planning DB operate CLI prints root help without opening a DB connection', () => {
  const result = runPlanningDbOperateCli(['--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB operate CLI/);
  assert.match(result.stdout, /Resources:/);
  assert.match(result.stdout, /component/);
  assert.doesNotMatch(result.stderr, /Unknown planning DB operation|Missing value/);
});

test('planning DB operate CLI prints action help before parsing flag values', () => {
  const result = runPlanningDbOperateCli(['component', 'create', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB operate: component create/);
  assert.match(result.stdout, /pnpm planning:db:operate component create/);
  assert.match(result.stdout, /CreateGovernanceComponent/);
  assert.doesNotMatch(result.stderr, /Missing value for --help/);
});

test('planning DB operate CLI prints audit help after filtered resource flags', () => {
  const result = runPlanningDbOperateCli(['audit', '--limit', '1', '--help']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Planning DB operate resource: audit/);
  assert.match(result.stdout, /pnpm planning:db:operate audit \[--lane <lane>\]/);
  assert.doesNotMatch(result.stderr, /Unknown audit operation|Missing value/);
});
