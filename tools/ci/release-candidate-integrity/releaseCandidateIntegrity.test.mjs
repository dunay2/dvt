import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessReleaseCandidateIntegrity,
  assessRepositoryMergePolicy,
  extractLatestRelease,
  normalizeReleaseEntryIdentity,
} from './releaseCandidateIntegrity.mjs';

const baseChangelog = [
  '# Changelog',
  '',
  '## [0.4.0](https://example.test/v0.4.0) (2026-07-17)',
  '',
  '### Bug Fixes',
  '',
  '* **web:** Preserve existing behavior ([abc1234](https://example.test/commit/abc1234))',
].join('\n');

const githubCandidateChangelog = [
  '# Changelog',
  '',
  '## [0.5.0](https://example.test/v0.5.0) (2026-07-19)',
  '',
  "## What's Changed",
  '',
  '### Features',
  '',
  '* **web:** Add governed authoring by @maintainer in https://github.com/dunay2/dvt/pull/1996',
  '',
  '## New Contributors',
  '',
  '* @maintainer made their first contribution in https://github.com/dunay2/dvt/pull/1996',
  '',
  '**Full Changelog**: https://github.com/dunay2/dvt/compare/v0.4.0...v0.5.0',
  '',
  baseChangelog.slice(baseChangelog.indexOf('## [0.4.0]')),
].join('\n');

const validPolicy = {
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

const basePackageJson = {
  name: 'dvt',
  version: '0.4.0',
  scripts: { test: 'node --test' },
};

const validCandidate = {
  candidateParentSha: 'a'.repeat(40),
  expectedBaseSha: 'a'.repeat(40),
  headSha: 'b'.repeat(40),
  commitCount: 1,
  mergeBaseSha: 'a'.repeat(40),
  changedFiles: ['.release-please-manifest.json', 'CHANGELOG.md', 'package.json'],
  changedFileEntries: ['.release-please-manifest.json', 'CHANGELOG.md', 'package.json'].map(
    (path) => ({ path, status: 'M', oldMode: '100644', newMode: '100644' })
  ),
  expectedChangedFiles: ['.release-please-manifest.json', 'CHANGELOG.md', 'package.json'],
  baseManifest: { '.': '0.4.0' },
  manifest: { '.': '0.5.0' },
  basePackageJson,
  packageJson: { ...basePackageJson, version: '0.5.0' },
  baseChangelog,
  changelog: githubCandidateChangelog,
  changelogType: 'github',
  repository: 'dunay2/dvt',
  configurationViolations: [],
  repositoryPolicy: validPolicy,
};

test('extractLatestRelease supports GitHub H2 sections without truncating entries', () => {
  const release = extractLatestRelease(githubCandidateChangelog);

  assert.equal(release.version, '0.5.0');
  assert.equal(release.entries.length, 1);
  assert.equal(release.entries[0].identity, 'pr:1996');
  assert.equal(release.entries[0].section, 'Features');
});

test('extractLatestRelease supports default Release Please headings and commit entries', () => {
  const release = extractLatestRelease(
    [
      '## 0.5.0 (2026-07-19)',
      '',
      '### Features',
      '',
      '* **web:** Add governed authoring ([abc1234](https://example.test/commit/abc1234))',
    ].join('\n')
  );

  assert.equal(release.version, '0.5.0');
  assert.equal(release.entries.length, 1);
});

test('normalizeReleaseEntryIdentity keeps PR identity and ignores presentation sections', () => {
  const line =
    '* **web:** Add governed authoring by @maintainer in https://github.com/dunay2/dvt/pull/1996';

  assert.equal(normalizeReleaseEntryIdentity('Features', line), 'pr:1996');
  assert.equal(normalizeReleaseEntryIdentity('Bug Fixes', line), 'pr:1996');
});

test('repository policy requires squash and the merge-blocking candidate check', () => {
  assert.deepEqual(assessRepositoryMergePolicy(validPolicy), []);

  const violations = assessRepositoryMergePolicy({
    ...validPolicy,
    repository: { ...validPolicy.repository, allowMergeCommit: true },
    mainRuleset: { ...validPolicy.mainRuleset, requiredStatusChecks: [] },
  });
  assert.match(violations.join('\n'), /plain merge/u);
  assert.match(violations.join('\n'), /status check/u);
});

test('repository policy applies actively and strictly to main without bypass actors', () => {
  for (const mainRuleset of [
    { ...validPolicy.mainRuleset, target: 'tag' },
    { ...validPolicy.mainRuleset, enforcement: 'disabled' },
    {
      ...validPolicy.mainRuleset,
      conditions: { refName: { include: ['refs/heads/release'], exclude: [] } },
    },
    { ...validPolicy.mainRuleset, bypassActors: [{ actorId: 1 }] },
    { ...validPolicy.mainRuleset, strictRequiredStatusChecksPolicy: false },
    {
      ...validPolicy.mainRuleset,
      requiredStatusChecks: validPolicy.mainRuleset.requiredStatusChecks.filter(
        (check) => check.context !== 'All Checks Required for Merge'
      ),
    },
  ]) {
    assert.notDeepEqual(
      assessRepositoryMergePolicy({ ...validPolicy, mainRuleset }),
      [],
      JSON.stringify(mainRuleset)
    );
  }
});

test('candidate assessment accepts one coherent exact-tree release', () => {
  assert.deepEqual(assessReleaseCandidateIntegrity(validCandidate), {
    valid: true,
    version: '0.5.0',
    entryCount: 1,
    violations: [],
  });
});

test('candidate assessment rejects the same PR repeated across visual categories', () => {
  const duplicate =
    '* **web:** Different wording by @maintainer in https://github.com/dunay2/dvt/pull/1996';
  const changelog = githubCandidateChangelog.replace(
    '## New Contributors',
    `### Bug Fixes\n\n${duplicate}\n\n## New Contributors`
  );
  const result = assessReleaseCandidateIntegrity({ ...validCandidate, changelog });

  assert.equal(result.valid, false);
  assert.match(result.violations.join('\n'), /duplicate logical changelog entry.*pr:1996/u);
});

test('candidate assessment permits different PRs with the same display title', () => {
  const repeatedTitle =
    '* **web:** Add governed authoring by @other in https://github.com/dunay2/dvt/pull/1997';
  const changelog = githubCandidateChangelog.replace(
    '## New Contributors',
    `* ${repeatedTitle.slice(2)}\n\n## New Contributors`
  );

  assert.equal(assessReleaseCandidateIntegrity({ ...validCandidate, changelog }).valid, true);
});

test('candidate assessment accepts equal default titles from distinct commits', () => {
  const defaultChangelog = [
    '# Changelog',
    '',
    '## [0.5.0](https://example.test/v0.5.0)',
    '',
    '### Features',
    '',
    '* **web:** Add governed authoring ([def5678](https://example.test/commit/def5678))',
    '* **web:** Add governed authoring ([987abcd](https://example.test/commit/987abcd))',
    '',
    baseChangelog.slice(baseChangelog.indexOf('## [0.4.0]')),
  ].join('\n');
  const result = assessReleaseCandidateIntegrity({
    ...validCandidate,
    changelog: defaultChangelog,
    changelogType: 'default',
  });

  assert.equal(result.valid, true, result.violations.join('\n'));
});

test('candidate assessment rejects a repeated default commit identity', () => {
  const changelog = [
    '# Changelog',
    '',
    '## 0.5.0',
    '',
    '### Features',
    '',
    '* **web:** First wording ([def5678](https://example.test/commit/def5678))',
    '* **web:** Second wording ([def5678](https://example.test/commit/def5678))',
    '',
    baseChangelog.slice(baseChangelog.indexOf('## [0.4.0]')),
  ].join('\n');
  const result = assessReleaseCandidateIntegrity({
    ...validCandidate,
    changelog,
    changelogType: 'default',
  });

  assert.equal(result.valid, false);
  assert.match(result.violations.join('\n'), /duplicate logical changelog entry.*commit:def5678/u);
});

test('GitHub changelog identity uses only the terminal canonical pull-request trailer', () => {
  const line =
    '* **web:** Explain https://github.com/dunay2/dvt/pull/100 by @maintainer in https://github.com/dunay2/dvt/pull/200';
  const changelog = githubCandidateChangelog.replace(
    '* **web:** Add governed authoring by @maintainer in https://github.com/dunay2/dvt/pull/1996',
    line
  );
  const release = extractLatestRelease(changelog, {
    changelogType: 'github',
    repository: 'dunay2/dvt',
  });

  assert.equal(release.entries[0].identity, 'pr:200');
});

test('candidate assessment rejects entries without the configured changelog identity', () => {
  const changelog = githubCandidateChangelog.replace(
    ' by @maintainer in https://github.com/dunay2/dvt/pull/1996',
    ''
  );
  const result = assessReleaseCandidateIntegrity({ ...validCandidate, changelog });

  assert.equal(result.valid, false);
  assert.match(result.violations.join('\n'), /canonical pull-request identity/u);
});

test('candidate assessment rejects package mutations beyond version', () => {
  const result = assessReleaseCandidateIntegrity({
    ...validCandidate,
    packageJson: {
      ...validCandidate.packageJson,
      scripts: { test: 'node malicious.mjs' },
    },
  });

  assert.equal(result.valid, false);
  assert.match(result.violations.join('\n'), /package\.json may change only version/u);
});

test('candidate assessment rejects manifest mutations beyond the root version', () => {
  const result = assessReleaseCandidateIntegrity({
    ...validCandidate,
    manifest: { '.': '0.5.0', 'packages/hidden': '9.9.9' },
  });

  assert.equal(result.valid, false);
  assert.match(result.violations.join('\n'), /manifest may change only/u);
});

test('candidate assessment rejects changelog history rewrites', () => {
  const result = assessReleaseCandidateIntegrity({
    ...validCandidate,
    changelog: githubCandidateChangelog.replace('Preserve existing behavior', 'Rewrite history'),
  });

  assert.equal(result.valid, false);
  assert.match(result.violations.join('\n'), /preserve the complete previous changelog/u);
});

test('candidate assessment rejects non-increasing and post-1.0 versions', () => {
  const unchanged = assessReleaseCandidateIntegrity({
    ...validCandidate,
    manifest: { '.': '0.4.0' },
    packageJson: { ...basePackageJson },
    changelog: githubCandidateChangelog.replaceAll('0.5.0', '0.4.0'),
  });
  const publicVersion = assessReleaseCandidateIntegrity({
    ...validCandidate,
    manifest: { '.': '1.0.0' },
    packageJson: { ...basePackageJson, version: '1.0.0' },
    changelog: githubCandidateChangelog.replaceAll('0.5.0', '1.0.0'),
  });

  assert.match(unchanged.violations.join('\n'), /greater than base version/u);
  assert.match(publicVersion.violations.join('\n'), /pre-1\.0/u);
});

test('candidate assessment rejects SemVer numeric identifiers with leading zeroes', () => {
  for (const version of ['00.5.0', '0.05.0', '0.5.00']) {
    const result = assessReleaseCandidateIntegrity({
      ...validCandidate,
      manifest: { '.': version },
      packageJson: { ...basePackageJson, version },
      changelog: githubCandidateChangelog.replaceAll('0.5.0', version),
    });
    assert.match(result.violations.join('\n'), /strict major\.minor\.patch SemVer/u);
  }
});

test('candidate assessment rejects file mode and non-modification mutations', () => {
  for (const changedFileEntry of [
    { path: 'package.json', status: 'M', oldMode: '100644', newMode: '100755' },
    { path: 'package.json', status: 'A', oldMode: '000000', newMode: '100644' },
  ]) {
    const result = assessReleaseCandidateIntegrity({
      ...validCandidate,
      changedFileEntries: validCandidate.changedFileEntries.map((entry) =>
        entry.path === 'package.json' ? changedFileEntry : entry
      ),
    });
    assert.match(result.violations.join('\n'), /regular file modification/u);
  }
});

test('candidate assessment rejects stale ancestry, file scope and unsupported config', () => {
  const result = assessReleaseCandidateIntegrity({
    ...validCandidate,
    candidateParentSha: 'c'.repeat(40),
    commitCount: 2,
    changedFiles: [...validCandidate.changedFiles, 'apps/web/src/main.tsx'],
    configurationViolations: ['Only the root package release is supported.'],
  });

  assert.equal(result.valid, false);
  assert.match(result.violations.join('\n'), /parent SHA/u);
  assert.match(result.violations.join('\n'), /exactly one commit/u);
  assert.match(result.violations.join('\n'), /unexpected candidate file/u);
  assert.match(result.violations.join('\n'), /root package release/u);
});
