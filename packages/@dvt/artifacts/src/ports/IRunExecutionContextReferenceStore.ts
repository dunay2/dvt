import type { RunExecutionContextRef } from '@dvt/contracts';

export interface RunExecutionContextReferenceIdentity {
  readonly tenantId: string;
  readonly runId: string;
}

export interface PutRunExecutionContextReferenceInput extends RunExecutionContextReferenceIdentity {
  readonly ref: RunExecutionContextRef;
}

export interface IRunExecutionContextReferenceStore {
  put(input: PutRunExecutionContextReferenceInput): Promise<void>;
  get(input: RunExecutionContextReferenceIdentity): Promise<RunExecutionContextRef | undefined>;
}
