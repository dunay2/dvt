// @vitest-environment node
/**
 * Owned concern: isolate CLI execution and invocation environment in routing tests.
 * @reason GH-3765 separates proof contracts without weakening their existing assertions.
 * @consequence The existing architecture entry registers every family in one isolated runtime.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync } from 'node:fs';
import { vi } from 'vitest';
export function resetBrowserRoutingDoubles(): void {
  if (![spawnSync, existsSync, appendFileSync].every(vi.isMockFunction)) {
    throw new Error('Browser routing proof requires isolated process and filesystem doubles.');
  }
  vi.mocked(existsSync).mockReset();
  vi.mocked(appendFileSync).mockReset();
  vi.mocked(spawnSync).mockReset().mockReturnValue({
    status: 0,
    signal: null,
    pid: 1,
    output: [],
    stdout: '',
    stderr: '',
  });
  vi.stubEnv('CI', '');
  vi.stubEnv('DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME', 'docker');
}

export function restoreBrowserRoutingDoubles(): void {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
}
