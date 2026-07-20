import assert from 'node:assert/strict';
import test from 'node:test';

import { assessReleaseCandidateIntegrity } from './releaseCandidateIntegrity.mjs';
import {
  collectReleaseCandidateSnapshot,
  parseReleaseCandidateArguments,
} from './releaseCandidateIntegrityCli.mjs';

const policy = {
  repository: {
    defaultBranch: 'main',
    allowMergeCommit: false,
    allowRebaseMerge: false,
    allowSquashMerge: true,
    squashMergeCommitTitle: 'PR_TITLE',
    squashMergeCommitMessage: 'BLANK',
  },
  mainRuleset: {
    target: 'branch',
    enforcement: 'active',
    bypassActors: [],
    conditions: { refName: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    allowedMergeMethods: ['squash'],
    strictRequiredStatusChecksPolicy: true,
    requiredStatusChecks: [
      { context: 'All Checks Required for Merge', integrationId: 15368 },
      { context: 'Release candidate integrity', integrationId: 15368 },
    ],
  },
};

const baseChangelog = '# Changelog\n\n## 0.4.0\n\n* Previous release';
const candidateChangelog = [
  '# Changelog',
  '',
  '## 0.5.0',
  '',
  "## What's Changed",
  '',
  '* Add release gate by @maintainer in https://github.com/dunay2/dvt/pull/2000',
  '',
  '## 0.4.0',
  '',
  '* Previous release',
].join('\n');

test('CLI argument adapter accepts one base, head, and repository identity', () => {
  assert.deepEqual(
    parseReleaseCandidateArguments([
      '--base',
      'main',
      '--head',
      'candidate',
      '--repository',
      'dunay2/dvt',
    ]),
    {
      base: 'main',
      head: 'candidate',
      repository: 'dunay2/dvt',
    }
  );
  assert.throws(
    () => parseReleaseCandidateArguments(['--base', 'main', '--head', 'candidate']),
    /--repository/u
  );
  assert.throws(
    () =>
      parseReleaseCandidateArguments([
        '--base',
        'main',
        '--head',
        'candidate',
        '--unknown',
        'value',
        '--repository',
        'dunay2/dvt',
      ]),
    /Unknown release candidate argument/u
  );
  assert.throws(
    () =>
      parseReleaseCandidateArguments([
        '--base',
        'main',
        '--base',
        'other',
        '--head',
        'candidate',
        '--repository',
        'dunay2/dvt',
      ]),
    /Duplicate release candidate argument/u
  );
});

test('CLI snapshot reads every governed artifact from the requested Git trees', () => {
  const baseSha = 'a'.repeat(40);
  const headSha = 'b'.repeat(40);
  const gitObjects = new Map([
    [
      `${headSha}:release-please-config.json`,
      JSON.stringify({
        'release-type': 'node',
        'changelog-type': 'github',
        packages: { '.': { 'release-type': 'node' } },
      }),
    ],
    [`${baseSha}:.release-please-manifest.json`, JSON.stringify({ '.': '0.4.0' })],
    [`${headSha}:.release-please-manifest.json`, JSON.stringify({ '.': '0.5.0' })],
    [`${baseSha}:package.json`, JSON.stringify({ name: 'dvt', version: '0.4.0' })],
    [`${headSha}:package.json`, JSON.stringify({ name: 'dvt', version: '0.5.0' })],
    [`${baseSha}:CHANGELOG.md`, baseChangelog],
    [`${headSha}:CHANGELOG.md`, candidateChangelog],
  ]);
  const calls = [];
  const runGit = (args) => {
    const command = args.join(' ');
    calls.push(command);
    if (command === 'rev-parse --verify main^{commit}') return baseSha;
    if (command === 'rev-parse --verify candidate^{commit}') return headSha;
    if (command === `rev-parse ${headSha}^1`) return baseSha;
    if (command === `rev-list --count ${baseSha}..${headSha}`) return '1';
    if (command === `merge-base ${baseSha} ${headSha}`) return baseSha;
    if (command === `diff --raw --no-renames ${baseSha}...${headSha}`) {
      return [
        ':100644 100644 aaaaaaa bbbbbbb M\t.release-please-manifest.json',
        ':100644 100644 aaaaaaa bbbbbbb M\tCHANGELOG.md',
        ':100644 100644 aaaaaaa bbbbbbb M\tpackage.json',
      ].join('\n');
    }
    if (args[0] === 'show') return gitObjects.get(args[1]);
    throw new Error(`Unexpected git command: ${command}`);
  };

  const snapshot = collectReleaseCandidateSnapshot(
    { base: 'main', head: 'candidate', repository: 'dunay2/dvt' },
    {
      runGit,
      repositoryPolicyJson: JSON.stringify(policy),
    }
  );

  const result = assessReleaseCandidateIntegrity(snapshot);
  assert.equal(result.valid, true, result.violations.join('\n'));
  assert.ok(calls.includes(`show ${baseSha}:package.json`));
  assert.ok(calls.includes(`show ${headSha}:package.json`));
  assert.ok(calls.includes(`show ${baseSha}:CHANGELOG.md`));
  assert.ok(calls.includes(`show ${headSha}:CHANGELOG.md`));
  assert.equal(snapshot.changelogType, 'github');
  assert.deepEqual(snapshot.changedFileEntries[0], {
    oldMode: '100644',
    newMode: '100644',
    status: 'M',
    path: '.release-please-manifest.json',
  });
  assert.equal(
    calls.some((call) => /main\.\.\.candidate/u.test(call)),
    false
  );
});
