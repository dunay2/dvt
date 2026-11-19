/**
 * @file packages/@dvt/temporal-dbt-plugin/src/dbtCliProcess.ts
 * @ownedConcern Execute DBT CLI subprocess commands and availability probes
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Keep process execution behind a DBT CLI command runner seam
 * @consequence Tests and future runner implementations can replace process execution cleanly
 * @version 1.0.0
 */
import { execFile } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { DbtCliCommandRunner } from './dbtCliTypes.js';
import { assertDbtRunResult } from './dbtRunResult.js';

const execFileAsync = promisify(execFile);
const DBT_CLI_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export const runDbtCommand: DbtCliCommandRunner = async (dbtBin, args, options) => {
  // The project's normal cleanup also removes these invocation-local artifacts.
  const target = await mkdtemp(join(options.cwd, '.dvt-run-'));
  const result = await executeDbtProcess(
    dbtBin,
    [...args, '--target-path', target, '--write-json'],
    options
  );
  await assertDbtRunResult(target, options.expectedUniqueId);
  return result;
};

const executeDbtProcess: DbtCliCommandRunner = async (dbtBin, args, options) => {
  const result = await execFileAsync(dbtBin, [...args], {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: DBT_CLI_MAX_BUFFER_BYTES,
    ...(options.env === undefined ? {} : { env: { ...process.env, ...options.env } }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

export async function assertDbtCliAvailable(
  dbtBin: string,
  runCommand: DbtCliCommandRunner = executeDbtProcess
): Promise<void> {
  await runCommand(dbtBin, ['--version'], { cwd: process.cwd() });
}
