// @vitest-environment jsdom

import { fireEvent, getByRole } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DvtSubstraitWindowContextSection } from './DvtSubstraitWindowContextSection';

describe('DvtSubstraitWindowContextSection', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('projects the admitted Window as one accessible contextual relation', () => {
    const onApply = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitWindowContextSection
          mode="authoring"
          sourceName="raw.events"
          disabled={false}
          fields={[
            { fieldId: 'customer', name: 'customer_id' },
            { fieldId: 'event-time', name: 'event_time' },
          ]}
          partitionFieldId="customer"
          orderFieldId="event-time"
          outputName="position"
          canApply
          onPartitionChange={vi.fn()}
          onOrderChange={vi.fn()}
          onOutputNameChange={vi.fn()}
          onApply={onApply}
        />
      );
    });

    expect(getByRole(container, 'region', { name: 'Contextual relation' })).not.toBeNull();
    expect(container.textContent).toContain('Same input');
    expect(container.textContent).toContain('raw.events');
    expect(container.textContent).toContain('ASC · NULLS LAST');
    expect(container.textContent).toContain('Frame');
    expect(container.textContent).toContain('Unspecified');
    expect(container.textContent).toContain('Relative position');
    expect(container.textContent).toContain('ROW_NUMBER');
    expect(getByRole(container, 'combobox', { name: 'Partition field' })).not.toBeNull();
    expect(getByRole(container, 'combobox', { name: 'Order field' })).not.toBeNull();
    expect(getByRole(container, 'textbox', { name: 'Row number output' })).not.toBeNull();

    act(() => {
      fireEvent.keyDown(getByRole(container, 'button', { name: 'Add row numbers' }), {
        key: 'Enter',
      });
    });
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('keeps configured output editing and removal on the existing command callbacks', () => {
    const onOutputNameChange = vi.fn();
    const onOutputNameCommit = vi.fn();
    const onRemove = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitWindowContextSection
          mode="configured"
          sourceName="raw.events"
          disabled={false}
          partitionName="customer_id"
          orderName="event_time"
          outputName="position"
          onOutputNameChange={onOutputNameChange}
          onOutputNameCommit={onOutputNameCommit}
          onRemove={onRemove}
        />
      );
    });

    expect(container.textContent).toContain('customer_id');
    expect(container.textContent).toContain('event_time');
    const output = getByRole(container, 'textbox', { name: 'Row number output' });
    act(() => {
      fireEvent.input(output, { target: { value: 'position_2' } });
      fireEvent.focusOut(output);
      fireEvent.click(getByRole(container, 'button', { name: 'Remove row numbers' }));
    });

    expect(onOutputNameChange).toHaveBeenCalledWith('position_2');
    expect(onOutputNameCommit).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
