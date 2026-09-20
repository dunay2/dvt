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
import type { CanvasRelationalCompositionEdgeMember } from './canvasRelationalCompositionEdgeGroup';

export type CanvasDependencyCompositionPresentation = CanvasRelationalCompositionEdgeMember &
  Readonly<{
    label: string;
    accessibleLabel?: string;
    onActivate?: () => void;
  }>;

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
  composition?: CanvasDependencyCompositionPresentation;
}>;

export function buildCanvasDependencyEdgeData({
  sourceId,
  targetId,
  executionGate,
  canonicalMetadata,
  composition,
}: Readonly<{
  sourceId: string;
  targetId: string;
  executionGate?: WorkspaceGraphAuthoringEdgeExecutionGate;
  canonicalMetadata?: CanonicalEdge['metadata'];
  composition?: CanvasDependencyCompositionPresentation;
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
  const effectiveGateState = readWorkspaceGraphAuthoringEdgeExecutionGate({
    metadata: effectiveMetadata,
  });
  const gateState: CanvasDependencyEdgeData['execution']['gateState'] =
    invalidGate || effectiveGateState === 'invalid' ? 'closed' : effectiveGateState;
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
    ...(composition == null ? {} : { composition }),
  };
}

export function readCanvasDependencyEdgeData(value: unknown): CanvasDependencyEdgeData | undefined {
  if (value == null || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as { [key: string]: unknown };
  const execution = candidate.execution;
  if (execution == null || typeof execution !== 'object') {
    return undefined;
  }

  const executionCandidate = execution as { [key: string]: unknown };
  const unavailableReason = executionCandidate.unavailableReason;
  const composition = candidate.composition;
  const compositionCandidate =
    composition != null && typeof composition === 'object'
      ? (composition as { [key: string]: unknown })
      : null;
  const validCompositionOperation =
    compositionCandidate?.operation == null ||
    compositionCandidate.operation === 'inner_join' ||
    compositionCandidate.operation === 'left_join' ||
    compositionCandidate.operation === 'right_join' ||
    compositionCandidate.operation === 'full_outer_join' ||
    compositionCandidate.operation === 'left_semi_join' ||
    compositionCandidate.operation === 'left_anti_join' ||
    compositionCandidate.operation === 'right_semi_join' ||
    compositionCandidate.operation === 'right_anti_join' ||
    compositionCandidate.operation === 'cross_join' ||
    compositionCandidate.operation === 'union_all' ||
    compositionCandidate.operation === 'union_distinct';
  const validComposition =
    composition == null ||
    (compositionCandidate != null &&
      typeof compositionCandidate.groupId === 'string' &&
      typeof compositionCandidate.label === 'string' &&
      (compositionCandidate.accessibleLabel == null ||
        typeof compositionCandidate.accessibleLabel === 'string') &&
      typeof compositionCandidate.memberCount === 'number' &&
      compositionCandidate.memberCount >= 2 &&
      (compositionCandidate.role === 'branch' || compositionCandidate.role === 'trunk-owner') &&
      (compositionCandidate.state === 'pending' ||
        compositionCandidate.state === 'canonical' ||
        compositionCandidate.state === 'incomplete' ||
        compositionCandidate.state === 'unresolved') &&
      (compositionCandidate.onActivate == null ||
        typeof compositionCandidate.onActivate === 'function') &&
      validCompositionOperation &&
      (compositionCandidate.state !== 'canonical' || compositionCandidate.operation != null));
  const validUnavailableReason =
    unavailableReason == null ||
    unavailableReason === 'structural-execution-disabled' ||
    unavailableReason === 'invalid-gate';
  if (
    candidate.kind !== 'dependency' ||
    typeof candidate.sourceId !== 'string' ||
    typeof candidate.targetId !== 'string' ||
    (executionCandidate.gateState !== 'open' && executionCandidate.gateState !== 'closed') ||
    typeof executionCandidate.isGateable !== 'boolean' ||
    typeof executionCandidate.isEffectivelyExecutable !== 'boolean' ||
    !validUnavailableReason ||
    !validComposition
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
      ...(unavailableReason === 'structural-execution-disabled' ||
      unavailableReason === 'invalid-gate'
        ? { unavailableReason }
        : {}),
    },
    ...(compositionCandidate == null
      ? {}
      : {
          composition: {
            groupId: compositionCandidate.groupId as string,
            label: compositionCandidate.label as string,
            ...(typeof compositionCandidate.accessibleLabel === 'string'
              ? { accessibleLabel: compositionCandidate.accessibleLabel }
              : {}),
            memberCount: compositionCandidate.memberCount as number,
            role: compositionCandidate.role as 'branch' | 'trunk-owner',
            state: compositionCandidate.state as CanvasDependencyCompositionPresentation['state'],
            ...(compositionCandidate.operation === 'inner_join' ||
            compositionCandidate.operation === 'left_join' ||
            compositionCandidate.operation === 'right_join' ||
            compositionCandidate.operation === 'full_outer_join' ||
            compositionCandidate.operation === 'left_semi_join' ||
            compositionCandidate.operation === 'left_anti_join' ||
            compositionCandidate.operation === 'right_semi_join' ||
            compositionCandidate.operation === 'right_anti_join' ||
            compositionCandidate.operation === 'cross_join' ||
            compositionCandidate.operation === 'union_all' ||
            compositionCandidate.operation === 'union_distinct'
              ? { operation: compositionCandidate.operation }
              : {}),
            ...(typeof compositionCandidate.onActivate === 'function'
              ? { onActivate: compositionCandidate.onActivate as () => void }
              : {}),
          },
        }),
  };
}
