/** Owned concern: resolve the workspace file root consistently across protected route groups. */
import type { Env } from '../../plugins/env.js';

export function resolveWorkspaceFilesRoot(env: Env): string {
  return env.DVT_WORKSPACE_FILES_ROOT ?? env.DVT_DBT_BUNDLE_FILE_ROOT ?? process.cwd();
}
