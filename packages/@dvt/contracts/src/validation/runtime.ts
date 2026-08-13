import {
  DbtPluginContextSchema,
  type DbtPluginContextSchemaT,
} from '../contracts/engine/RunExecutionContext.v1.js';
import type { StartRunCommand } from '../contracts/engine/StartRunBoundary.v1.js';
import {
  CanonicalRunStatusSchema,
  type CanonicalRunStatusSchemaT,
  EngineRunRefSchema,
  type EngineRunRefSchemaT,
  ProviderRunStatusViewSchema,
  type ProviderRunStatusViewSchemaT,
  RecoverRunCommandSchema,
  type RecoverRunCommandSchemaT,
  ResolvedRunContextSchema,
  type ResolvedRunContextSchemaT,
  RunContextSchema,
  type RunContextSchemaT,
  RunExecutionContextRefSchema,
  type RunExecutionContextRefSchemaT,
  RunExecutionContextSchema,
  type RunExecutionContextSchemaT,
  RunExecutionPolicySchema,
  type RunExecutionPolicySchemaT,
  RunSnapshotSchema,
  type RunSnapshotSchemaT,
  RunStatusEnrichmentSchema,
  type RunStatusEnrichmentSchemaT,
  SignalRequestSchema,
  type SignalRequestSchemaT,
  StartRunCommandSchema,
  StartRunResultSchema,
  type StartRunResultSchemaT,
  StepOutputSchema,
  type StepOutputSchemaT,
  StepSnapshotSchema,
  type StepSnapshotSchemaT,
} from '../schemas.js';

import { parseWithSchema } from './core.js';

export function parseStartRunCommand(input: unknown): StartRunCommand {
  return parseWithSchema(StartRunCommandSchema, input) as StartRunCommand;
}

export function parseStartRunResult(input: unknown): StartRunResultSchemaT {
  return parseWithSchema(StartRunResultSchema, input);
}

export function parseRunExecutionPolicy(input: unknown): RunExecutionPolicySchemaT {
  return parseWithSchema(RunExecutionPolicySchema, input);
}

export function parseRunExecutionContextRef(input: unknown): RunExecutionContextRefSchemaT {
  return parseWithSchema(RunExecutionContextRefSchema, input);
}

export function parseRunExecutionContext(input: unknown): RunExecutionContextSchemaT {
  return parseWithSchema(RunExecutionContextSchema, input);
}

export function parseDbtPluginContext(input: unknown): DbtPluginContextSchemaT {
  return parseWithSchema(DbtPluginContextSchema, input);
}

export function parseRunContext(input: unknown): RunContextSchemaT {
  return parseWithSchema(RunContextSchema, input);
}

export function parseResolvedRunContext(input: unknown): ResolvedRunContextSchemaT {
  return parseWithSchema(ResolvedRunContextSchema, input);
}

export function parseSignalRequest(input: unknown): SignalRequestSchemaT {
  return parseWithSchema(SignalRequestSchema, input);
}

export function parseRecoverRunCommand(input: unknown): RecoverRunCommandSchemaT {
  return parseWithSchema(RecoverRunCommandSchema, input);
}

export function parseEngineRunRef(input: unknown): EngineRunRefSchemaT {
  return parseWithSchema(EngineRunRefSchema, input);
}

export function parseCanonicalRunStatus(input: unknown): CanonicalRunStatusSchemaT {
  return parseWithSchema(CanonicalRunStatusSchema, input);
}

export function parseProviderRunStatusView(input: unknown): ProviderRunStatusViewSchemaT {
  return parseWithSchema(ProviderRunStatusViewSchema, input);
}

export function parseRunStatusEnrichment(input: unknown): RunStatusEnrichmentSchemaT {
  return parseWithSchema(RunStatusEnrichmentSchema, input);
}

export function parseStepOutput(input: unknown): StepOutputSchemaT {
  return parseWithSchema(StepOutputSchema, input);
}

export function parseStepSnapshot(input: unknown): StepSnapshotSchemaT {
  return parseWithSchema(StepSnapshotSchema, input);
}

export function parseRunSnapshot(input: unknown): RunSnapshotSchemaT {
  return parseWithSchema(RunSnapshotSchema, input);
}
