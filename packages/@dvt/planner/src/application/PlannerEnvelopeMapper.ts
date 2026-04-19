import type { GraphNode, PlannerInputEnvelopeV1 as DomainEnvelope } from '../domain/types.js';

type ExecutionPlan = import('@dvt/contracts').ExecutionPlan;
type GenericGraphSourceV1 = import('@dvt/contracts').GenericGraphSourceV1SchemaT;
type PlannerInputEnvelopeV1SchemaT = import('@dvt/contracts').PlannerInputEnvelopeV1SchemaT;
type PlannerSelection = import('@dvt/contracts').PlannerSelection;

type ExecutionPlanObservability = NonNullable<ExecutionPlan['observability']>;
type PlannerObservabilityInput = NonNullable<PlannerInputEnvelopeV1SchemaT['observability']>;

const RESERVED_OBSERVABILITY_FIELDS = new Set(['tags', 'extra']);

export class PlannerEnvelopeMapper {
  toDomainBaseInput(input: PlannerInputEnvelopeV1SchemaT): Omit<DomainEnvelope, 'graphSource'> {
    const domainInput: Omit<DomainEnvelope, 'graphSource'> = {
      selection: this.toPlannerSelection(input.selection),
    };

    if (input.policies !== undefined) domainInput.policies = input.policies;
    if (input.ownership !== undefined) domainInput.ownership = input.ownership;
    if (input.observability !== undefined) {
      domainInput.observability = this.toObservability(input.observability);
    }
    if (input.requestedBy !== undefined) domainInput.requestedBy = input.requestedBy;
    if (input.requestId !== undefined) domainInput.requestId = input.requestId;
    if (input.requestedAtIso !== undefined) domainInput.requestedAtIso = input.requestedAtIso;

    return domainInput;
  }

  toInternalGraphSource(graphSource: GenericGraphSourceV1): { nodes: readonly GraphNode[] } {
    return {
      nodes: graphSource.nodes.map((node) => ({
        nodeId: node.nodeId,
        stepKind: node.stepKind,
        dependsOn: node.dependsOn,
        ...(node.stepTypeConfig === undefined ? {} : { stepTypeConfig: node.stepTypeConfig }),
        ...(node.metadata === undefined
          ? {}
          : {
              metadata: {
                ...(node.metadata.displayName === undefined
                  ? {}
                  : { displayName: node.metadata.displayName }),
                ...(node.metadata.sourceRef === undefined
                  ? {}
                  : { sourceRef: node.metadata.sourceRef }),
                ...(node.metadata.tags === undefined ? {} : { tags: node.metadata.tags }),
              },
            }),
      })),
    };
  }

  private toPlannerSelection(
    selection: PlannerInputEnvelopeV1SchemaT['selection']
  ): PlannerSelection {
    const normalizedSelection: PlannerSelection = {
      selectedNodeIds: selection.selectedNodeIds,
    };

    if (selection.includeUpstream !== undefined) {
      normalizedSelection.includeUpstream = selection.includeUpstream;
    }
    if (selection.includeDownstream !== undefined) {
      normalizedSelection.includeDownstream = selection.includeDownstream;
    }

    return normalizedSelection;
  }

  private toObservability(observability: PlannerObservabilityInput): ExecutionPlanObservability {
    const normalizedObservability: ExecutionPlanObservability = {};

    for (const [key, value] of Object.entries(observability)) {
      if (!shouldCopyObservabilityEntry(key, value)) continue;
      normalizedObservability[key] = value;
    }

    assignDefinedObservabilityField(normalizedObservability, 'tags', observability.tags);
    assignDefinedObservabilityField(normalizedObservability, 'extra', observability.extra);

    return normalizedObservability;
  }
}

function shouldCopyObservabilityEntry(key: string, value: unknown): boolean {
  if (value === undefined) {
    return false;
  }

  return !RESERVED_OBSERVABILITY_FIELDS.has(key);
}

function assignDefinedObservabilityField<TKey extends keyof ExecutionPlanObservability>(
  target: ExecutionPlanObservability,
  key: TKey,
  value: ExecutionPlanObservability[TKey] | undefined
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}
