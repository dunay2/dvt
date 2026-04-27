import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

function readText(path) {
  return readFileSync(path, 'utf8');
}

function markdownSection(markdown, heading) {
  const sectionStart = markdown.indexOf(`${heading}\n`);
  assert.notEqual(sectionStart, -1, `${heading} must exist`);

  const bodyStart = sectionStart + heading.length + 1;
  const rest = markdown.slice(bodyStart);
  const nextHeadingMatch = /\n## /.exec(rest);

  return nextHeadingMatch ? rest.slice(0, nextHeadingMatch.index) : rest;
}

test('bootstrap component guide separates component test coverage from governance drift guards', () => {
  const guide = readText('docs/architecture/components/web/app-bootstrap-screen-component.md');
  const testCoverage = markdownSection(guide, '## Test Coverage');
  const governanceGuard = markdownSection(guide, '## Governance Drift Guard');

  assert.doesNotMatch(testCoverage, /planning-truth-sync\.test\.mjs/);
  assert.match(governanceGuard, /planning-truth-sync\.test\.mjs/);
});
