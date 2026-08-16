import { WorkspaceGraphAuthoringDraftSchema, type VisualTransformRecipeV1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanonicalNodeToAuthoringNode } from './canvasDraftAuthoring';
import {
  applyDvtVisualTransformRecipe,
  convertDvtVisualTransformToSql,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

const RECIPE: VisualTransformRecipeV1 = {
  version: 'v1',
  outputs: [
    {
      id: 'output-order-id',
      name: 'order_id',
      dataType: 'integer',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'order_id' }],
        operations: [{ kind: 'passthrough' }],
      },
    },
  ],
  filters: [],
};

function buildTransformNode(metadata: CanonicalNode['metadata'] = {}): CanonicalNode {
  return {
    id: 'transform-orders',
    name: 'Orders model',
    pluginId: 'dvt',
    kind: 'dvt:sql_transform',
    role: 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

describe('DVT transform authoring authority', () => {
  it('keeps historical nodes without an authority envelope in SQL mode', () => {
    const node = buildTransformNode({
      sql: 'select order_id from raw.orders',
      config: {
        sql: 'select order_id from raw.orders',
        selectedColumns: ['source-orders.order_id'],
      },
    });

    expect(readDvtTransformAuthoringAuthority(node)).toEqual({
      version: 'v1',
      mode: 'sql',
      sql: 'select order_id from raw.orders',
    });
  });

  it('persists visual authority while removing every editable or stale SQL mirror', () => {
    const node = buildTransformNode({
      sql: 'select stale from raw.orders',
      compiledSql: 'select stale from raw.orders',
      config: {
        dialect: 'postgres',
        sql: 'select stale from raw.orders',
        selectedColumns: ['source-orders.order_id'],
      },
    });

    const updated = applyDvtVisualTransformRecipe(node, RECIPE);

    expect(updated.metadata).toEqual({
      config: {
        dialect: 'postgres',
        selectedColumns: ['source-orders.order_id'],
      },
      transformAuthoring: {
        version: 'v1',
        mode: 'visual',
        recipe: RECIPE,
      },
    });
    expect(readDvtTransformAuthoringAuthority(updated)).toEqual({
      version: 'v1',
      mode: 'visual',
      recipe: RECIPE,
    });
  });

  it('survives the existing CanonicalNode to Graph Draft to CanonicalNode roundtrip', () => {
    const visualNode = applyDvtVisualTransformRecipe(buildTransformNode(), RECIPE);
    const draft = WorkspaceGraphAuthoringDraftSchema.parse({
      canvas: { id: 'canvas-1', kind: 'transformation', title: 'Transformation' },
      nodeIds: [visualNode.id],
      nodePositions: { [visualNode.id]: { x: 40, y: 80 } },
      nodes: [projectCanonicalNodeToAuthoringNode(visualNode)],
      edges: [],
    });
    const reopenedNode = projectWorkspaceGraphAuthoringDraftSemanticGraph(draft).canonicalNodes[0];

    expect(reopenedNode).toBeDefined();
    expect(readDvtTransformAuthoringAuthority(reopenedNode!)).toEqual({
      version: 'v1',
      mode: 'visual',
      recipe: RECIPE,
    });
  });

  it('fails closed when visual authority coexists with editable SQL', () => {
    const node = buildTransformNode({
      sql: 'select * from raw.orders',
      transformAuthoring: { version: 'v1', mode: 'visual', recipe: RECIPE },
    });

    expect(() => readDvtTransformAuthoringAuthority(node)).toThrow(
      'Visual DVT transform authority cannot coexist with editable SQL.'
    );
  });

  it('treats even an empty SQL field as a second editable authority', () => {
    const topLevelSql = buildTransformNode({
      sql: '',
      transformAuthoring: { version: 'v1', mode: 'visual', recipe: RECIPE },
    });
    const configSql = buildTransformNode({
      config: { sql: '' },
      transformAuthoring: { version: 'v1', mode: 'visual', recipe: RECIPE },
    });

    expect(() => readDvtTransformAuthoringAuthority(topLevelSql)).toThrow(
      'Visual DVT transform authority cannot coexist with editable SQL.'
    );
    expect(() => readDvtTransformAuthoringAuthority(configSql)).toThrow(
      'Visual DVT transform authority cannot coexist with editable SQL.'
    );
  });

  it('fails closed for malformed or unknown authority metadata', () => {
    const node = buildTransformNode({
      transformAuthoring: { version: 'v2', mode: 'visual', recipe: RECIPE },
    });

    expect(() => readDvtTransformAuthoringAuthority(node)).toThrow(
      'DVT transform authoring authority metadata is invalid.'
    );
  });

  it('converts Visual to SQL atomically and rejects a blank generated projection', () => {
    const visualNode = applyDvtVisualTransformRecipe(buildTransformNode(), RECIPE);

    expect(() => convertDvtVisualTransformToSql(visualNode, '  ')).toThrow(
      'Visual to SQL conversion requires nonblank generated SQL.'
    );

    const sqlNode = convertDvtVisualTransformToSql(visualNode, 'select order_id from raw.orders');
    expect(sqlNode.metadata).toEqual({
      sql: 'select order_id from raw.orders',
      config: { sql: 'select order_id from raw.orders' },
      transformAuthoring: { version: 'v1', mode: 'sql' },
    });
    expect(readDvtTransformAuthoringAuthority(sqlNode)).toEqual({
      version: 'v1',
      mode: 'sql',
      sql: 'select order_id from raw.orders',
    });
  });

  it('rejects visual-to-SQL conversion when visual authority is not current', () => {
    expect(() =>
      convertDvtVisualTransformToSql(
        buildTransformNode({ sql: 'select * from raw.orders' }),
        'select order_id from raw.orders'
      )
    ).toThrow('Visual to SQL conversion requires current visual authority.');
  });
});
