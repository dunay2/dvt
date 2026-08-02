/** Owned concern: address run-context artifacts without exposing caller run IDs as path segments. */
import { createHash } from 'node:crypto';
import path from 'node:path';

export function resolveRunExecutionContextArtifactPath(input: {
  readonly rootPath: string;
  readonly tenantId: string;
  readonly runId: string;
}): string {
  const runKey = createHash('sha256').update(input.runId, 'utf8').digest('hex');
  return path.resolve(input.rootPath, 'run-contexts', input.tenantId, `${runKey}.json`);
}
