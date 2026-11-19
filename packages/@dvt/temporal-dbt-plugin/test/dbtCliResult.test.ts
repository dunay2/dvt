/** Prove a successful dbt process attests the exact resource from this invocation. */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { runDbtCommand } from '../src/dbtCliProcess.js';

const uniqueId = 'model.analytics.orders';
const accepted = { unique_id: uniqueId, status: 'success' };
let cwd: string;

beforeEach(async () => {
  cwd = await mkdtemp(join(tmpdir(), 'dvt-dbt-result-'));
  await mkdir(join(cwd, 'target'));
  await writeFile(join(cwd, 'target', 'run_results.json'), JSON.stringify({ results: [accepted] }));
});
afterEach(() => rm(cwd, { recursive: true, force: true }));

function runWithResults(
  results?: unknown,
  expectation: { expectedUniqueId?: string } = { expectedUniqueId: uniqueId }
): ReturnType<typeof runDbtCommand> {
  const program = `
    const args = process.argv.slice(1);
    const target = args[args.indexOf('--target-path') + 1];
    if (target && process.env.RESULTS) {
      require('fs').writeFileSync(require('path').join(target, 'run_results.json'), process.env.RESULTS);
    }
  `;
  return runDbtCommand(process.execPath, ['-e', program, '--'], {
    cwd,
    ...expectation,
    env: { RESULTS: results === undefined ? '' : JSON.stringify({ results }) },
  });
}

it('accepts the model and native project hooks from the same invocation', async () => {
  await expect(
    runWithResults([{ unique_id: 'operation.analytics.start', status: 'success' }, accepted])
  ).resolves.toBeDefined();
});

it('accepts a nonempty legacy selection and rejects an empty one', async () => {
  await expect(
    runWithResults([accepted, { unique_id: 'model.analytics.other', status: 'success' }], {})
  ).resolves.toBeDefined();
  await expect(runWithResults([], {})).rejects.toThrow('DBT_STEP_RESULT_UNCONFIRMED');
});

it.each([
  ['missing fresh artifact', undefined],
  ['empty selection', []],
  ['another model', [{ ...accepted, unique_id: 'model.analytics.other' }]],
  ['unintended sibling', [accepted, { ...accepted, unique_id: 'model.analytics.other' }]],
  ['skipped resource', [{ ...accepted, status: 'skipped' }]],
  ['arbitrary payload', [null]],
])('rejects a zero exit with %s', async (_reason, results) => {
  await expect(runWithResults(results)).rejects.toThrow('DBT_STEP_RESULT_UNCONFIRMED');
});
