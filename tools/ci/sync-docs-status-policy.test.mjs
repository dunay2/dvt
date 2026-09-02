import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  scanSectionEntries,
  shouldIncludeDocumentationPath,
  shouldIncludePlanningDoc,
  splitFrontmatter,
} = require('../../scripts/sync-docs.cjs');

test('docs sync reads existing Planning DB authority without provisioning or importing it', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  );

  assert.equal(packageJson.scripts['docs:sync'], 'node scripts/sync-docs.cjs');
  assert.doesNotMatch(packageJson.scripts['docs:sync'], /planning:db:(?:up|health|import)/u);
});

test('planning doc index generation excludes superseded and archived docs', () => {
  assert.equal(shouldIncludePlanningDoc('Active'), true);
  assert.equal(shouldIncludePlanningDoc('Draft'), true);
  assert.equal(shouldIncludePlanningDoc('Review'), true);
  assert.equal(shouldIncludePlanningDoc('Superseded'), false);
  assert.equal(shouldIncludePlanningDoc('Archived'), false);
  assert.equal(shouldIncludePlanningDoc('superseded'), false);
  assert.equal(shouldIncludePlanningDoc(' archived '), false);
});

test('docs sync includes new Git documents without requiring a Planning DB rebuild', () => {
  const lifecycleAuthority = {
    rowsByPath: new Map(),
    trackedPaths: new Set(['docs/evidence/ED-20260902-new-git-evidence.md']),
  };

  assert.equal(
    shouldIncludeDocumentationPath(
      'docs/evidence/ED-20260902-new-git-evidence.md',
      lifecycleAuthority
    ),
    true
  );
  assert.equal(
    shouldIncludeDocumentationPath('docs/evidence/untracked-local-note.md', lifecycleAuthority),
    false
  );
});

test('splitFrontmatter parses BOM-prefixed markdown frontmatter without duplicating metadata', () => {
  const source = [
    '\uFEFF---',
    'title: Command Logging Pane 2026-04-02',
    'status: Review',
    'owner: Docs / Delivery',
    'last_reviewed: 2026-04-02',
    'planning_type: status',
    '---',
    '',
    '# Command Logging Pane 2026-04-02',
    '',
    'Body.',
    '',
  ].join('\n');

  const parsed = splitFrontmatter(source);

  assert.equal(parsed.frontmatter.title, 'Command Logging Pane 2026-04-02');
  assert.equal(parsed.frontmatter.status, 'Review');
  assert.match(parsed.body, /^# Command Logging Pane 2026-04-02/m);
  assert.doesNotMatch(parsed.body, /^---$/m);
});

test('section index generation sorts equal labels by link for cross-platform stability', () => {
  const entries = scanSectionEntries('evidence');
  let equalLabelPairCount = 0;

  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];

    if (previous.type !== current.type) continue;
    if (previous.label.localeCompare(current.label, 'en', { sensitivity: 'base' }) !== 0) continue;

    equalLabelPairCount += 1;
    assert.ok(
      previous.link <= current.link,
      `Expected ${previous.link} to sort before or equal to ${current.link}`
    );
  }

  assert.ok(
    equalLabelPairCount > 0,
    'Expected evidence docs to contain equal-label rows that exercise the tie-breaker'
  );
});

test('section index generation excludes lifecycle-superseded documents from Planning DB', () => {
  const lifecycleByPath = new Map([
    [
      'docs/guides/generic-graph-source-technical-manual-20260404.md',
      { lifecycle_state: 'superseded' },
    ],
  ]);

  const entries = scanSectionEntries('guides', lifecycleByPath);

  assert.equal(
    entries.some((entry) => entry.link === 'generic-graph-source-technical-manual-20260404.md'),
    false
  );
});
