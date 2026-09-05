// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { dbtGraphNodeCardStrategy } from '../../plugins/dbt/dbtGraphNodeCardStrategy';
import type { GraphNodeCardStrategy } from '../../plugins/graph/graphNodeCardStrategyContracts';
import {
  mapCanonicalEdgeToCanvasEdge,
  mapCanonicalNodeToCanvasNode,
  mapDroppedCanonicalNodeToCanvasNode,
  projectCanvasNodeAccessibleHealth,
} from './canvasNodeMapper';

function buildCanonicalNode(): CanonicalNode {
  return {
    id: 'source-node',
    name: 'Raw orders',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

describe('canvasNodeMapper', () => {
  it('projects localized Canvas port labels into React Flow node data', () => {
    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: buildCanonicalNode(),
      index: 0,
      showColumns: false,
      locale: 'es-ES',
    });

    expect(mappedNode.data.portLabels).toEqual({
      target: 'Conectar puerto de entrada',
      source: 'Conectar puerto de salida',
    });
    expect(mappedNode.data.executionSelectionCopy).toEqual({
      selectLabel: 'Seleccionar para ejecución',
      deselectLabel: 'Quitar de la ejecución',
    });
    expect(mappedNode.data.typeLabel).toBe('Origen');
    expect(mappedNode.ariaLabel).toBe('Raw orders, Origen');
    expect(mappedNode.data.presentationCopy).toMatchObject({
      readyStatusLabel: 'Listo',
      draftStatusLabel: 'Borrador',
    });
  });

  it('localizes node kind, authoring status and visible tags without changing canonical tags', () => {
    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: {
        ...buildCanonicalNode(),
        kind: 'dbt:model',
        pluginId: 'dbt',
        role: 'transform',
        tags: ['authoring', 'finance'],
      },
      index: 0,
      showColumns: false,
      locale: 'es',
    });

    expect(mappedNode.data.typeLabel).toBe('Modelo');
    expect(mappedNode.data.tags).toEqual(['authoring', 'finance']);
    expect(mappedNode.data.displayTags).toEqual([
      { value: 'authoring', label: 'En edición' },
      { value: 'finance', label: 'finance' },
    ]);
  });

  it('projects strategy-owned health into a React Flow node accessible label', () => {
    const canonicalNode = {
      ...buildCanonicalNode(),
      name: 'Failed model',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'failed',
    } satisfies CanonicalNode;
    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode,
      index: 0,
      showColumns: false,
    });

    const projectedNode = projectCanvasNodeAccessibleHealth({
      node: mappedNode,
      canonicalNode,
      data: mappedNode.data,
      graphNodeCardStrategies: [dbtGraphNodeCardStrategy],
    });

    expect(projectedNode.ariaLabel).toBe('Failed model, Model, Failed');
  });

  it.each(['matches', 'build'] as const)(
    'falls back to canonical health when a plugin card strategy throws from %s',
    (failurePoint) => {
      const canonicalNode = {
        ...buildCanonicalNode(),
        status: 'failed',
      } satisfies CanonicalNode;
      const mappedNode = mapCanonicalNodeToCanvasNode({
        canonicalNode,
        index: 0,
        showColumns: false,
      });
      const throwingStrategy: GraphNodeCardStrategy = {
        id: `throwing-${failurePoint}`,
        matches: () => {
          if (failurePoint === 'matches') {
            throw new Error('Plugin matches failed');
          }
          return true;
        },
        build: () => {
          throw new Error('Plugin build failed');
        },
      };

      expect(() =>
        projectCanvasNodeAccessibleHealth({
          node: mappedNode,
          canonicalNode,
          data: mappedNode.data,
          graphNodeCardStrategies: [throwingStrategy],
        })
      ).not.toThrow();
      expect(
        projectCanvasNodeAccessibleHealth({
          node: mappedNode,
          canonicalNode,
          data: mappedNode.data,
          graphNodeCardStrategies: [throwingStrategy],
        }).ariaLabel
      ).toBe('Raw orders, Source, Failed');
    }
  );

  it('projects one semantic dependency edge with an inset direction renderer', () => {
    const edge = mapCanonicalEdgeToCanvasEdge({
      id: 'source-to-model',
      sourceId: 'source-node',
      targetId: 'model-node',
      relation: 'lineage',
    });

    expect(edge.type).toBe('dependency');
    expect(edge.markerStart).toBeUndefined();
    expect(edge.markerEnd).toBeUndefined();
    expect(edge.interactionWidth).toBe(18);
    expect(edge.style).toMatchObject({ strokeWidth: 2.5 });
    expect(edge.sourceHandle).toBe('source');
    expect(edge.targetHandle).toBe('target');
  });

  it('preserves specialized source plugin identity in React Flow node data', () => {
    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: {
        ...buildCanonicalNode(),
        pluginId: 'dvt.warehouse-source',
      },
      index: 0,
      showColumns: false,
    });

    expect(mappedNode.data.pluginId).toBe('dvt.warehouse-source');
    expect(mappedNode.data.pluginKind).toBe('dvt:source');
  });

  it('projects presentation truth when a canonical node enters through drag and drop', () => {
    const mappedNode = mapDroppedCanonicalNodeToCanvasNode(
      {
        ...buildCanonicalNode(),
        metadata: {
          columns: [
            { name: 'order_id', type: 'integer', nullable: false, primaryKey: true },
            { name: 'amount', type: 'numeric' },
          ],
        },
      },
      { x: 120, y: 80 },
      false,
      'es-ES'
    );

    expect(mappedNode.data.presentationTruth?.columns).toMatchObject({
      visibleCount: 2,
      visibleProvenance: 'declared',
    });
    expect(mappedNode.data.columns).toEqual([
      {
        name: 'order_id',
        type: 'integer',
        nullable: false,
        primaryKey: true,
        output: true,
      },
      { name: 'amount', type: 'numeric', output: true },
    ]);
  });

  it('marks inherited Transform fields as available inputs instead of outputs', () => {
    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: { ...buildCanonicalNode(), role: 'transform', kind: 'dvt:transform' },
      index: 0,
      showColumns: true,
      presentationTruth: {
        columns: {
          declared: [],
          inherited: [
            {
              name: 'customer',
              type: 'text',
              provenance: 'inherited',
              sourceNodeName: 'orders',
              reference: 'source:orders:customer',
            },
          ],
          visible: [
            {
              name: 'customer',
              type: 'text',
              provenance: 'inherited',
              sourceNodeName: 'orders',
              reference: 'source:orders:customer',
            },
          ],
          declaredCount: 0,
          inheritedCount: 1,
          visibleCount: 1,
          visibleProvenance: 'inherited',
        },
        code: { kind: 'unavailable' },
      },
    });

    expect(mappedNode.data.columns).toEqual([
      {
        id: 'source:orders:customer',
        name: 'customer',
        type: 'text',
        output: false,
        sourceNodeName: 'orders',
        reference: 'source:orders:customer',
      },
    ]);
  });

  it('projects recorded DBT model outputs without moving inactive columns', () => {
    const mappedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: {
        ...buildCanonicalNode(),
        id: 'model-orders',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        metadata: {
          dbt: {
            projectionColumns: [
              { name: 'order_id', output: true },
              { name: 'customer', output: false },
            ],
          },
        },
      },
      index: 0,
      showColumns: true,
      presentationTruth: {
        columns: {
          declared: [],
          inherited: [],
          visible: [
            { name: 'order_id', type: 'integer', provenance: 'inherited' },
            { name: 'customer', type: 'text', provenance: 'inherited' },
          ],
          declaredCount: 0,
          inheritedCount: 2,
          visibleCount: 2,
          visibleProvenance: 'inherited',
        },
        code: { kind: 'unavailable' },
      },
    });

    expect(mappedNode.data.columns).toEqual([
      { name: 'order_id', type: 'integer', output: true },
      { name: 'customer', type: 'text', output: false },
    ]);
  });
});
