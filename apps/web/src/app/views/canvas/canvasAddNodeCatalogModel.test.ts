// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  buildCanvasAddNodeCatalogItems,
  filterCanvasAddNodeCatalogItems,
  inferCanvasAddNodeCatalogCategory,
} from './canvasAddNodeCatalogModel';

describe('canvasAddNodeCatalogModel', () => {
  it('classifies node registrations into professional add catalog categories', () => {
    expect(inferCanvasAddNodeCatalogCategory(buildTestNodeKind('dvt:source', 'Source'))).toBe(
      'source'
    );
    expect(inferCanvasAddNodeCatalogCategory(buildTestNodeKind('dbt:model', 'Model'))).toBe(
      'model'
    );
    expect(inferCanvasAddNodeCatalogCategory(buildTestNodeKind('dbt:seed', 'Seed'))).toBe('seed');
    expect(inferCanvasAddNodeCatalogCategory(buildTestNodeKind('dvt:transform', 'Transform'))).toBe(
      'transformation'
    );
    expect(inferCanvasAddNodeCatalogCategory(buildTestNodeKind('dbt:test', 'Test'))).toBe('test');
    expect(inferCanvasAddNodeCatalogCategory(buildTestNodeKind('dvt:sink', 'Sink'))).toBe('output');
    expect(inferCanvasAddNodeCatalogCategory(buildTestNodeKind('dbt:macro', 'Macro'))).toBe(
      'macro'
    );
  });

  it('builds stable catalog items with labels, categories and descriptions', () => {
    const items = buildCanvasAddNodeCatalogItems({
      authoringNodeKinds: [
        buildTestNodeKind('dvt:sink', 'Sink'),
        buildTestNodeKind('dvt:source', 'Source'),
        buildTestNodeKind('dvt:transform', 'Transform'),
      ],
    });

    expect(items.map((item) => [item.id, item.category, item.actionLabel])).toEqual([
      ['create-node:dvt:source', 'source', 'Add source'],
      ['create-node:dvt:transform', 'transformation', 'Add transformation'],
      ['create-node:dvt:sink', 'output', 'Add output'],
    ]);
    expect(items.every((item) => item.categoryLabel.length > 0)).toBe(true);
    expect(items.every((item) => item.description.length > 0)).toBe(true);
  });

  it('rejects duplicate semantic node-kind entries', () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');

    expect(() =>
      buildCanvasAddNodeCatalogItems({
        actions: [
          { action: 'create-node', label: 'Add source', registration: sourceKind },
          { action: 'create-node', label: 'Add source', registration: sourceKind },
        ],
      })
    ).toThrow('Duplicate Canvas add-node catalog item "create-node:dvt:source".');
  });

  it('disambiguates distinct registrations that share the same visible action label', () => {
    const items = buildCanvasAddNodeCatalogItems({
      actions: [
        {
          action: 'create-node',
          label: 'Add output',
          registration: buildTestNodeKind('dvt:sink', 'Sink'),
        },
        {
          action: 'create-node',
          label: 'Add output',
          registration: { ...buildTestNodeKind('dbt:output', 'Output'), role: 'output' },
        },
      ],
    });

    expect(items.map((item) => item.actionLabel)).toEqual([
      'Add output: Output',
      'Add output: Sink',
    ]);
  });

  it('filters as a subset and is idempotent for the same query', () => {
    const items = buildCanvasAddNodeCatalogItems({
      authoringNodeKinds: [
        buildTestNodeKind('dvt:source', 'Source'),
        buildTestNodeKind('dbt:model', 'Model'),
        buildTestNodeKind('dvt:transform', 'Transform'),
      ],
    });

    const filtered = filterCanvasAddNodeCatalogItems(items, 'transform');
    const filteredAgain = filterCanvasAddNodeCatalogItems(filtered, 'transform');

    expect(filtered.map((item) => item.id)).toEqual(['create-node:dvt:transform']);
    expect(filteredAgain).toEqual(filtered);
    expect(filtered.every((item) => items.includes(item))).toBe(true);
  });

  it('returns all items for an empty search query', () => {
    const items = buildCanvasAddNodeCatalogItems({
      authoringNodeKinds: [
        buildTestNodeKind('dvt:source', 'Source'),
        buildTestNodeKind('dbt:model', 'Model'),
      ],
    });

    expect(filterCanvasAddNodeCatalogItems(items, '  ')).toBe(items);
  });
});
