import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import verifyPrepush from '../../scripts/verify-prepush.cjs';

const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));

function runPnpm(args, env = {}) {
  const command = ['pnpm', ...args].join(' ');
  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], {
          encoding: 'utf8',
          env: { ...process.env, ...env },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : spawnSync('pnpm', args, {
          encoding: 'utf8',
          env: { ...process.env, ...env },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

  if (result.error) {
    throw result.error;
  }

  return result;
}

test('changed-doc governance commands are wired into docs and pre-push gates', () => {
  assert.equal(
    rootPackage.scripts['docs:gov:filenames:changed'],
    'tsx tools/docs/check-filenames.ts --changed-only --strict'
  );
  assert.equal(
    rootPackage.scripts['docs:gov:frontmatter:changed'],
    'tsx tools/docs/check-frontmatter.ts --changed-only'
  );
  assert.match(rootPackage.scripts['docs:gov'], /\bpnpm docs:gov:filenames:changed\b/);
  assert.match(rootPackage.scripts['docs:gov'], /\bpnpm docs:gov:frontmatter:changed\b/);
  assert.equal(rootPackage.scripts['verify:prepush'], 'node scripts/verify-prepush.cjs');

  const prepushStepIds = verifyPrepush
    .buildPrepushPlan(['docs/guides/testing-and-ci-capabilities.md'])
    .map((step) => step.id);
  assert.ok(prepushStepIds.includes('docs-gov-filenames-changed'));
  assert.ok(prepushStepIds.includes('docs-gov-frontmatter-changed'));
});

test('changed-only strict filename gate fails non-canonical changed doc names', () => {
  const result = runPnpm(
    ['exec', 'tsx', 'tools/docs/check-filenames.ts', '--changed-only', '--strict'],
    {
      DOCS_GOV_CHANGED_FILES: 'docs/planning/reviews/Bad_File.md',
    }
  );
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /Filename should be kebab-case/);
  assert.match(output, /New or changed docs must use canonical kebab-case/);
});

test('changed-only frontmatter gate validates only changed ADR and evidence files', () => {
  const fixtureDir = 'docs/evidence/.tmp';
  const validPath = `${fixtureDir}/ED-20991231-changed-frontmatter-valid.md`;
  const invalidUnchangedPath = `${fixtureDir}/ED-20991231-unchanged-frontmatter-invalid.md`;

  try {
    mkdirSync(dirname(validPath), { recursive: true });
    writeFileSync(
      validPath,
      [
        '---',
        'title: Changed frontmatter fixture',
        'status: Accepted',
        'date: 2099-12-31',
        'owners:',
        '  - docs',
        'arc_level: ARC-1',
        'breaking: false',
        'code_refs:',
        '  - tools/docs/check-frontmatter.ts',
        'evidence:',
        '  tests:',
        '    - pnpm test:ci-tools',
        '---',
        '',
        '# Changed frontmatter fixture',
        '',
      ].join('\n'),
      'utf8'
    );
    writeFileSync(invalidUnchangedPath, '# Invalid unchanged evidence fixture\n', 'utf8');

    const result = runPnpm(['exec', 'tsx', 'tools/docs/check-frontmatter.ts', '--changed-only'], {
      DOCS_GOV_CHANGED_FILES: validPath,
    });

    assert.equal(
      result.status,
      0,
      [
        'changed-only frontmatter should ignore unlisted unchanged invalid evidence fixtures',
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join('\n')
    );
  } finally {
    rmSync(validPath, { force: true });
    rmSync(invalidUnchangedPath, { force: true });
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('changed-only markdown location gate reports canonical docs placement remediation', () => {
  const result = runPnpm(['docs:gov:locations', '--', '--changed-only'], {
    DOCS_GOV_CHANGED_FILES: 'apps/web/src/bad-doc.md',
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /apps\/web\/src\/bad-doc\.md/);
  assert.match(output, /Move governed documentation into docs\//);
});
