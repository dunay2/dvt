import { EXECUTE_PYTHON_CODE_STEP_KIND } from '@dvt/contracts/python-code';
import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import { createTemporalWorkerPythonProfile } from '../../src/runtime/temporalWorkerPythonProfile.js';

vi.mock('@temporalio/activity', () => ({
  Context: { current: () => ({ cancellationSignal: undefined }) },
}));

const BASE = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'default',
  TEMPORAL_TASK_QUEUE: 'dvt-temporal',
} as const;

describe('createTemporalWorkerPythonProfile', () => {
  it('does not instantiate a runtime while the profile is disabled', () => {
    const pythonRuntimeFactory = vi.fn();
    const profile = createTemporalWorkerPythonProfile(loadEnv(BASE), { pythonRuntimeFactory });

    expect(profile.pluginProfile).toBeUndefined();
    expect(pythonRuntimeFactory).not.toHaveBeenCalled();
  });

  it('composes only the Python activity from an opaque allowlisted binding', () => {
    const executable = process.platform === 'win32' ? 'C:\\Python313\\python.exe' : '/usr/bin/python3';
    const pythonRuntimeFactory = vi.fn(() => ({ execute: vi.fn() }));
    const profile = createTemporalWorkerPythonProfile(
      loadEnv({
        ...BASE,
        DVT_TEMPORAL_PYTHON_ENABLED: 'true',
        DVT_PYTHON_ISOLATED_WORKER_ACKNOWLEDGED: 'true',
        DVT_PYTHON_RUNTIMES: JSON.stringify({
          'python-runtime:cpython-test': executable,
        }),
      }),
      { pythonRuntimeFactory }
    );

    expect(pythonRuntimeFactory).toHaveBeenCalledOnce();
    expect([...profile.pluginProfile!.stepActivitiesByKind.keys()]).toEqual([
      EXECUTE_PYTHON_CODE_STEP_KIND,
    ]);
  });
});
