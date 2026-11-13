/**
 * Owned concern: Retain runtime-cycle distinctions and canonical contract ownership.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectAdapterCanonicalContractFindings } from '../check-architecture-dependencies.mjs';
import { writeFixtureFiles, createFixtureRoot, removeFixtureRoot } from './fixture-files.mjs';
import { collectDependencyViolations } from './dependency-fixture.mjs';

const REQUIRED_SEMANTIC_ARCHITECTURE_RULES = ['no-adapters-own-canonical-contracts'];

test('type-only cycles enrich reachability without becoming runtime cycle violations', async () => {
  const violations = await collectDependencyViolations({
    'packages/@dvt/engine/src/a.ts':
      "import type { B } from './b.js'; export interface A { readonly b: B }\n",
    'packages/@dvt/engine/src/b.ts':
      "import type { A } from './a.js'; export interface B { readonly a: A }\n",
  });

  assert.equal(violations.includes('no-dvt-package-cycles'), false);
});

test('semantic architecture guard rejects adapter-owned canonical contract definitions', () => {
  const fixtureRoot = createFixtureRoot('dvt-adapter-contracts-');
  try {
    writeFixtureFiles(fixtureRoot, {
      'packages/@dvt/adapter-postgres/src/contracts/PostgresRunCommand.v1.ts':
        'export interface PostgresRunCommandV1 { readonly runId: string; }\n',
      'packages/@dvt/adapter-postgres/src/PostgresRunSchema.v1.ts':
        'export const PostgresRunSchemaV1 = {};\n',
    });

    const findings = collectAdapterCanonicalContractFindings(fixtureRoot);

    assert.deepEqual(
      new Set(findings.map((finding) => finding.ruleName)),
      new Set(REQUIRED_SEMANTIC_ARCHITECTURE_RULES)
    );
    assert.equal(findings.length, 2);
  } finally {
    removeFixtureRoot(fixtureRoot);
  }
});

test('repository adapters do not own canonical contract definitions', () => {
  assert.deepEqual(collectAdapterCanonicalContractFindings(process.cwd()), []);
});
