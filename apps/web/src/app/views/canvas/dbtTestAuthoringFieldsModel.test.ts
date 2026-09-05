import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildDbtTestAuthoringFieldsModel } from './dbtTestAuthoringFieldsModel';

const testNode: CanonicalNode = {
  id: 'dbt-test-1',
  name: 'Orders key required',
  pluginId: 'dbt',
  kind: 'dbt:test',
  role: 'check',
  status: 'idle',
  tags: [],
};

const modelNode: CanonicalNode = {
  id: 'dbt-model-1',
  name: 'Orders Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: { packageName: 'analytics', materialized: 'view' },
    columns: [
      { name: 'order_id', type: 'bigint' },
      { name: 'amount', type: 'numeric' },
    ],
  },
};

const edge: CanonicalEdge = {
  id: 'edge-model-test',
  sourceId: modelNode.id,
  targetId: testNode.id,
  relation: 'validation',
};

describe('DBT test authoring fields model', () => {
  it('projects only connected DBT models and their declared columns', () => {
    expect(
      buildDbtTestAuthoringFieldsModel({
        node: testNode,
        nodes: [modelNode, testNode],
        edges: [edge],
        targetModelId: '',
      })
    ).toEqual({
      targetOptions: [{ value: modelNode.id, label: modelNode.name }],
      selectedTargetModelId: modelNode.id,
      columnOptions: ['order_id', 'amount'],
    });
  });

  it('offers the effective columns projected by a connected generated model', () => {
    const sourceNode: CanonicalNode = {
      id: 'dbt-source-orders',
      name: 'Raw orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        dbt: { packageName: 'analytics', sourceName: 'raw' },
        columns: [{ name: 'order_id', type: 'bigint' }],
      },
    };
    const generatedModel = {
      ...modelNode,
      metadata: { dbt: { packageName: 'analytics', materialized: 'view' } },
    };
    const sourceEdge: CanonicalEdge = {
      id: 'edge-source-model',
      sourceId: sourceNode.id,
      targetId: generatedModel.id,
      relation: 'lineage',
    };

    expect(
      buildDbtTestAuthoringFieldsModel({
        node: testNode,
        nodes: [sourceNode, generatedModel, testNode],
        edges: [sourceEdge, edge],
        targetModelId: generatedModel.id,
      }).columnOptions
    ).toEqual(['order_id']);
  });

  it('does not present unrelated or non-model nodes as test targets', () => {
    expect(
      buildDbtTestAuthoringFieldsModel({
        node: testNode,
        nodes: [{ ...modelNode, kind: 'dvt:source', role: 'input' }, testNode],
        edges: [edge],
        targetModelId: '',
      })
    ).toEqual({
      targetOptions: [],
      selectedTargetModelId: '',
      columnOptions: [],
    });
  });
});
