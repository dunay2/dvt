import type { GraphNode, PlannerInputEnvelopeV1 as DomainEnvelope } from '../domain/types.js';

type ExecutionPlan = import('@dvt/contracts').ExecutionPlan;
type GenericGraphSourceV1 = import('@dvt/contracts').GenericGraphSourceV1SchemaT;
type PlannerInputEnvelopeV1SchemaT = import('@dvt/contracts').PlannerInputEnvelopeV1SchemaT;
type PlannerSelection = import('@dvt/contracts').PlannerSelection;

export class PlannerEnvelopeMapper {
  toDomainBaseInput(input: PlannerInputEnvelopeV1SchemaT): Omit<DomainEnvelope, 'graphSource'> {
    const domainInput: Omit<DomainEnvelope, 'graphSource'> = {
      selection: this.toPlannerSelection(input.selection),
    };

    if (input.policies !== undefined) domainInput.policies = input.policies;
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

  private toObservability(
    observability: NonNullable<PlannerInputEnvelopeV1SchemaT['observability']>
  ): NonNullable<ExecutionPlan['observability']> {
    const normalizedObservability: NonNullable<ExecutionPlan['observability']> = {};

    for (const [key, value] of Object.entries(observability)) {
      if (key === 'tags' || key === 'extra' || value === undefined) continue;
      normalizedObservability[key] = value;
    }

    if (observability.tags !== undefined) normalizedObservability.tags = observability.tags;
    if (observability.extra !== undefined) normalizedObservability.extra = observability.extra;

    return normalizedObservability;
  }
}
