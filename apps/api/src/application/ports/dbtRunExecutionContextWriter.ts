import type { RunExecutionContext, RunExecutionContextRef } from '@dvt/contracts';

export type DbtRunExecutionContextWriteResult =
  | Readonly<{ ok: true; ref: RunExecutionContextRef }>
  | Readonly<{ ok: false; reason: 'artifact_store_unavailable' | 'artifact_store_unsupported' }>;

export interface IDbtRunExecutionContextWriter {
  write(input: {
    readonly runId: string;
    readonly context: RunExecutionContext;
  }): Promise<DbtRunExecutionContextWriteResult>;
}
