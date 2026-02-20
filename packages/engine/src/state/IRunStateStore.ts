import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
} from '../contracts/runEvents.js';

export interface RunBootstrapInput {
  metadata: RunMetadata;
  firstEvents: RunEventInput[];
}

export interface IRunStateStore {
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: RunEventInput[]): Promise<AppendResult>;

  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
  saveProviderRef(
    runId: string,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void>;
  listEvents(runId: string): Promise<RunEventPersisted[]>;
}
