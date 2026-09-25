import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import { transformNode } from './CanvasRelationalTreeWorkbench.test-support';
import type { CanonicalNode } from '../../types/canonical';

describe('explicit SQL projection of composed inputs', () => {
  it.each([0, 1])(
    'projects a filter on operand %s and rejects stale physical binding',
    async (operand) => {
      const sources: CanonicalNode[] = ['orders', 'customers'].map((table, ordinal) => ({
        id: table,
        name: table,
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: {
          schema: 'raw',
          tableName: table,
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            sourceObjectId: table,
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse',
              provider: 'postgres',
            },
          },
          columns: (ordinal === 0 ? ['customer_id', 'name'] : ['order_id', 'customer_id']).map(
            (name) => ({ name, type: 'string' })
          ),
        },
      }));
      const source = (ordinal: number): Parameters<typeof createCustomerOrdersJoin>[0]['left'] => ({
        nodeId: sources[ordinal]!.id,
        schema: 'raw',
        table: sources[ordinal]!.id,
        sourceRef: sources[ordinal]!.metadata!.connectedSourceRef as Parameters<
          typeof createCustomerOrdersJoin
        >[0]['left']['sourceRef'],
      });
      const draft = createCustomerOrdersJoin({
        left: source(0),
        right: source(1),
        targetNodeId: 'model',
      });
      const indexed = indexSubstraitRelations(draft);
      if (!indexed.ok) throw indexed.error;
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(draft);
      const inputId = indexed.index.relations.get(indexed.index.rootId)!.inputs[operand]!;
      const fields = await session.query(inputId);
      const filtered = await applySelectedRelationFilter(session, {
        intent: 'insert',
        relationId: inputId,
        expectedRevision: session.revision,
        fieldId: fields.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'selected',
      });
      const transform = applyDvtSubstraitSemanticDocument(
        transformNode(),
        encodeDvtSubstraitSemanticDocument(filtered)
      );
      const edges = sources.map((node) => ({
        id: node.id,
        sourceId: node.id,
        targetId: transform.id,
        relation: 'lineage' as const,
      }));
      const before = JSON.stringify(transform);
      await expect(
        projectDvtSubstraitTransformOutputToPostgresSql({
          transformNode: transform,
          nodes: [...sources, transform],
          edges,
        })
      ).resolves.toBeTypeOf('string');
      await expect(
        projectDvtSubstraitTransformOutputToPostgresSql({
          transformNode: transform,
          nodes: [
            ...sources.map((node, ordinal) =>
              ordinal === operand
                ? { ...node, metadata: { ...node.metadata, tableName: 'foreign' } }
                : node
            ),
            transform,
          ],
          edges,
        })
      ).rejects.toThrow();
      expect(JSON.stringify(transform)).toBe(before);
    }
  );
});
