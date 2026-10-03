const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { validateCypressProofResult, main } = require('./run-selected-closure-cypress.cjs');

const spec = 'cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts';
const successful = () => ({
  totalTests: 3,
  totalPassed: 3,
  totalFailed: 0,
  totalPending: 0,
  totalSkipped: 0,
  runs: [
    {
      spec: { relative: spec },
      error: null,
      stats: { tests: 3, passes: 3, failures: 0, pending: 0, skipped: 0 },
      tests: [{ state: 'passed' }, { state: 'passed' }, { state: 'passed' }],
    },
  ],
  config: { env: { apiBearerToken: 'must-not-escape' } },
});

test('only one exact fully executed spec yields bounded evidence without Cypress configuration', () => {
  assert.deepEqual(validateCypressProofResult(successful(), spec), { spec, tests: 3, passed: 3 });
  const result = successful();
  result.runs[0].spec.relative = spec.replaceAll('/', '\\');
  assert.deepEqual(validateCypressProofResult(result, spec), { spec, tests: 3, passed: 3 });
});

test('empty, skipped, pending, failed, malformed and wrong-spec results reject', () => {
  const mutations = [
    (r) => {
      r.totalTests = 0;
      r.totalPassed = 0;
    },
    (r) => {
      r.totalPending = 1;
    },
    (r) => {
      r.totalSkipped = 1;
    },
    (r) => {
      r.totalFailed = 1;
    },
    (r) => {
      r.totalPassed = 2;
    },
    (r) => {
      r.totalTests = '3';
    },
    (r) => {
      r.runs = [];
    },
    (r) => {
      r.runs.push(r.runs[0]);
    },
    (r) => {
      r.runs[0].spec.relative = 'other.cy.ts';
    },
    (r) => {
      r.runs[0].error = 'browser failed';
    },
    (r) => {
      r.runs[0].stats.pending = 1;
    },
    (r) => {
      r.runs[0].tests[0].state = 'pending';
    },
    (r) => {
      r.runs[0].tests = [];
    },
    (r) => {
      r.failures = 0;
      r.message = 'invalid failed-run shape';
    },
    (r) => {
      r.runs[0].spec.relative = 3;
    },
  ];
  for (const mutate of mutations) {
    const result = successful();
    mutate(result);
    assert.throws(() => validateCypressProofResult(result, spec), /Cypress proof/);
  }
  for (const result of [null, {}, { status: 'failed', failures: 1, message: 'secret' }]) {
    assert.throws(() => validateCypressProofResult(result, spec), /Cypress proof/);
  }
});

test('native adapter awaits the module API and exports only validated evidence', async () => {
  const messages = [];
  let options;
  const result = await main(['--spec', spec, '--headed'], {
    run: async (input) => {
      options = input;
      return successful();
    },
    log: (value) => messages.push(value),
  });
  assert.equal(options.spec, path.resolve(__dirname, '../apps/web', spec));
  assert.equal(options.browser, 'chrome');
  assert.equal(options.headed, true);
  assert.equal(options.project, path.resolve(__dirname, '../apps/web'));
  assert.equal(Object.hasOwn(options, 'env'), false);
  assert.deepEqual(result, { spec, tests: 3, passed: 3 });
  assert.doesNotMatch(JSON.stringify(messages), /must-not-escape|apiBearerToken/);
  await assert.rejects(
    main(['--spec', spec], {
      run: async () => {
        throw new Error('secret-token');
      },
    }),
    /^Error: Cypress native execution failed$/
  );
  await assert.rejects(
    main(['--spec', spec], { run: async () => ({ status: 'failed', failures: 1 }) }),
    /Cypress proof/
  );
});

test('native adapter rejects broad or malformed inputs before browser execution', async () => {
  for (const args of [
    [],
    ['--spec', '../bad.cy.ts'],
    ['--spec', 'cypress/e2e/**/*.cy.ts'],
    ['--spec', `${spec},other.cy.ts`],
    ['--spec', spec, '--headed', 'false'],
  ]) {
    await assert.rejects(
      main(args, { run: () => assert.fail('must not start Cypress') }),
      /literal Cypress spec/
    );
  }
});
