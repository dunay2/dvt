/** Owned concern: Chromium headless input-profile admission; headed/Electron and unrelated browser capabilities remain actual. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const cypressConfig = require('../../apps/web/cypress.config.ts').default;

test('desktop launch profile preserves unrelated flags and leaves other browser families alone', () => {
  // Linux headless device defaults must not silently select the touch-only presentation branch.
  const hooks = new Map();
  cypressConfig.e2e.setupNodeEvents((event, handler) => hooks.set(event, handler), {});
  const launch = {
    args: [
      '--existing',
      '--blink-settings=foo=true,primaryPointerType=2',
      '--blink-settings=bar=false',
    ],
  };
  const prepare = hooks.get('before:browser:launch');
  assert.equal(typeof prepare, 'function');
  assert.equal(prepare({ family: 'firefox' }, launch), launch);
  assert.equal(launch.args.length, 3);
  assert.equal(prepare({ family: 'chromium', name: 'chrome', isHeadless: true }, launch), launch);
  assert.ok(launch.args.includes('--existing'));
  const settings = launch.args.filter((argument) => argument.startsWith('--blink-settings='));
  assert.equal(settings.length, 1);
  assert.deepEqual(
    Object.fromEntries(
      settings[0]
        .slice('--blink-settings='.length)
        .split(',')
        .map((setting) => setting.split('='))
    ),
    {
      foo: 'true',
      bar: 'false',
      primaryHoverType: '2',
      availableHoverTypes: '2',
      primaryPointerType: '4',
      availablePointerTypes: '4',
    }
  );
  prepare({ family: 'chromium', name: 'chrome', isHeadless: true }, launch);
  assert.equal(launch.args.length, 2, 'launch composition is idempotent');
});

test('headed Chromium and Electron retain their actual input capabilities', () => {
  const hooks = new Map();
  cypressConfig.e2e.setupNodeEvents((event, handler) => hooks.set(event, handler), {});
  const prepare = hooks.get('before:browser:launch');
  for (const browser of [
    { family: 'chromium', name: 'chrome', isHeadless: false },
    { family: 'chromium', name: 'electron', isHeadless: true },
    { family: 'firefox', name: 'firefox', isHeadless: true },
  ]) {
    const launch = { args: ['--existing', '--blink-settings=primaryPointerType=2'] };
    assert.equal(prepare(browser, launch), launch);
    assert.deepEqual(launch.args, ['--existing', '--blink-settings=primaryPointerType=2']);
  }
});
