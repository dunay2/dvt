import type { TemporalStepPluginProfile } from '@dvt/adapter-temporal';
import {
  createPythonCodePluginProfile,
  PythonCodePluginRunner,
  type PythonRuntimePort,
} from '@dvt/temporal-python-plugin';
import { Context } from '@temporalio/activity';

import type { Env } from '../plugins/env.js';

import { EphemeralPythonProcessRuntime } from './EphemeralPythonProcessRuntime.js';
import type { CreateTemporalWorkerRuntimeOptions } from './runtimeTypes.js';

export interface TemporalWorkerPythonProfile {
  readonly pluginProfile?: TemporalStepPluginProfile;
}

export function createTemporalWorkerPythonProfile(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions
): TemporalWorkerPythonProfile {
  if (!env.DVT_TEMPORAL_PYTHON_ENABLED) return {};

  const runtimes = parsePythonRuntimeBindings(env.DVT_PYTHON_RUNTIMES);
  const runtime: PythonRuntimePort =
    options.pythonRuntimeFactory?.(env) ??
    new EphemeralPythonProcessRuntime({
      runtimes,
      workdirRoot: env.DVT_PYTHON_WORKDIR_ROOT,
    });
  const runner = new PythonCodePluginRunner({
    runtime,
    allowedRuntimeRefs: new Set(runtimes.keys()),
    getCancellationSignal: () => Context.current().cancellationSignal,
  });
  return { pluginProfile: createPythonCodePluginProfile(runner) };
}

export function parsePythonRuntimeBindings(
  value: string | undefined
): ReadonlyMap<string, string> {
  if (value === undefined) {
    throw new Error('DVT_PYTHON_RUNTIMES is required for the Python worker profile.');
  }
  const parsed = JSON.parse(value) as Record<string, string>;
  return new Map(Object.entries(parsed));
}
