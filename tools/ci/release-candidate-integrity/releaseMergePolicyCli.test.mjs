import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReleaseMergePolicyUpdate,
  parseReleaseMergePolicyArguments,
  projectReleaseMergePolicy,
  runReleaseMergePolicyCli,
} from './releaseMergePolicyCli.mjs';

const repository = {
  default_branch: 'main',
  allow_merge_commit: true,
  allow_rebase_merge: true,
  allow_squash_merge: true,
  squash_merge_commit_title: 'COMMIT_OR_PR_TITLE',
  squash_merge_commit_message: 'COMMIT_MESSAGES',
};

const ruleset = {
  id: 17240734,
  name: 'protect main',
  target: 'branch',
  enforcement: 'active',
  bypass_actors: [],
  conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
  rules: [
    { type: 'deletion' },
    {
      type: 'pull_request',
      parameters: {
        required_approving_review_count: 0,
        dismiss_stale_reviews_on_push: false,
        required_reviewers: [],
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_review_thread_resolution: false,
        allowed_merge_methods: ['merge', 'rebase'],
      },
    },
    { type: 'code_quality', parameters: { severity: 'all' } },
  ],
};

test('policy projection maps GitHub API fields to the domain vocabulary', () => {
  assert.deepEqual(projectReleaseMergePolicy(repository, ruleset), {
    repository: {
      defaultBranch: 'main',
      allowMergeCommit: true,
      allowRebaseMerge: true,
      allowSquashMerge: true,
      squashMergeCommitTitle: 'COMMIT_OR_PR_TITLE',
      squashMergeCommitMessage: 'COMMIT_MESSAGES',
    },
    mainRuleset: {
      target: 'branch',
      enforcement: 'active',
      bypassActors: [],
      conditions: { refName: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
      allowedMergeMethods: ['merge', 'rebase'],
      strictRequiredStatusChecksPolicy: false,
      requiredStatusChecks: [],
    },
  });
});

test('policy projection fails closed when GitHub hides bypass actors', () => {
  const rulesetWithoutBypassVisibility = structuredClone(ruleset);
  delete rulesetWithoutBypassVisibility.bypass_actors;

  assert.throws(
    () => projectReleaseMergePolicy(repository, rulesetWithoutBypassVisibility),
    /does not expose bypass actors/u
  );
});

test('policy update preserves unrelated rules and requires the candidate check', () => {
  const update = buildReleaseMergePolicyUpdate(repository, ruleset);
  const pullRequestRule = update.ruleset.rules.find((rule) => rule.type === 'pull_request');
  const requiredChecksRule = update.ruleset.rules.find(
    (rule) => rule.type === 'required_status_checks'
  );

  assert.deepEqual(update.repository, {
    allow_merge_commit: false,
    allow_rebase_merge: false,
    allow_squash_merge: true,
    squash_merge_commit_title: 'PR_TITLE',
    squash_merge_commit_message: 'BLANK',
  });
  assert.deepEqual(pullRequestRule.parameters.allowed_merge_methods, ['squash']);
  assert.deepEqual(requiredChecksRule.parameters.required_status_checks, [
    { context: 'All Checks Required for Merge', integration_id: 15368 },
    { context: 'Release candidate integrity', integration_id: 15368 },
  ]);
  assert.equal(update.ruleset.target, 'branch');
  assert.equal(update.ruleset.enforcement, 'active');
  assert.deepEqual(update.ruleset.bypass_actors, []);
  assert.deepEqual(update.ruleset.conditions, {
    ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] },
  });
  assert.equal(
    update.ruleset.rules.some((rule) => rule.type === 'deletion'),
    true
  );
  assert.equal(
    update.ruleset.rules.some((rule) => rule.type === 'code_quality'),
    true
  );
});

test('policy update is idempotent and does not duplicate an existing required check', () => {
  const first = buildReleaseMergePolicyUpdate(repository, ruleset);
  const projectedRepository = { ...repository, ...first.repository };
  const projectedRuleset = { ...ruleset, ...first.ruleset };
  const second = buildReleaseMergePolicyUpdate(projectedRepository, projectedRuleset);
  const checks = second.ruleset.rules.find((rule) => rule.type === 'required_status_checks')
    .parameters.required_status_checks;

  assert.equal(checks.filter((check) => check.context === 'Release candidate integrity').length, 1);
});

test('policy CLI arguments fail closed on unknown or duplicate values', () => {
  assert.deepEqual(
    parseReleaseMergePolicyArguments([
      'inspect',
      '--repo',
      'dunay2/dvt',
      '--ruleset',
      'protect main',
    ]),
    { command: 'inspect', repository: 'dunay2/dvt', rulesetName: 'protect main' }
  );
  assert.throws(
    () => parseReleaseMergePolicyArguments(['configure', '--repo', 'dunay2/dvt']),
    /--repo and --ruleset/u
  );
  assert.throws(
    () =>
      parseReleaseMergePolicyArguments([
        'inspect',
        '--repo',
        'dunay2/dvt',
        '--ruleset',
        'protect main',
        '--extra',
        'x',
      ]),
    /Unknown release merge policy argument/u
  );
});

test('configure command patches settings, updates the named ruleset and re-verifies policy', () => {
  const calls = [];
  let currentRepository = structuredClone(repository);
  let currentRuleset = structuredClone(ruleset);
  const request = ({ method, path, body }) => {
    calls.push({ method, path, body });
    if (method === 'GET' && path === 'repos/dunay2/dvt') return currentRepository;
    if (method === 'GET' && path === 'repos/dunay2/dvt/rulesets') {
      return [{ id: currentRuleset.id, name: currentRuleset.name }];
    }
    if (method === 'GET' && path.endsWith(`/rulesets/${currentRuleset.id}`)) {
      return currentRuleset;
    }
    if (method === 'PATCH' && path === 'repos/dunay2/dvt') {
      currentRepository = { ...currentRepository, ...body };
      return currentRepository;
    }
    if (method === 'PUT' && path.endsWith(`/rulesets/${currentRuleset.id}`)) {
      currentRuleset = { ...currentRuleset, ...body };
      return currentRuleset;
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  };
  const output = [];

  const exitCode = runReleaseMergePolicyCli(
    ['configure', '--repo', 'dunay2/dvt', '--ruleset', 'protect main'],
    { request, write: (value) => output.push(value) }
  );

  assert.equal(exitCode, 0);
  assert.equal(
    calls.some((call) => call.method === 'PATCH'),
    true
  );
  assert.equal(
    calls.some((call) => call.method === 'PUT'),
    true
  );
  assert.equal(JSON.parse(output.at(-1)).valid, true);
});

test('configure command rejects concurrent ruleset drift before mutation', () => {
  let rulesetReads = 0;
  const calls = [];
  const request = ({ method, path, body }) => {
    calls.push({ method, path, body });
    if (method === 'GET' && path === 'repos/dunay2/dvt') return repository;
    if (method === 'GET' && path === 'repos/dunay2/dvt/rulesets') {
      return [{ id: ruleset.id, name: ruleset.name }];
    }
    if (method === 'GET' && path.endsWith(`/rulesets/${ruleset.id}`)) {
      rulesetReads += 1;
      return rulesetReads === 1
        ? ruleset
        : { ...ruleset, enforcement: 'disabled', updated_at: 'concurrent' };
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  };

  assert.throws(
    () =>
      runReleaseMergePolicyCli(['configure', '--repo', 'dunay2/dvt', '--ruleset', 'protect main'], {
        request,
        write: () => undefined,
      }),
    /changed concurrently/u
  );
  assert.equal(
    calls.some((call) => ['PATCH', 'PUT'].includes(call.method)),
    false
  );
});
