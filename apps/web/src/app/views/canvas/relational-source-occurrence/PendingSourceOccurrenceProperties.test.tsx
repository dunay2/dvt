// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { PendingSourceOccurrenceProperties } from './PendingSourceOccurrenceProperties';
import { createPendingSourceOccurrence } from './pendingSourceOccurrence';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import { occurrenceInput } from './occurrence.test.fixtures';

describe('Pending Source occurrence properties', () => {
  it('opens Output with no fields beyond the producer publication', () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const input: CanvasDvtCompositionInput = {
      ...occurrenceInput.source,
      fields: occurrenceInput.fields.map((name) => ({
        name,
        dataType: 'bigint',
        joinDataType: 'i64',
      })),
    };
    act(() => {
      root.render(
        <PendingSourceOccurrenceProperties
          occurrence={createPendingSourceOccurrence(input)}
          input={input}
          publishedFieldNames={['id']}
          consumerNodeId="model"
          occupied={new Set()}
          actions={{ rename: vi.fn(() => true), close: vi.fn() }}
          onPendingChange={vi.fn()}
        />
      );
    });
    const output = container.querySelector('[data-slot="source-occurrence-outputs"]');
    expect(
      container
        .querySelector('[data-slot="canvas-operation-output-tab"]')
        ?.getAttribute('data-state')
    ).toBe('active');
    expect(output?.textContent).toContain('id');
    expect(output?.textContent).not.toContain('parent_id');
    act(() => root.unmount());
    container.remove();
  });
});
