import { PlannerError, PlannerErrorCode } from '../domain/errors.js';
import type { PlannerInputEnvelopeV1 as DomainEnvelope } from '../domain/types.js';

import {
  mapDbtStepKindToResourceType,
  type StepKindResourceTypeMapper,
} from './StepKindResourceTypeMapper.js';

type DbtManifestRef = import('@dvt/contracts').DbtManifestRef;
type ExecutionPlan = import('@dvt/contracts').ExecutionPlan;
type GenericGraphSourceV1 = import('@dvt/contracts').GenericGraphSourceV1SchemaT;
type PlannerInputEnvelopeV1SchemaT = import('@dvt/contracts').PlannerInputEnvelopeV1SchemaT;
type PlannerSelection = import('@dvt/contracts').PlannerSelection;
type GraphNode = import('@dvt/contracts').GraphNode;

export class PlannerEnvelopeMapper {
  constructor(
    private readonly stepKindToResourceType: StepKindResourceTypeMapper = mapDbtStepKindToResourceType
  ) {}

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

  toManifestRef(
    manifestRef: NonNullable<PlannerInputEnvelopeV1SchemaT['manifestRef']>
  ): DbtManifestRef {
    const normalizedManifestRef: DbtManifestRef = {
      uri: manifestRef.uri,
      sha256: manifestRef.sha256,
    };

    if (manifestRef.artifactId !== undefined) {
      normalizedManifestRef.artifactId = manifestRef.artifactId;
    }

    return normalizedManifestRef;
  }

  toInternalGraphSource(graphSource: GenericGraphSourceV1): { nodes: readonly GraphNode[] } {
    return {
      nodes: graphSource.nodes.map((node) => ({
        nodeId: node.nodeId,
        resourceType: this.toResourceType(node.stepKind),
        dependsOn: node.dependsOn,
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

  private toResourceType(stepKind: string): string {
    try {
      return this.stepKindToResourceType(stepKind);
    } catch (error) {
      if (error instanceof PlannerError) throw error;
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `stepKind to resourceType mapping failed for stepKind "${stepKind}".`,
        error
      );
    }
  }
}
