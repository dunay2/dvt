import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import {
  reorderDbtModelProjectionColumn,
  setDbtModelProjectionColumnOutput,
  resolveDbtModelProjectionColumns,
} from './canvasDbtModelColumnAuthoring';

const model: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: {
      selectedSourceId: 'source-orders',
    },
  },
};

const availableColumns = ['order_id', 'customer', 'amount'];

describe('DBT model column authoring', () => {
  it('turns one generated output off without moving it', () => {
    const result = setDbtModelProjectionColumnOutput({
      node: model,
      availableColumns,
      columnName: 'customer',
      output: false,
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;

    expect(
      resolveDbtModelProjectionColumns(
        createDbtNodeAuthoringMetadata(result.node).projectionColumns,
        availableColumns
      )
    ).toEqual([
      { name: 'order_id', output: true },
      { name: 'customer', output: false },
      { name: 'amount', output: true },
    ]);
  });

  it('restores a disabled output in its recorded position', () => {
    const disabled = setDbtModelProjectionColumnOutput({
      node: model,
      availableColumns,
      columnName: 'customer',
      output: false,
    });
    expect(disabled.outcome).toBe('applied');
    if (disabled.outcome !== 'applied') return;

    const restored = setDbtModelProjectionColumnOutput({
      node: disabled.node,
      availableColumns,
      columnName: 'customer',
      output: true,
    });
    expect(restored.outcome).toBe('applied');
    if (restored.outcome !== 'applied') return;

    expect(createDbtNodeAuthoringMetadata(restored.node).projectionColumns).toEqual([
      { name: 'order_id', output: true },
      { name: 'customer', output: true },
      { name: 'amount', output: true },
    ]);
  });

  it('reorders active and inactive columns without changing their output state', () => {
    const reordered = reorderDbtModelProjectionColumn({
      node: {
        ...model,
        metadata: {
          dbt: {
            selectedSourceId: 'source-orders',
            projectionColumns: [
              { name: 'order_id', output: true },
              { name: 'customer', output: false },
              { name: 'amount', output: true },
            ],
          },
        },
      },
      availableColumns,
      columnName: 'amount',
      targetColumnName: 'order_id',
      placement: 'before',
    });

    expect(reordered.outcome).toBe('applied');
    if (reordered.outcome !== 'applied') return;

    expect(createDbtNodeAuthoringMetadata(reordered.node).projectionColumns).toEqual([
      { name: 'amount', output: true },
      { name: 'order_id', output: true },
      { name: 'customer', output: false },
    ]);
  });

  it('rejects an unknown column without mutating the model', () => {
    expect(
      setDbtModelProjectionColumnOutput({
        node: model,
        availableColumns,
        columnName: 'missing',
        output: false,
      })
    ).toEqual({ outcome: 'rejected', reason: 'column_not_found' });
  });
});
