// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { CanvasSourceOccurrenceOutputs } from './CanvasSourceOccurrenceOutputs';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasInputSlotId } from './canvasInputBindings';

describe('Source occurrence Output', () => {
  it('offers only externally published fields and edits this model input binding through explicit actions', () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onMapInput = vi.fn();
    const onRemoveInput = vi.fn();
    const input = {
      nodeId: 'source-orders',
      schema: 'raw',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/dvt/raw/orders',
      },
      fields: [
        { id: 'order_id', name: 'order_id', dataType: 'text', joinDataType: null },
        { id: 'customer', name: 'customer', dataType: 'text', joinDataType: null },
        { id: 'amount', name: 'amount', dataType: 'numeric', joinDataType: null },
      ],
      inputBindings: {
        version: 'v1',
        fields: [
          { inputId: canvasInputSlotId('source-orders', 'customer'), producerFieldId: 'customer' },
        ],
      },
    } as const satisfies CanvasDvtCompositionInput;
    act(() => {
      root.render(
        <CanvasSourceOccurrenceOutputs
          input={input}
          publishedFieldNames={['customer', 'amount']}
          consumerNodeId="model-1"
          onMapInput={onMapInput}
          onRemoveInput={onRemoveInput}
        />
      );
    });
    expect(container.textContent).toContain('customer');
    expect(container.textContent).toContain('amount');
    expect(container.textContent).not.toContain('order_id');
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="source-occurrence-remove-field"]')!);
      fireEvent.click(container.querySelector('[data-slot="source-occurrence-add-field"]')!);
    });
    expect(onRemoveInput).toHaveBeenCalledWith({
      target: { nodeId: 'model-1', inputId: canvasInputSlotId('source-orders', 'customer') },
      source: { nodeId: 'source-orders', columnId: 'customer' },
    });
    expect(onMapInput).toHaveBeenCalledWith({
      target: { nodeId: 'model-1' },
      source: { nodeId: 'source-orders', columnId: 'amount' },
    });
    act(() => root.unmount());
    container.remove();
  });
});
