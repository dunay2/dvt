/**
 * Owned concern: invoke the selected CI-tool corpus and report its observed wall result.
 * Why: catalog queries and native event projection have independent reasons to change.
 * Corner: missing native completion must never become a successful exit.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CI_TOOL_TEST_MODES, buildCiToolTestList } from './ci-tool-test-catalog.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const timingReporter = new URL('./ci-tool-test-timing-reporter.mjs', import.meta.url).href;

export function runCiToolTests(mode = 'all', options = {}) {
  const root = options.repoRootPath ?? repoRoot;
  const tests = buildCiToolTestList(mode, { ...options, repoRootPath: root });
  if (tests.length === 0) {
    console.log(`[ci-tool-tests] No ${mode} tests selected.`);
    return 0;
  }
  console.log(`[ci-tool-tests] Running ${tests.length} ${mode} test file(s).`);
  const args = [
    '--test',
    `--test-reporter=${process.stdout.isTTY ? 'spec' : 'tap'}`,
    `--test-reporter=${timingReporter}`,
    '--test-reporter-destination=stdout',
    '--test-reporter-destination=stdout',
    ...tests,
  ];
  const startedAt = performance.now();
  const spawn = options.spawnSync ?? spawnSync;
  const result = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
  console.log(
    `[ci-tool-tests] result ${JSON.stringify({
      mode,
      selectedFiles: tests.length,
      wallDurationMs: performance.now() - startedAt,
      code: result.status ?? null,
      signal: result.signal ?? null,
      outcome: result.error || result.status !== 0 ? 'failed' : 'passed',
    })}`
  );
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }
  return result.status ?? 1;
}

export function parseCiToolTestMode(argv = process.argv.slice(2)) {
  const mode = argv[0] ?? 'all';
  if (!CI_TOOL_TEST_MODES.includes(mode)) {
    throw new TypeError(`Unsupported CI tool test mode: ${mode}`);
  }
  return mode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCiToolTests(parseCiToolTestMode());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
