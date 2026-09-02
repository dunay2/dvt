/**
 * Owned concern: project canonical edge execution truth into a typed Canvas read model.
 *
 * @baseline ADR-0000: Code Generation With Enforced Normative Traceability
 * @decision Project shared edge execution semantics once for renderer and context-menu consumers.
 */
import {
  isWorkspaceGraphAuthoringEdgeEffectivelyExecutable,
  readWorkspaceGraphAuthoringEdgeExecutionGate,
  withWorkspaceGraphAuthoringEdgeExecutionGate,
  type WorkspaceGraphAuthoringEdgeExecutionGate,
} from '@dvt/contracts';

import type { CanonicalEdge } from '../../types/canonical';

export type CanvasDependencyEdgeData = Readonly<{
  kind: 'dependency';
  sourceId: string;
  targetId: string;
  execution: Readonly<{
    gateState: 'open' | 'closed';
    isGateable: boolean;
    isEffectivelyExecutable: boolean;
    unavailableReason?: 'structural-execution-disabled' | 'invalid-gate';
  }>;
}>;

export function buildCanvasDependencyEdgeData({
  sourceId,
  targetId,
  executionGate,
  canonicalMetadata,
}: Readonly<{
  sourceId: string;
  targetId: string;
  executionGate?: WorkspaceGraphAuthoringEdgeExecutionGate;
  canonicalMetadata?: CanonicalEdge['metadata'];
}>): CanvasDependencyEdgeData {
  const persistedGateState = readWorkspaceGraphAuthoringEdgeExecutionGate({
    metadata: canonicalMetadata,
  });
  const invalidGate = persistedGateState === 'invalid';
  const structurallyDisabled = canonicalMetadata?.executionDependency === false;
  const effectiveMetadata = invalidGate
    ? canonicalMetadata
    : withWorkspaceGraphAuthoringEdgeExecutionGate(
        canonicalMetadata,
        executionGate === 'closed' ? 'closed' : 'open'
      );
  const gateState = invalidGate
    ? 'closed'
    : readWorkspaceGraphAuthoringEdgeExecutionGate({ metadata: effectiveMetadata });
  const unavailableReason: CanvasDependencyEdgeData['execution']['unavailableReason'] = invalidGate
    ? 'invalid-gate'
    : structurallyDisabled
      ? 'structural-execution-disabled'
      : undefined;

  return {
    kind: 'dependency',
    sourceId,
    targetId,
    execution: {
      gateState,
      isGateable: unavailableReason == null,
      isEffectivelyExecutable:
        unavailableReason == null &&
        isWorkspaceGraphAuthoringEdgeEffectivelyExecutable({ metadata: effectiveMetadata }),
      ...(unavailableReason == null ? {} : { unavailableReason }),
    },
  };
}

export function readCanvasDependencyEdgeData(value: unknown): CanvasDependencyEdgeData | undefined {
  if (value == null || typeof value !== 'object') {
    return undefined;
  }

  const candidate: { [key: string]: unknown } = value;
  const execution = candidate.execution;
  if (execution == null || typeof execution !== 'object') {
    return undefined;
  }

  const executionCandidate: { [key: string]: unknown } = execution;
  const validUnavailableReason =
    executionCandidate.unavailableReason == null ||
    executionCandidate.unavailableReason === 'structural-execution-disabled' ||
    executionCandidate.unavailableReason === 'invalid-gate';
  if (
    candidate.kind !== 'dependency' ||
    typeof candidate.sourceId !== 'string' ||
    typeof candidate.targetId !== 'string' ||
    (executionCandidate.gateState !== 'open' && executionCandidate.gateState !== 'closed') ||
    typeof executionCandidate.isGateable !== 'boolean' ||
    typeof executionCandidate.isEffectivelyExecutable !== 'boolean' ||
    !validUnavailableReason
  ) {
    return undefined;
  }

  return {
    kind: 'dependency',
    sourceId: candidate.sourceId,
    targetId: candidate.targetId,
    execution: {
      gateState: executionCandidate.gateState,
      isGateable: executionCandidate.isGateable,
      isEffectivelyExecutable: executionCandidate.isEffectivelyExecutable,
      ...(executionCandidate.unavailableReason == null
        ? {}
        : { unavailableReason: executionCandidate.unavailableReason }),
    },
  };
}
