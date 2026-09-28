const assert = require('node:assert/strict');
const test = require('node:test');

const { runEslint } = require('./check-changed.cjs');

function eslintHarness(results) {
  const calls = [];
  const messages = [];
  return {
    calls,
    messages,
    options: {
      createEslint(options) {
        calls.push({ kind: 'create', options });
        return {
          async lintFiles(files) {
            calls.push({ kind: 'lint', files });
            return results;
          },
          async loadFormatter(name) {
            calls.push({ kind: 'formatter', name });
            return { format: () => 'lint report\n' };
          },
        };
      },
      write(message) {
        messages.push(message);
      },
      reportError(message) {
        messages.push(message);
      },
    },
  };
}

test('lints the entire changed-file inventory once with canonical ignored-file behavior', async () => {
  const harness = eslintHarness([
    { errorCount: 0, warningCount: 0 },
    { errorCount: 0, warningCount: 0 },
  ]);

  const status = await runEslint(['a.ts', 'b.ts'], harness.options);

  assert.equal(status, 0);
  assert.deepEqual(harness.calls, [
    {
      kind: 'create',
      options: { cwd: require('node:path').resolve(__dirname, '..'), warnIgnored: false },
    },
    { kind: 'lint', files: ['a.ts', 'b.ts'] },
    { kind: 'formatter', name: 'stylish' },
  ]);
  assert.deepEqual(harness.messages, ['lint report\n']);
});

test('fails on a warning even when there are no lint errors', async () => {
  const harness = eslintHarness([{ errorCount: 0, warningCount: 1 }]);
  assert.equal(await runEslint(['warning.ts'], harness.options), 1);
});

test('fails on an ESLint error', async () => {
  const harness = eslintHarness([{ errorCount: 1, warningCount: 0 }]);
  assert.equal(await runEslint(['error.ts'], harness.options), 1);
});

test('fails closed when ESLint cannot lint the changed files', async () => {
  const messages = [];
  const status = await runEslint(['a.ts'], {
    createEslint() {
      throw new Error('ESLint unavailable');
    },
    write(message) {
      messages.push(message);
    },
    reportError(message) {
      messages.push(message);
    },
  });

  assert.equal(status, 1);
  assert.deepEqual(messages, ['ESLint unavailable']);
});
