/**
 * Owned concern: Keep crypto and command mechanics sourced from their canonical authority.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import ts from 'typescript';
import { TOOLING_CRYPTO_CONTRACT, isToolingCryptoContractInput } from '../ci-tool-test-catalog.mjs';
import { readText } from './fixture-files.mjs';

test('Cut 1 crypto facades and duplicate implementations stay retired', () => {
  const retiredPaths = [
    'packages/@dvt/contracts/src/utils/jcsCanonicalize.ts',
    'packages/@dvt/contracts/src/utils/sha256HexUtf8.ts',
    'packages/@dvt/contracts/test/sha256HexUtf8.test.ts',
    'packages/@dvt/engine/src/utils/jcs.ts',
    'packages/@dvt/engine/src/utils/sha256.ts',
    'packages/@dvt/plan-verifier/src/crypto.ts',
  ];

  for (const retiredPath of retiredPaths) {
    assert.equal(existsSync(retiredPath), false, `${retiredPath} must not be restored`);
  }
});

test('Cut 3 command identity mechanics stay retired', () => {
  assert.equal(
    existsSync('apps/web/src/app/views/canvas/canvasDraftIdempotencyKey.ts'),
    false,
    'the Canvas-specific identity helper must not be restored'
  );

  const browserIdentity = readText(
    'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts'
  );
  assert.match(browserIdentity, /import \{ randomUuidV4 \} from '@dvt\/crypto';/u);
  assert.doesNotMatch(
    browserIdentity,
    /getRandomValues|randomUUID|Date\.now|Math\.random/u,
    'Web command identities must not reimplement UUID or weak fallback mechanics'
  );

  const startRunIdentity = readText('apps/api/src/entrypoints/http/startRunIdentity.ts');
  assert.match(startRunIdentity, /import \{ randomUuidV7 \} from '@dvt\/crypto';/u);
  assert.doesNotMatch(
    startRunIdentity,
    /node:crypto|randomBytes|function generateUuidV7|function formatUuid/u,
    'Start Run must not reimplement UUIDv7 mechanics'
  );
});

test('Cut 4 tooling crypto mechanics and duplicate runner stay retired', () => {
  assert.equal(
    existsSync('scripts/run-golden-paths.cjs'),
    false,
    'the unreferenced root golden-path runner must not be restored'
  );

  const rootPackage = JSON.parse(readText('package.json'));
  const cliPackage = JSON.parse(readText('packages/@dvt/cli/package.json'));
  assert.equal(rootPackage.devDependencies['@dvt/crypto'], 'workspace:*');
  assert.equal(cliPackage.dependencies['@dvt/crypto'], 'workspace:*');

  const trackedFiles = spawnSync(
    'git',
    ['ls-files', '--', ...TOOLING_CRYPTO_CONTRACT.sourcePaths],
    { encoding: 'utf8' }
  );
  assert.equal(trackedFiles.stderr, '');
  assert.equal(trackedFiles.status, 0);

  const findings = [];
  for (const sourcePath of trackedFiles.stdout.split(/\r?\n/u).filter(Boolean)) {
    if (
      !existsSync(sourcePath) ||
      !isToolingCryptoContractInput(sourcePath) ||
      !/\.[cm]?[jt]sx?$/u.test(sourcePath)
    ) {
      continue;
    }

    const source = readText(sourcePath);
    if (/\b(?:crypto\.)?createHash\s*\(/u.test(source)) {
      findings.push(`${sourcePath}: createHash`);
    }
    if (/\b(?:crypto\.)?randomUUID\s*\(/u.test(source)) {
      findings.push(`${sourcePath}: randomUUID`);
    }
    if (/\bfunction\s+sha256\s*\(/u.test(source)) {
      findings.push(`${sourcePath}: local sha256 facade`);
    }
  }

  assert.deepEqual(findings.sort(), []);
});

test('repository consumers import crypto primitives from their authority', () => {
  const trackedFiles = spawnSync('git', ['ls-files', '--', 'apps', 'packages'], {
    encoding: 'utf8',
  });
  assert.equal(trackedFiles.stderr, '');
  assert.equal(trackedFiles.status, 0);

  const forbiddenContractExports = new Set(['jcsCanonicalize', 'sha256HexUtf8']);
  const findings = [];

  for (const sourcePath of trackedFiles.stdout.split(/\r?\n/u).filter(Boolean)) {
    if (!/\.[cm]?[jt]sx?$/u.test(sourcePath)) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      sourcePath,
      readText(sourcePath),
      ts.ScriptTarget.Latest,
      true
    );
    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== '@dvt/contracts'
      ) {
        continue;
      }

      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) {
        continue;
      }

      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (forbiddenContractExports.has(importedName)) {
          findings.push(`${sourcePath}: ${importedName}`);
        }
      }
    }
  }

  assert.deepEqual(findings.sort(), []);
});
