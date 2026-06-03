import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function runPnpm(args) {
  const result =
    process.platform === 'win32'
      ? spawnSync(
          process.env.ComSpec || 'cmd.exe',
          ['/d', '/s', '/c', ['pnpm', ...args].join(' ')],
          {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        )
      : spawnSync('pnpm', args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });

  return result;
}

test('regression fixtures keep BOM-prefixed evidence docs that previously failed docs:gov:frontmatter', () => {
  for (const path of [
    'docs/evidence/critical/ED-20260320-planner-r2-typed-graph-source-boundary.md',
    'docs/evidence/critical/ED-20260331-mvp-a1-backend-contractual-inventory.md',
  ]) {
    const content = readFileSync(path, 'utf8');
    assert.equal(content.codePointAt(0), 0xfeff, `${path} should start with a UTF-8 BOM fixture`);
    assert.match(content, /^\uFEFF---\r?\n/, `${path} should still contain YAML frontmatter`);
  }
});

test('docs governance frontmatter check accepts BOM-prefixed evidence docs', () => {
  const result = runPnpm(['docs:gov:frontmatter']);

  assert.equal(
    result.status,
    0,
    [
      'pnpm docs:gov:frontmatter should accept BOM-prefixed evidence docs',
      result.stdout?.trim(),
      result.stderr?.trim(),
    ]
      .filter(Boolean)
      .join('\n')
  );
});
