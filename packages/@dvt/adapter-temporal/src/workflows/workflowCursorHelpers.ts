import type { MaterializationEvidence } from '@dvt/contracts';

export interface WorkflowExecutionCursor {
  nextLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  gatewayDependencyFacts: Record<string, Record<string, unknown>>;
  skippedStepIds: string[];
  processedControlSignalIds: string[];
  latestResultEvidence?: MaterializationEvidence;
}

type ContinueAsNewState = {
  continueAsNewAfterLayerCount: number;
  cursor: WorkflowExecutionCursor;
};

export type ContinueAsNewInput<T extends object> = Omit<T, keyof ContinueAsNewState> &
  ContinueAsNewState;

export function shouldTriggerContinueAsNew(args: {
  continueAsNewAfterLayerCount: number;
  processedLayersInCurrentExecution: number;
  nextLayerIndex: number;
  totalLayerCount: number;
}): boolean {
  if (args.continueAsNewAfterLayerCount <= 0) {
    return false;
  }

  if (args.processedLayersInCurrentExecution < args.continueAsNewAfterLayerCount) {
    return false;
  }

  if (args.nextLayerIndex >= args.totalLayerCount) {
    return false;
  }

  return true;
}

export function buildContinueAsNewInput<T extends object>(args: {
  input: T;
  maxContinueAsNewPayloadBytes: number;
  continueAsNewAfterLayerCount: number;
  nextLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  gatewayDependencyFacts: Record<string, Record<string, unknown>>;
  skippedStepIds: ReadonlySet<string>;
  processedControlSignalIds: ReadonlySet<string>;
  latestResultEvidence?: MaterializationEvidence;
}): ContinueAsNewInput<T> {
  const nextInput: ContinueAsNewInput<T> = {
    ...args.input,
    continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
    cursor: {
      nextLayerIndex: args.nextLayerIndex,
      continuedAsNewCount: args.continuedAsNewCount + 1,
      gatewayDecisions: { ...args.gatewayDecisions },
      gatewayDependencyFacts: cloneStepResults(args.gatewayDependencyFacts),
      skippedStepIds: [...args.skippedStepIds],
      processedControlSignalIds: [...args.processedControlSignalIds],
      ...(args.latestResultEvidence === undefined
        ? {}
        : { latestResultEvidence: args.latestResultEvidence }),
    },
  };

  assertContinueAsNewPayloadWithinLimit(nextInput, args.maxContinueAsNewPayloadBytes);
  return nextInput;
}

function cloneStepResults(
  value: Record<string, Record<string, unknown>> | undefined
): Record<string, Record<string, unknown>> {
  if (!value) {
    return {};
  }

  const cloned: Record<string, Record<string, unknown>> = {};
  for (const [stepId, result] of Object.entries(value)) {
    cloned[stepId] = { ...result };
  }
  return cloned;
}

function assertContinueAsNewPayloadWithinLimit(nextInput: object, maxBytes: number): void {
  const serializedSizeBytes = new globalThis.TextEncoder().encode(
    JSON.stringify([nextInput])
  ).length;
  if (serializedSizeBytes > maxBytes) {
    throw new Error(
      `TEMPORAL_CONTINUE_AS_NEW_PAYLOAD_TOO_LARGE: sizeBytes=${serializedSizeBytes} maxBytes=${maxBytes}`
    );
  }
}
