/** @ownedConcern Exercise the shared Linux browser preparation, without running browser proofs. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';

const actionPath = '.github/actions/setup-native-browser/action.yml';
const action = existsSync(actionPath)
  ? yaml.load(readFileSync(actionPath, 'utf8'))
  : { runs: { steps: [] } };
const step = (id) => {
  const found = action.runs.steps.find((entry) => entry.id === id);
  assert.ok(found, id);
  return found;
};
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const doubles = `
pnpm() {
  printf '%s\\n' "$*" >> "$CALLS"
  case "$*" in
    *"cypress install") mkdir -p "$CYPRESS_BINARY_DIR/Cypress"; touch "$CYPRESS_BINARY_DIR/Cypress/Cypress"; return "$INSTALL_STATUS";;
    *"cypress verify") return "$VERIFY_STATUS";;
    *"cypress version --component binary") echo "$BINARY_VERSION";;
    *"cypress info") printf 'Name: chrome\\n- Channel: stable\\n- Version: %s\\n- Executable: google-chrome\\n' "$CHROME_VERSION";;
    *) return 91;;
  esac
}
curl() { echo curl >> "$CALLS"; printf archive > "$CHROME_ARCHIVE"; return "$DOWNLOAD_STATUS"; }
sha256sum() { cat > /dev/null; echo checksum >> "$CALLS"; return "$HASH_STATUS"; }
sudo() { echo install-chrome >> "$CALLS"; return "$INSTALL_STATUS"; }
google-chrome() { echo "$CHROME_VERSION"; }
google-chrome-stable() { google-chrome; }
`;
function execute(id, overrides = {}, present = true) {
  const directory = mkdtempSync(join(tmpdir(), 'dvt-browser-preparation-')).replaceAll('\\', '/');
  const env = {
    ...process.env,
    RUNNER_TEMP: directory,
    CALLS: join(directory, 'calls'),
    GITHUB_OUTPUT: join(directory, 'outputs'),
    RUNNER_OS: 'Linux',
    RUNNER_ARCH: 'X64',
    PINNED_CHROME: 'false',
    CACHE_HIT: 'true',
    CYPRESS_VERSION: '15.18.1',
    INSTALL_STATUS: '0',
    VERIFY_STATUS: '0',
    BINARY_VERSION: '15.18.1',
    CHROME_VERSION: '155.0.8059.84',
    DOWNLOAD_STATUS: '0',
    HASH_STATUS: '0',
    CYPRESS_BINARY_DIR: join(directory, '15.18.1'),
    CYPRESS_CACHE_FOLDER: directory,
    CHROME_ARCHIVE: join(directory, 'chrome.deb'),
    ...overrides,
  };
  try {
    writeFileSync(env.CALLS, '');
    if (present) {
      mkdirSync(join(env.CYPRESS_BINARY_DIR, 'Cypress'), { recursive: true });
      writeFileSync(join(env.CYPRESS_BINARY_DIR, 'Cypress', 'Cypress'), '');
      writeFileSync(env.CHROME_ARCHIVE, 'archive');
    }
    const result = spawnSync(
      bash,
      ['--noprofile', '--norc', '-eo', 'pipefail', '-c', doubles + step(id).run],
      {
        env,
        encoding: 'utf8',
        timeout: 10000,
        windowsHide: true,
      }
    );
    assert.ifError(result.error);
    return { status: result.status, error: result.stderr, calls: readFileSync(env.CALLS, 'utf8') };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('Cypress miss installs while hit verifies without installation; both check binary identity', () => {
  for (const hit of ['true', 'false']) {
    const result = execute('cypress', { CACHE_HIT: hit }, hit === 'true');
    assert.equal(result.status, 0, result.error);
    assert.equal(result.calls.includes('cypress install'), hit === 'false');
    assert.match(result.calls, /cypress verify[\s\S]*cypress version --component binary/u);
  }
});
test('Cypress rejects corrupt, missing, wrong-version and failed-install binaries', () => {
  for (const [env, present] of [
    [{ VERIFY_STATUS: '1' }, true],
    [{ BINARY_VERSION: '15.18.0' }, true],
    [{}, false],
    [{ CACHE_HIT: 'false', INSTALL_STATUS: '1' }, false],
  ])
    assert.notEqual(execute('cypress', env, present).status, 0);
});
test('Chrome hit and miss both verify before installation; hit never downloads', () => {
  for (const hit of ['true', 'false']) {
    const result = execute('chrome', { CACHE_HIT: hit }, hit === 'true');
    assert.equal(result.status, 0, result.error);
    assert.equal(result.calls.includes('curl'), hit === 'false');
    assert.match(result.calls, /checksum\ninstall-chrome/u);
  }
});
test('Chrome rejects missing, corrupt, failed-download, failed-install and mismatched discovery', () => {
  for (const [env, present] of [
    [{}, false],
    [{ HASH_STATUS: '1' }, true],
    [{ CACHE_HIT: 'false', DOWNLOAD_STATUS: '1' }, false],
    [{ INSTALL_STATUS: '1' }, true],
    [{ CHROME_VERSION: '156.0.0.0' }, true],
  ])
    assert.notEqual(execute('chrome', env, present).status, 0);
  assert.doesNotMatch(execute('chrome', { HASH_STATUS: '1' }).calls, /install-chrome/u);
});
test('identity rejects non-Linux, non-X64 and invalid optional Chrome requests', () => {
  for (const env of [
    { RUNNER_OS: 'Windows' },
    { RUNNER_ARCH: 'ARM64' },
    { PINNED_CHROME: 'maybe' },
  ])
    assert.notEqual(execute('identity', env).status, 0);
  for (const flag of ['true', 'false'])
    assert.equal(execute('identity', { PINNED_CHROME: flag }).status, 0);
});
test('caches use exact identities and save only successful verified preparation', () => {
  for (const name of ['cypress', 'chrome']) {
    const restore = step(`restore-${name}`);
    const save = step(`save-${name}`);
    assert.match(restore.uses, /^actions\/cache\/restore@[a-f0-9]{40}$/u);
    assert.equal(restore.with['restore-keys'], undefined);
    assert.equal(save.with.key, restore.with.key);
    assert.match(save.if, /success\(\)/u);
    assert.match(save.if, new RegExp(`steps\\.${name}\\.outcome == 'success'`, 'u'));
    assert.ok(action.runs.steps.indexOf(step(name)) < action.runs.steps.indexOf(save));
    for (const [successful, outcome, cacheHit, expected] of [
      [true, 'success', 'false', true],
      [true, 'success', 'true', false],
      [false, 'failure', 'false', false],
      [true, 'skipped', 'false', false],
    ]) {
      assert.equal(
        runInNewContext(
          save.if
            .replace(/steps\.([\w-]+)/gu, "steps['$1']")
            .replaceAll('.cache-hit', "['cache-hit']"),
          {
            success: () => successful,
            steps: {
              [name]: { outcome },
              [`restore-${name}`]: { outputs: { 'cache-hit': cacheHit } },
            },
          }
        ),
        expected
      );
    }
  }
  assert.match(step('restore-cypress').with.key, /runner.os.*runner.arch.*cypress-version/u);
  assert.match(
    step('restore-chrome').with.key,
    /155\.0\.8059\.84.*8fbd2ae69cdf7ee98b7513c3396a7b5e06f974f8625fdd590df3091dd0c3e9de/u
  );
  assert.equal(step('chrome').if, "inputs.pinned-chrome == 'true'");
});
