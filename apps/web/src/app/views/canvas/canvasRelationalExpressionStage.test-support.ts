/**
 * Owned concern: construct real canonical Transform fixtures for card projection proofs.
 * @baseline ADR-0064: explicit ownership distinguishes grouped stages from adjacent transforms.
 * @decision Reuse production authoring commands and vary only declared fixture identities.
 * @consequence Card tests inspect complete canonical documents rather than a parallel graph model.
 * @version 1.0.0
 */
import { clone, create } from '@bufbuild/protobuf';
import { RelCommon_EmitSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDvtSubstraitProjectionOutput } from './canvasLegacyProjectionOutput.test-support';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  projectCanvasRelationalTree,
  type CanvasRelationalTreeProjection,
} from './canvasRelationalTreeProjection';

const source: CanonicalNode = {
  id: 'customers',
  name: 'Customers',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'public',
    tableName: 'customers',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'public.customers',
    },
    columns: [
      { name: 'customer_code', type: 'text' },
      { name: 'country', type: 'text' },
    ],
  },
};

const edge: CanonicalEdge = {
  id: 'customers-transform',
  sourceId: source.id,
  targetId: 'transform-customers',
  relation: 'lineage',
};

export function expressionStageDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'public',
      table: 'customers',
      sourceRef: source.metadata?.connectedSourceRef as never,
      fields: [
        { name: 'customer_code', dataType: 'text' },
        { name: 'country', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-customers',
    outputs: [
      {
        fieldId: 'output:customer_code',
        name: 'customer_code',
        sourceFieldName: 'customer_code',
      },
      { fieldId: 'output:country', name: 'country', sourceFieldName: 'country' },
    ],
  });
}

export function withScalarOutput(
  draft: DvtSubstraitProjectionDraft = expressionStageDraft()
): DvtSubstraitProjectionDraft {
  const upper = resolveDvtSubstraitColumnFunctions({
    dataType: 'text',
    provider: 'postgres',
  }).find((candidate) => candidate.name === 'upper');
  if (upper == null) throw new Error('Expected admitted UPPER capability.');
  const result = createDvtSubstraitProjectionOutput(
    draft,
    {
      alias: 'customer_code_norm',
      expression: {
        kind: 'scalar-function',
        operandFieldIds: ['output:customer_code'],
        capabilityId: upper.capabilityId,
      },
    },
    { inputDataTypes: ['text'], provider: 'postgres' }
  );
  if (result.outcome !== 'applied') throw new Error(result.reason);
  return result.draft;
}

export function withWindowOutput(
  draft: DvtSubstraitProjectionDraft = expressionStageDraft()
): DvtSubstraitProjectionDraft {
  const result = createDvtSubstraitProjectionOutput(draft, {
    alias: 'customer_position',
    expression: { kind: 'row-number', orderFieldId: 'output:customer_code' },
  });
  if (result.outcome !== 'applied') throw new Error(result.reason);
  return result.draft;
}

export function withoutLastOutput(draft: DvtSubstraitProjectionDraft): DvtSubstraitProjectionDraft {
  const plan = clone(PlanSchema, draft.plan);
  const root = plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : null;
  const emit = project?.case === 'project' ? project.value.common?.emitKind : null;
  if (root?.case !== 'root' || project?.case !== 'project' || project.value.common == null)
    throw new Error('Expected emitted ProjectRel.');
  const mapping =
    emit?.case === 'emit'
      ? emit.value.outputMapping
      : Array.from({ length: root.value.names.length }, (_, ordinal) => ordinal);
  project.value.common.emitKind = {
    case: 'emit',
    value: create(RelCommon_EmitSchema, { outputMapping: mapping.slice(0, -1) }),
  };
  root.value.names.pop();
  return {
    plan,
    sidecar: { ...draft.sidecar, fields: draft.sidecar.fields.slice(0, -1) },
  };
}

export async function withPublicExpressionStage(
  draft: DvtSubstraitProjectionDraft,
  grouped: boolean
): Promise<DvtSubstraitProjectionDraft> {
  const indexed = indexSubstraitRelations(draft);
  if (!indexed.ok) throw indexed.error;
  const configured = await configureCanvasStagedTransform(
    { id: 'public-transform', operation: 'field_transform', inputs: [indexed.index.rootId] },
    draft
  );
  const document = decodeCanvasStagedOperation(configured);
  if (document == null) throw new Error('Expected configured public Transform.');
  return {
    ...document,
    sidecar: {
      ...document.sidecar,
      relations: document.sidecar.relations.map((binding) =>
        grouped && binding.relationId === indexed.index.rootId
          ? { ...binding, authoringOwnerRelationId: configured.id }
          : binding
      ),
    },
  };
}

export function projectExpressionStage(draft: DvtSubstraitProjectionDraft): Readonly<{
  node: CanonicalNode;
  projection: CanvasRelationalTreeProjection;
}> {
  const node = applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-customers',
      name: 'Customer normalization',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
  const result = projectCanvasRelationalTree({ node, nodes: [source, node], edges: [edge] });
  if (!result.ok) throw new Error(`Projection failed: ${result.failure.code}`);
  return { node, projection: result.projection };
}
