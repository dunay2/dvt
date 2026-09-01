import { describe, expect, it } from 'vitest';

import type { NodePropertySection } from '../../components/inspector/nodePropertiesReadModel';
import {
  resolveCanvasNodeWorkbenchSectionModel,
  resolveNodeWorkbenchPrimarySectionIds,
} from './canvasNodeWorkbenchSectionStrategy';

function section(
  id: NodePropertySection['id'],
  options: Partial<NodePropertySection> = {}
): NodePropertySection {
  return {
    id,
    label: id,
    rows: [],
    tableRows: [],
    ...options,
  };
}

describe('resolveCanvasNodeWorkbenchSectionModel', () => {
  it('preserves the existing strategy-to-read-model translation', () => {
    expect(
      resolveNodeWorkbenchPrimarySectionIds([
        'properties',
        'columns',
        'sql',
        'sink',
        'preview',
        'runs',
      ])
    ).toEqual(['general', 'columns', 'code', 'sink']);

    expect(
      resolveNodeWorkbenchPrimarySectionIds([
        'properties',
        'columns',
        'tests',
        'lineage',
        'preview',
        'runs',
      ])
    ).toEqual(['general', 'columns', 'tests', 'inputs-outputs']);
  });

  it('orders Code first and removes empty unsupported sections', () => {
    const result = resolveCanvasNodeWorkbenchSectionModel({
      nodeKind: 'dbt:model',
      canEditNode: true,
      canOpenNodeCode: false,
      strategySectionIds: ['properties', 'columns', 'tests', 'lineage'],
      contributedSectionIds: new Set(),
      sections: [
        section('general', { rows: [{ id: 'name', label: 'Name', value: 'Orders' }] }),
        section('columns', {
          description: 'No columns are currently recorded.',
          emptyState: 'No columns',
        }),
        section('inputs-outputs', {
          tableRows: [{ id: 'input:1', cells: { direction: 'Input', node: 'Raw orders' } }],
        }),
        section('tests', { emptyState: 'No tests' }),
        section('keys', {
          tableRows: [{ id: 'pk', cells: { name: 'Primary key', columns: 'order_id' } }],
        }),
        section('indexes', { emptyState: 'No indexes' }),
        section('code', { code: 'select * from raw_orders' }),
        section('summary', {
          rows: [{ id: 'tags', label: 'Tags', value: '0' }],
        }),
      ],
    });

    expect(result.sections.map(({ id }) => id)).toEqual([
      'code',
      'general',
      'inputs-outputs',
      'keys',
    ]);
    expect(result.primarySectionIds).toEqual(['code', 'general', 'inputs-outputs']);
  });

  it('keeps editor-only sections and contribution hosts even before they contain facts', () => {
    const result = resolveCanvasNodeWorkbenchSectionModel({
      nodeKind: 'dvt:transform',
      canEditNode: true,
      canOpenNodeCode: false,
      strategySectionIds: ['properties', 'columns', 'sql'],
      contributedSectionIds: new Set(['comments']),
      sections: [
        section('general'),
        section('columns', { emptyState: 'No input columns' }),
        section('code', { emptyState: 'No code' }),
        section('comments', { emptyState: 'No comments' }),
        section('tests', { emptyState: 'No tests' }),
      ],
    });

    expect(result.sections.map(({ id }) => id)).toEqual(['code', 'general', 'columns', 'comments']);
    expect(result.primarySectionIds).toEqual(['code', 'general', 'columns']);
  });

  it('keeps file-backed Code reachable while passive empty sections stay absent', () => {
    const result = resolveCanvasNodeWorkbenchSectionModel({
      nodeKind: 'dbt:model',
      canEditNode: false,
      canOpenNodeCode: true,
      strategySectionIds: ['properties', 'columns', 'tests', 'lineage', 'code'],
      contributedSectionIds: new Set(['general']),
      sections: [
        section('general'),
        section('columns', { emptyState: 'No columns' }),
        section('inputs-outputs', { emptyState: 'No graph relations' }),
        section('tests', { emptyState: 'No tests' }),
        section('code', { description: 'Code lives at models/orders.sql.' }),
        section('summary', { rows: [{ id: 'tags', label: 'Tags', value: '0' }] }),
      ],
    });

    expect(result.sections.map(({ id }) => id)).toEqual(['code', 'general']);
    expect(result.primarySectionIds).toEqual(['code', 'general']);
  });
});
