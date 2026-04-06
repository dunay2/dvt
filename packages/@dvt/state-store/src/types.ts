import type { AppendResult, EventInput, RunBootstrapInput, RunStateCommandPort } from '@dvt/engine';

export type { RunStateCommandPort };

export type AppendResultLike = AppendResult;
export type RunEventInputLike = EventInput;
export type RunMetadataLike = RunBootstrapInput['metadata'];
export type RunBootstrapCommand = RunBootstrapInput;
