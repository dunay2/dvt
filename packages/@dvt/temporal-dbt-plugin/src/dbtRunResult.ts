/**
 * @ownedConcern Verify native dbt execution evidence for one admitted manifest resource.
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Inspect only the current invocation's run results before completing its step.
 * @consequence Empty, skipped and mismatched executions cannot masquerade as a successful run.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function assertDbtRunResult(target: string, uniqueId?: string): Promise<void> {
  let artifact: unknown;
  try {
    artifact = JSON.parse(await readFile(join(target, 'run_results.json'), 'utf8'));
  } catch {
    throw new Error('DBT_STEP_RESULT_UNCONFIRMED');
  }
  if (
    !artifact ||
    typeof artifact !== 'object' ||
    !('results' in artifact) ||
    !Array.isArray(artifact.results)
  ) {
    throw new Error('DBT_STEP_RESULT_UNCONFIRMED');
  }
  const resources: unknown[] = artifact.results.filter((entry: unknown) => !isProjectHook(entry));
  if (resources.length === 0 || !resources.every(isAcceptedResource)) {
    throw new Error('DBT_STEP_RESULT_UNCONFIRMED');
  }
  if (uniqueId !== undefined && (resources.length !== 1 || resources[0]?.unique_id !== uniqueId)) {
    throw new Error('DBT_STEP_RESULT_UNCONFIRMED');
  }
}

function isProjectHook(entry: unknown): boolean {
  return isResult(entry) && entry.unique_id.startsWith('operation.') && entry.status === 'success';
}

function isAcceptedResource(entry: unknown): entry is { unique_id: string; status: string } {
  if (!isResult(entry)) return false;
  return (
    entry.status === 'success' ||
    (entry.unique_id.startsWith('test.') && (entry.status === 'pass' || entry.status === 'warn'))
  );
}

function isResult(entry: unknown): entry is { unique_id: string; status: string } {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'unique_id' in entry &&
    typeof entry.unique_id === 'string' &&
    'status' in entry &&
    typeof entry.status === 'string'
  );
}
