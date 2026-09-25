import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { filterProjectionInputFixture } from './canvasFilterProjection.test-support';
import { create } from '@bufbuild/protobuf';
import {
  RelCommonSchema,
  RelSchema,
  SortRelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { resolveDvtSubstraitFilterCapabilities } from './canvasFilterCapabilities';

import { projectionScenario } from './canvasProjectionScenario.test-support';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { projectCanvasRelationalTree } from './canvasRelationalTreeProjection';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';
import { applyDvtSubstraitFetch, applyDvtSubstraitSort } from './canvasSortFetch.test-support';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

const TARGET_ID = 'transform-orders';

function targetNode(): CanonicalNode {
  return {
    id: TARGET_ID,
    name: 'Orders',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

const orders: CanonicalNode = {
  id: 'orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'public',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-main',
        provider: 'postgres',
      },
      sourceObjectId: 'public.orders',
    },
    columns: [
      { name: 'order_id', type: 'string' },
      { name: 'customer', type: 'string' },
    ],
  },
};

describe('ProjectCanvasRelationalTree admitted shapes', () => {
  it('preserves ProjectRel and FilterRel while delegating the scalar tree', async () => {
    const resolved = resolveDvtSubstraitProjectionSource(orders);
    if (resolved == null) throw new Error('Expected an admitted projection source.');
    const base = createDvtSubstraitProjectionDraft({
      source: resolved,
      targetNodeId: TARGET_ID,
      outputs: resolved.fields.map((field) => ({
        fieldId: `output:${field.name}`,
        name: field.name,
        sourceFieldName: field.name,
      })),
    });
    const capability = resolveDvtSubstraitFilterCapabilities({ dataType: 'string' })[0];
    if (capability == null) throw new Error('Expected filter authority.');
    const filtered = await filterProjectionInputFixture(base, {
      fieldId: 'output:customer',
      dataType: 'string',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitSemanticDocument(filtered)
    );
    const result = projectCanvasRelationalTree({
      node: transform,
      nodes: [orders, transform],
      edges: [{ sourceId: orders.id, targetId: transform.id }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projection.root.operator).toBe('project');
    expect(result.projection.root.children[0]?.node).toMatchObject({
      operator: 'filter',
      expressionRefs: [{ slot: 'filter-condition', ordinal: 0 }],
    });
    expect(result.projection.root.children[0]?.node.children[0]?.node.operator).toBe('read');
  });

  it('reports the current window decoration without copying its scalar tree', async () => {
    const pilot = projectionScenario({
      sourceNodeId: 'customers',
      targetNodeId: TARGET_ID,
    });
    const { index } = deriveSubstraitSchemas(pilot);
    const outputs = index.relations.get(index.rootId)!.fields;
    const session = new CanvasRelationAnalysisSession(TARGET_ID);
    session.receive(pilot);
    const windowed = await applySelectedRelationWindow(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      intent: 'insert',
      fieldId: outputs[1]!.fieldId,
      alias: 'row_number',
    });
    session.dispose();
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitSemanticDocument(windowed)
    );
    const result = projectCanvasRelationalTree({ node: transform, nodes: [transform], edges: [] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projection.root).toMatchObject({
      operator: 'project',
      decorations: [{ kind: 'window', count: 1 }],
      children: [{ role: 'input', node: { operator: 'project' } }],
    });
    expect(result.projection.output.fields).toHaveLength(4);
  });

  it('keeps a valid unrendered relation bounded and inspectable', () => {
    const pilot = projectionScenario({
      sourceNodeId: 'customers',
      targetNodeId: TARGET_ID,
    });
    const root = pilot.plan.relations[0]?.relType;
    if (root?.case !== 'root' || root.value.input == null) {
      throw new Error('Expected the admitted pilot root.');
    }
    const relationId = 'relation:unsupported-sort';
    const unsupported = {
      plan: pilot.plan,
      sidecar: {
        ...pilot.sidecar,
        relations: [...pilot.sidecar.relations, { relationId, relAnchor: 3, displayName: 'sort' }],
      },
    };
    root.value.input = create(RelSchema, {
      relType: {
        case: 'sort',
        value: create(SortRelSchema, {
          common: create(RelCommonSchema, { relAnchor: 3 }),
          input: root.value.input,
        }),
      },
    });
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitSemanticDocument(unsupported)
    );
    const result = projectCanvasRelationalTree({ node: transform, nodes: [transform], edges: [] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projection.root).toMatchObject({
      operator: 'unsupported',
      substraitKind: 'sort',
      relationId,
      children: [],
    });
  });

  it('projects a valid Fetch(Sort(Project(Read))) as visible semantic cards', () => {
    const pilot = projectionScenario({
      sourceNodeId: 'customers',
      targetNodeId: TARGET_ID,
    });
    const { index } = deriveSubstraitSchemas(pilot);
    const outputs = index.relations.get(index.rootId)!.fields;
    const sorted = applyDvtSubstraitSort(pilot, [
      {
        fieldId: outputs[1]!.fieldId,
        direction: SortField_SortDirection.DESC_NULLS_LAST,
      },
      {
        fieldId: outputs[0]!.fieldId,
        direction: SortField_SortDirection.ASC_NULLS_FIRST,
      },
    ]);
    const fetched = applyDvtSubstraitFetch(sorted, { offset: 2n, count: 3n });
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitSemanticDocument(fetched)
    );

    const result = projectCanvasRelationalTree({ node: transform, nodes: [transform], edges: [] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projection.root).toMatchObject({
      operator: 'fetch',
      displayName: 'LIMIT 3 · OFFSET 2',
      children: [
        {
          role: 'input',
          node: {
            operator: 'sort',
            displayName: 'email DESC NULLS LAST · name ASC NULLS FIRST',
            expressionRefs: [
              { slot: 'sort-key', ordinal: 0 },
              { slot: 'sort-key', ordinal: 1 },
            ],
          },
        },
      ],
    });
    expect(result.projection.root.children[0]?.node.children[0]?.node.operator).toBe('project');
  });
});
