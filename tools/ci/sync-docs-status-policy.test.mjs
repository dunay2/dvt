import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { shouldIncludePlanningDoc, splitFrontmatter } = require('../../scripts/sync-docs.cjs');

test('planning doc index generation excludes superseded and archived docs', () => {
  assert.equal(shouldIncludePlanningDoc('Active'), true);
  assert.equal(shouldIncludePlanningDoc('Draft'), true);
  assert.equal(shouldIncludePlanningDoc('Review'), true);
  assert.equal(shouldIncludePlanningDoc('Superseded'), false);
  assert.equal(shouldIncludePlanningDoc('Archived'), false);
  assert.equal(shouldIncludePlanningDoc('superseded'), false);
  assert.equal(shouldIncludePlanningDoc(' archived '), false);
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
