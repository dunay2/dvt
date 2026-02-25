export interface AppendResultLike {
  appended: unknown[];
  deduped: unknown[];
}

export type RunEventInputLike = Record<string, unknown>;
export type RunMetadataLike = Record<string, unknown>;

export interface RunBootstrapCommand {
  metadata: RunMetadataLike;
  firstEvents: RunEventInputLike[];
}

/**
 * Write-side boundary for run lifecycle persistence.
 *
 * Adapters submit canonical transitions through this port instead of
 * depending directly on concrete infrastructure state stores.
 */
export interface RunStateCommandPort {
  bootstrapRun(input: RunBootstrapCommand): Promise<AppendResultLike>;
  appendTransitions(runId: string, events: RunEventInputLike[]): Promise<AppendResultLike>;
}
