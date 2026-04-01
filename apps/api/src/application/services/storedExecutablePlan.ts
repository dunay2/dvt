import { parseExecutionPlan, type ExecutionPlan } from '@dvt/contracts';

export function parseStoredExecutablePlan(bytes: Uint8Array): ExecutionPlan {
  try {
    return parseExecutionPlan(JSON.parse(Buffer.from(bytes).toString('utf8')));
  } catch {
    throw new Error('INVALID_EXECUTABLE_PLAN');
  }
}
