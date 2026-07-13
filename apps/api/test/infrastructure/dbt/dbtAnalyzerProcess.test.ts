import { describe, expect, it } from 'vitest';

import {
  buildSanitizedProcessEnvironment,
  NODE_DBT_PROCESS_RUNNER,
} from '../../../src/infrastructure/dbt/dbtAnalyzerProcess.js';

describe('buildSanitizedProcessEnvironment', () => {
  it('preserves Windows runtime discovery without inheriting credentials', () => {
    const environment = buildSanitizedProcessEnvironment(
      {
        APPDATA: 'C:\\Users\\service\\AppData\\Roaming',
        DATABASE_URL: 'must-not-leak',
        SNOWFLAKE_PASSWORD: 'must-not-leak',
      },
      'C:\\isolated-dbt-home'
    );

    expect(environment.APPDATA).toBe('C:\\Users\\service\\AppData\\Roaming');
    expect(environment).not.toHaveProperty('DATABASE_URL');
    expect(environment).not.toHaveProperty('SNOWFLAKE_PASSWORD');
  });
});

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
