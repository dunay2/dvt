import type { RunExecutionContext, RunExecutionContextRef } from '@dvt/contracts';

export type RunExecutionContextWriteResult =
  | Readonly<{ ok: true; ref: RunExecutionContextRef }>
  | Readonly<{ ok: false; reason: 'artifact_store_unavailable' }>;

export interface IRunExecutionContextWriter {
  write(input: {
    readonly runId: string;
    readonly context: RunExecutionContext;
  }): Promise<RunExecutionContextWriteResult>;
}
