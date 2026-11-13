/**
 * Owned concern: Validate the existing repository and hosted architecture-guard wiring.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { buildPrepushPlan } from '../../../scripts/local-validation-plan.cjs';
import {
  readText,
  readJson,
  readCruiserConfig,
  extractForbiddenRuleNames,
} from './fixture-files.mjs';

const REQUIRED_ARCH_DEPENDENCY_RULES = [
  'no-contracts-to-dvt-runtime',
  'no-planner-to-engine-or-adapters',
  'no-engine-to-concrete-adapters',
  'no-adapters-to-contract-internals',
  'no-web-to-backend-adapters',
  'no-presentation-to-infrastructure',
  'no-domain-to-framework-or-infrastructure',
  'no-dvt-package-cycles',
  'no-cross-package-deep-imports',
  'no-runtime-packages-to-scripts-or-tools',
  'no-api-domain-to-application',
  'no-api-application-to-fastify-or-jwt',
  'no-api-application-to-oidc-libs',
  'no-api-ports-to-http-types',
  'no-api-production-to-test-support',
];

const REQUIRED_ARCH_DEPENDENCY_COMMANDS = ['pnpm arch:deps'];

function assertArchitectureDependencyCiDelegation(scripts) {
  const commands = (name) => {
    assert.equal(typeof scripts?.[name], 'string', `Missing CI delegate: ${name}`);
    assert.doesNotMatch(
      scripts[name],
      /[\r\n]/u,
      `CI delegate must remain one command line: ${name}`
    );
    return scripts[name]
      .split('&&')
      .map((command) => command.replace(/^[ \t]+|[ \t]+$/gu, '').replace(/[ \t]+/gu, ' '));
  };

  assert.deepEqual(
    commands('ci:code'),
    ['pnpm ci:code:static', 'turbo run test'],
    'ci:code must run the static delegate before product tests'
  );
  assert.deepEqual(
    commands('ci:code:static'),
    ['pnpm arch:deps', 'pnpm type-check', 'pnpm lint:determinism'],
    'the static delegate must retain each fail-fast check in order'
  );
}

test('root package exposes the architecture dependency guard', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.devDependencies?.['dependency-cruiser'], '17.3.9');
  assert.equal(pkg.scripts?.['arch:deps'], 'node tools/ci/check-architecture-dependencies.mjs');
  assert.equal(pkg.scripts?.['verify:prepush'], 'node scripts/verify-prepush.cjs');
  assert.ok(
    buildPrepushPlan(['apps/web/src/main.tsx'], { full: true }).some(
      (step) => step.id === 'arch-deps'
    )
  );
  assertArchitectureDependencyCiDelegation(pkg.scripts);
});

test('architecture dependency wiring accepts horizontal whitespace within the admitted delegation', () => {
  assertArchitectureDependencyCiDelegation({
    'ci:code': ' \t pnpm   ci:code:static\t &&\t turbo  run test ',
    'ci:code:static': '\t pnpm\tarch:deps && pnpm  type-check&&pnpm lint:determinism\t',
  });
});

test('architecture dependency wiring rejects missing, unreachable and masked checks', () => {
  const scripts = readJson('package.json').scripts;
  const missingGuard = 'pnpm type-check && pnpm lint:determinism';
  const afterGuard = ' && pnpm type-check && pnpm lint:determinism';
  const cases = [
    ['missing delegate', { 'ci:code': 'turbo run test' }],
    ['missing static script', { 'ci:code:static': undefined }],
    ['removed architecture guard', { 'ci:code:static': missingGuard }],
    ['orphan guard', { 'ci:code:static': missingGuard, 'unused:arch': 'pnpm arch:deps' }],
    ['echo lookalike', { 'ci:code:static': `echo pnpm arch:deps${afterGuard}` }],
    ['quoted lookalike', { 'ci:code:static': `echo "pnpm arch:deps"${afterGuard}` }],
    ['LF-split invocation', { 'ci:code:static': `pnpm\narch:deps${afterGuard}` }],
    ['CRLF-split invocation', { 'ci:code:static': `pnpm\r\narch:deps${afterGuard}` }],
    ['masked guard failure', { 'ci:code:static': `pnpm arch:deps || true${afterGuard}` }],
    [
      'semicolon chain',
      { 'ci:code:static': 'pnpm arch:deps; pnpm type-check && pnpm lint:determinism' },
    ],
    ['pipeline', { 'ci:code:static': `pnpm arch:deps | cat${afterGuard}` }],
    ['static self cycle', { 'ci:code:static': `pnpm ci:code:static${afterGuard}` }],
    ['code delegate cycle', { 'ci:code:static': `pnpm ci:code${afterGuard}` }],
    ['missing product tests', { 'ci:code': 'pnpm ci:code:static' }],
    ['missing type check', { 'ci:code:static': 'pnpm arch:deps && pnpm lint:determinism' }],
    ['missing determinism lint', { 'ci:code:static': 'pnpm arch:deps && pnpm type-check' }],
    [
      'duplicate architecture guard',
      { 'ci:code:static': `pnpm arch:deps && pnpm arch:deps${afterGuard}` },
    ],
  ];
  for (const [label, overrides] of cases) {
    assert.throws(
      () => assertArchitectureDependencyCiDelegation({ ...scripts, ...overrides }),
      { code: 'ERR_ASSERTION' },
      label
    );
  }
});

test('PR quality gate runs the architecture dependency guard remotely', () => {
  const workflow = readText('.github/workflows/pr-quality-gate.yml');
  const pushBaseFetchStep = workflow.match(
    /- name: Fetch architecture push comparison base[\s\S]*?(?=\n\s+- name:)/u
  )?.[0];
  const architectureStep = workflow.match(
    /- name: Validate architecture dependency boundaries[\s\S]*?(?=\n\s+- name:)/u
  )?.[0];

  for (const command of REQUIRED_ARCH_DEPENDENCY_COMMANDS) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.ok(pushBaseFetchStep, 'missing push comparison base fetch step');
  assert.match(pushBaseFetchStep, /if: github\.event_name == 'push'/u);
  assert.match(pushBaseFetchStep, /git fetch --no-tags --depth=1 origin "\$GIT_BASE"/u);
  assert.match(pushBaseFetchStep, /GIT_BASE: \$\{\{ github\.event\.before \}\}/u);
  assert.ok(architectureStep, 'missing architecture dependency workflow step');
  assert.match(architectureStep, /pull_request\.base\.sha/u);
  assert.match(architectureStep, /github\.event\.before/u);
  assert.match(architectureStep, /'origin\/main'/u);
  assert.ok(
    workflow.indexOf(pushBaseFetchStep) < workflow.indexOf(architectureStep),
    'push comparison base must be fetched before the architecture dependency guard runs'
  );
});

test('root dependency-cruiser config declares the initial Fowler boundary rules', () => {
  const ruleNames = extractForbiddenRuleNames(readCruiserConfig());

  for (const ruleName of REQUIRED_ARCH_DEPENDENCY_RULES) {
    assert.ok(ruleNames.has(ruleName), `missing architecture dependency rule: ${ruleName}`);
  }
});

test('root guard owns retained API rules and retires the stale package-local guard', () => {
  const rootRuleNames = extractForbiddenRuleNames(readCruiserConfig());
  const apiPackage = readJson('apps/api/package.json');

  for (const ruleName of REQUIRED_ARCH_DEPENDENCY_RULES) {
    assert.ok(rootRuleNames.has(ruleName), `missing root architecture rule: ${ruleName}`);
  }
  assert.equal(rootRuleNames.has('no-routes-direct-policy'), false);
  assert.equal(apiPackage.scripts?.['test:arch'], undefined);
  assert.equal(apiPackage.devDependencies?.['dependency-cruiser'], undefined);
  assert.equal(existsSync('apps/api/.dependency-cruiser.cjs'), false);
});
