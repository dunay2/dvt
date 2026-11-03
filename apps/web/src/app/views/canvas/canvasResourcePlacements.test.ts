import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { projectCanvasResourcePlacements } from './canvasResourcePlacements';

const model: CanonicalNode = {
  id: 'model.shop.orders',
  name: 'Orders',
  kind: 'dvt:transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'models/orders.sql',
  metadata: {
    authority: 'dbt-project-files',
    resourceType: 'model',
    dbtUniqueId: 'model.shop.orders',
  },
};

describe('file resource placements', () => {
  it('resolves independent cards from one current definition without copying authority', () => {
    const before = JSON.stringify(model);
    const instances = [
      { id: 'first', resourceId: model.id },
      { id: 'second', resourceId: model.id },
    ];
    const projected = projectCanvasResourcePlacements([model], instances);
    expect(projected.nodes.map((n) => [n.id, n.name])).toEqual([
      [model.id, 'Orders'],
      ['first', 'Orders 2'],
      ['second', 'Orders 3'],
    ]);
    expect(projected.definitionIdByInstanceId.get('first')).toBe(model.id);
    expect(projected.nodes[1]!.metadata).toBe(model.metadata);
    expect(JSON.stringify(model)).toBe(before);
    expect(instances).toEqual([
      { id: 'first', resourceId: model.id },
      { id: 'second', resourceId: model.id },
    ]);

    const updated = {
      ...model,
      name: 'New Orders',
      path: 'models/new_orders.sql',
      metadata: { ...model.metadata, columns: [{ name: 'amount' }] },
    };
    expect(projectCanvasResourcePlacements([updated], instances).nodes[1]).toMatchObject({
      name: 'New Orders 2',
      path: updated.path,
      metadata: updated.metadata,
    });
  });

  it('ignores missing definitions, collisions, chained, duplicate and unsupported references', () => {
    const test = {
      ...model,
      id: 'test.orders',
      role: 'check' as const,
      metadata: { ...model.metadata, resourceType: 'test' },
    };
    const projected = projectCanvasResourcePlacements(
      [model, test],
      [
        { id: 'missing', resourceId: 'unknown' },
        { id: model.id, resourceId: model.id },
        { id: 'first', resourceId: model.id },
        { id: 'first', resourceId: model.id },
        { id: 'chain', resourceId: 'first' },
        { id: 'unsupported', resourceId: test.id },
      ]
    );
    expect(projected.nodes.map((n) => n.id)).toEqual([model.id, test.id, 'first']);
    expect([...projected.definitionIdByInstanceId]).toEqual([['first', model.id]]);
  });
});
