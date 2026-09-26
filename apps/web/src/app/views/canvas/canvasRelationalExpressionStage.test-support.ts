import { clone } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
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
  if (root?.case !== 'root' || emit?.case !== 'emit')
    throw new Error('Expected emitted ProjectRel.');
  emit.value.outputMapping.pop();
  root.value.names.pop();
  return {
    plan,
    sidecar: { ...draft.sidecar, fields: draft.sidecar.fields.slice(0, -1) },
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
