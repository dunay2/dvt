/** Owned concern: preserve API's strict typed-lint boundary and semantic checks. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lint = new ESLint({ cwd: root });
const sourcePath = 'apps/api/src/app.ts';

function project(configPath) {
  const absolute = path.join(root, configPath);
  const config = ts.readConfigFile(absolute, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(absolute));
  assert.deepEqual(parsed.errors, []);
  return parsed;
}

async function messages(source) {
  const [result] = await lint.lintText(source, { filePath: path.join(root, sourcePath) });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages;
}

test('API source, tests and configuration retain their strict effective policies', async () => {
  for (const [file, returnSeverity, isTest] of [
    [sourcePath, 0, false],
    ['apps/api/test/application/services/resolveAuthorizedPreviewSelection.test.ts', 1, true],
    ['apps/api/vitest.config.ts', 1, false],
  ]) {
    const config = await lint.calculateConfigForFile(path.join(root, file));
    assert.deepEqual(config.languageOptions.parserOptions.project, [
      './apps/api/tsconfig.eslint.json',
    ]);
    for (const rule of [
      '@typescript-eslint/no-floating-promises',
      '@typescript-eslint/no-misused-promises',
      '@typescript-eslint/await-thenable',
      '@typescript-eslint/no-unused-vars',
      'import/no-cycle',
    ])
      assert.equal(config.rules[rule][0], 2, `${file}: ${rule}`);
    // Preserve the existing lightweight config-file import policy.
    assert.equal(config.rules['import/no-unresolved'][0], file.endsWith('.config.ts') ? 0 : 2);
    assert.equal(
      config.rules['@typescript-eslint/explicit-function-return-type'][0],
      returnSeverity
    );
    assert.equal(config.rules['no-console'][0], 1);
    assert.equal(config.languageOptions.globals.process, 'readonly');
    if (isTest) assert.equal(config.languageOptions.globals.expect, 'readonly');
  }
  const engine = await lint.calculateConfigForFile(
    path.join(root, 'packages/@dvt/engine/src/WorkflowEngine.ts')
  );
  assert.deepEqual(engine.languageOptions.parserOptions.project, ['./tsconfig.eslint.json']);
});

test('API owns all tracked TypeScript roots and preserves canonical compiler options', () => {
  const canonical = project('tsconfig.eslint.json');
  const api = project('apps/api/tsconfig.eslint.json');
  assert.deepEqual(api.options, canonical.options);
  const roots = new Set(
    api.fileNames.map((file) => path.relative(root, file).replaceAll('\\', '/'))
  );
  const tracked = execFileSync('git', ['ls-files', '-z', '--', 'apps/api'], { cwd: root })
    .toString()
    .split('\0')
    .filter((file) => /\.[cm]?tsx?$/u.test(file));
  assert.ok(tracked.length > 0);
  for (const file of tracked) assert.ok(roots.has(file), `Missing API root: ${file}`);
  for (const file of roots) {
    assert.ok(file.startsWith('apps/api/'), `Unrelated root: ${file}`);
    assert.doesNotMatch(file, /\/(?:dist|node_modules)\//u);
  }
  const program = ts.createProgram(api.fileNames, api.options);
  const actualSources = program.getSourceFiles().map((file) => file.fileName.replaceAll('\\', '/'));
  assert.ok(actualSources.some((file) => file.endsWith('/packages/@dvt/crypto/src/index.ts')));
  assert.ok(actualSources.some((file) => file.endsWith('/@types/pg/index.d.ts')));
  assert.ok(!actualSources.some((file) => file.endsWith('/apps/lineage-worker/src/types/pg.d.ts')));
});

test('real pg promise types reject an unconsumed query and admit its awaited form', async () => {
  const prefix = "import { Pool } from 'pg';\nconst pool = new Pool();\n";
  const rejected = await messages(prefix + "pool.query('select 1');\n");
  assert.ok(
    rejected.some((message) => message.ruleId === '@typescript-eslint/no-floating-promises')
  );
  assert.deepEqual(await messages(prefix + "await pool.query('select 1');\n"), []);
});

test('typed Promise and import checks remain meaningful for API source aliases', async () => {
  const invalid = [
    [
      'const accept = (task: () => void): void => task();\naccept(async () => {});',
      '@typescript-eslint/no-misused-promises',
    ],
    [
      "import { sha256HexUtf8 } from '@dvt/crypto';\nawait sha256HexUtf8('value');",
      '@typescript-eslint/await-thenable',
    ],
    ["import absent from 'dvt-missing-lint-contract';\nexport { absent };", 'import/no-unresolved'],
  ];
  for (const [source, rule] of invalid) {
    assert.ok(
      (await messages(source)).some((message) => message.ruleId === rule),
      rule
    );
  }
  assert.deepEqual(
    await messages(
      "import { sha256HexUtf8 } from '@dvt/crypto';\nexport const digest: string = sha256HexUtf8('value');"
    ),
    []
  );
});
