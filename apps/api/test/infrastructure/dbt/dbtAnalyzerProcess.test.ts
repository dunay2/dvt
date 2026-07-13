import { describe, expect, it } from 'vitest';

import { NODE_DBT_PROCESS_RUNNER } from '../../../src/infrastructure/dbt/dbtAnalyzerProcess.js';

describe('NODE_DBT_PROCESS_RUNNER', () => {
  it('classifies a missing analyzer executable as unavailable', async () => {
    const result = await NODE_DBT_PROCESS_RUNNER.run({
      executable: `missing-dbt-${process.pid}-${Date.now()}`,
      args: ['parse'],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 1_000,
      maxOutputBytes: 1_024,
    });

    expect(result).toMatchObject({ kind: 'unavailable', reason: 'spawn_failure' });
  });

  it('classifies analyzer timeout as unavailable', async () => {
    const result = await NODE_DBT_PROCESS_RUNNER.run({
      executable: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 10_000)'],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 10,
      maxOutputBytes: 1_024,
    });

    expect(result).toMatchObject({ kind: 'unavailable', reason: 'timeout' });
  });

  it('classifies analyzer output overflow as unavailable', async () => {
    const result = await NODE_DBT_PROCESS_RUNNER.run({
      executable: process.execPath,
      args: ['-e', "process.stdout.write('x'.repeat(4_096))"],
      cwd: process.cwd(),
      env: process.env,
      timeoutMs: 1_000,
      maxOutputBytes: 128,
    });

    expect(result).toMatchObject({ kind: 'unavailable', reason: 'output_limit' });
  });
});
