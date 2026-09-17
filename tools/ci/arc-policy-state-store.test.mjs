/**
 * Owned concern: prove executable ARC routing and its single contributor decision path.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import yaml from 'js-yaml';

const policy = yaml.load(readFileSync('.arc-policy.yaml', 'utf8'));

test('ARC policy governs the canonical state-store package path', () => {
  const stateStoreTrigger = policy.triggers.find((trigger) => trigger.name === 'state-store');

  assert.ok(stateStoreTrigger, 'expected a state-store ARC trigger');
  assert.deepEqual(stateStoreTrigger.globs, ['packages/@dvt/state-store/**']);
  assert.equal(stateStoreTrigger.min_arc_level, 'ARC-2');
  assert.equal(stateStoreTrigger.require.evidence_doc, true);
  assert.equal(stateStoreTrigger.require.risk_update, true);
});

test('ARC policy does not retain the legacy state package glob', () => {
  const allGlobs = policy.triggers.flatMap((trigger) => trigger.globs || []);

  assert.ok(!allGlobs.includes('packages/@dvt/state/**'));
});

const repoRoot = process.cwd();
const routingCases = [
  ['app typing', ['apps/web/src/typing.ts'], 'ARC-0'],
  ['tool test', ['tools/ci/isolated.test.mjs'], 'ARC-0'],
  ['script wording', ['scripts/example.cjs'], 'ARC-0'],
  ['documentation wording', ['docs/guides/example.md'], 'ARC-0'],
  ['public contract', ['packages/@dvt/contracts/src/example.ts'], 'ARC-2'],
  ['contract specification', ['specs/contracts/example.json'], 'ARC-2'],
  ['engine', ['packages/@dvt/engine/src/example.ts'], 'ARC-2'],
  ['planner', ['packages/@dvt/planner/src/example.ts'], 'ARC-2'],
  ['state-store', ['packages/@dvt/state-store/src/example.ts'], 'ARC-2'],
  ['PostgreSQL adapter', ['packages/@dvt/adapter-postgres/src/example.ts'], 'ARC-2'],
  ['Temporal adapter', ['packages/@dvt/adapter-temporal/src/example.ts'], 'ARC-2'],
  ['security configuration', ['security/example.yaml'], 'ARC-3'],
  ['security documentation', ['docs/security/example.md'], 'ARC-3'],
  ['mixed contract diff', ['docs/guides/example.md', 'specs/contracts/example.json'], 'ARC-2'],
  ['mixed security diff', ['specs/contracts/example.json', 'security/example.yaml'], 'ARC-3'],
];

function evaluateFixture(t, changedPaths) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'dvt-arc-routing-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'ARC policy fixture',
    GIT_AUTHOR_EMAIL: 'arc-fixture@example.invalid',
    GIT_COMMITTER_NAME: 'ARC policy fixture',
    GIT_COMMITTER_EMAIL: 'arc-fixture@example.invalid',
  };
  const git = (...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  git('init', '--quiet');
  // Synthetic Git objects model only the tested diff, not repository delivery commits.
  const base = git('commit-tree', git('write-tree'), '-m', 'Fixture base');
  for (const relativePath of changedPaths) {
    const absolutePath = path.join(cwd, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, 'ARC routing fixture\n');
    git('add', '--', relativePath);
  }
  const head = git('commit-tree', git('write-tree'), '-p', base, '-m', 'Fixture change');
  const stdout = execFileSync(process.execPath, [path.join(repoRoot, 'tools/ci/arc-check.mjs')], {
    cwd,
    encoding: 'utf8',
    env: {
      ...env,
      ARC_POLICY: path.join(repoRoot, '.arc-policy.yaml'),
      GIT_BASE: base,
      GIT_HEAD: head,
      DECLARED_ARC_LEVEL: 'ARC-0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout);
}

for (const [name, changedPaths, expectedLevel] of routingCases) {
  test(`ARC evaluator classifies ${name} without allowing a declared downgrade`, (t) => {
    const actual = evaluateFixture(t, changedPaths);
    assert.equal(actual.declaredArcLevel, 'ARC-0');
    assert.equal(actual.effectiveArcLevel, expectedLevel);
    assert.deepEqual(actual.reasons.changedFiles, [...changedPaths].sort());
    assert.deepEqual(actual.requiredChecks, policy.checks[expectedLevel]);
    assert.deepEqual(actual.requirements, {
      evidenceDoc: expectedLevel !== 'ARC-0',
      riskUpdate: expectedLevel !== 'ARC-0',
      rolloutNotes: expectedLevel === 'ARC-3',
      compatMatrix: expectedLevel === 'ARC-3',
    });
  });
}

test('ARC contributor guidance has one evaluator-backed decision path', () => {
  const agents = readFileSync('AGENTS.md', 'utf8');
  const section = agents.split('## ARC-0 Fast Path\n')[1]?.split('\n## ')[0];
  assert.ok(section, 'expected the single ARC-0 decision section');
  assert.equal(agents.match(/^## ARC-0 Fast Path$/gm)?.length, 1);
  assert.equal(agents.match(/^## ARC Artifacts When Required$/gm)?.length, 1);
  assert.doesNotMatch(
    agents,
    /^## ARC (Policy Rule|Requirements For Contracts And Adapter Changes)$/m
  );
  assert.ok(section.includes('GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs'));
  const example = section.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(example, 'expected an explicit, parseable evaluator result');
  assert.deepEqual(JSON.parse(example[1]), {
    effectiveArcLevel: 'ARC-0',
    requirements: {
      evidenceDoc: false,
      riskUpdate: false,
      rolloutNotes: false,
      compatMatrix: false,
    },
  });
  for (const requiredText of [
    'pnpm verify:prepush',
    'enabled hooks',
    'typecheck/build',
    'cannot lower the policy result',
    'Missing or failed evaluation is not ARC-0',
  ]) {
    assert.ok(
      section.includes(requiredText),
      `missing validation or negative boundary: ${requiredText}`
    );
  }
  const protocol = readFileSync('docs/guides/ai-work-protocol.md', 'utf8');
  assert.ok(protocol.includes('../../AGENTS.md#arc-0-fast-path'));
  assert.ok(protocol.includes('../../AGENTS.md#arc-artifacts-when-required'));
  assert.doesNotMatch(protocol, /effectiveArcLevel|## ARC-0 Fast Path/);
});
