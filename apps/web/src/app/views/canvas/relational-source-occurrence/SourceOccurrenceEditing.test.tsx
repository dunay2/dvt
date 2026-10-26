// @vitest-environment jsdom
/** Owned concern: Source inspection enters local Edit and resets presentation without saving. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { container, root, setupWorkbenchTest } from '../CanvasRelationalTreeWorkbench.test-support';
import { SourceOccurrencePropertiesForm } from './SourceOccurrencePropertiesForm';
import { CanvasSourceOccurrenceOutputs } from '../CanvasSourceOccurrenceOutputs';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasOperationInspectorTabs } from '../CanvasRelationalTreeEditorFrame';

describe('Source occurrence editing presentation', () => {
  setupWorkbenchTest();
  it('uses one literal Edit action for alias and output presentation without saving', async () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const save = vi.fn(() => true);
    const change = vi.fn();
    let settle!: () => void;
    function Host({ children }: React.PropsWithChildren): React.JSX.Element {
      const [revision, setRevision] = React.useState(0);
      settle = () => setRevision((current) => current + 1);
      return (
        <CanvasOperationInspectorTabs resetRevision={revision}>
          {children}
        </CanvasOperationInspectorTabs>
      );
    }
    await act(async () =>
      root.render(
        <Host>
          <SourceOccurrencePropertiesForm
            data={{ relationId: 'pending', alias: 'Source', occupied: new Set(), supported: true }}
            actions={{ save, close: vi.fn() }}
            output={(editing: boolean) => (
              <CanvasSourceOccurrenceOutputs
                fields={[
                  { id: 'included', name: 'Visible', included: true, available: true },
                  { id: 'excluded', name: 'Excluded', included: false, available: true },
                ]}
                editing={editing}
                disabled={false}
                onChange={change}
              />
            )}
          />
        </Host>
      )
    );
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(container.querySelector('[data-slot="source-occurrence-update"]')).toBeNull();
    expect(container.textContent).not.toContain('Excluded');
    const edit = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-edit"]'
    )!;
    expect(edit?.textContent).toBe('Edit');
    await act(async () => edit.click());
    expect(edit.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).not.toBeNull();
    expect(container.textContent).toContain('Excluded');
    expect(save).not.toHaveBeenCalled();
    const selectedOnly = container.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="Solo seleccionados"]'
    )!;
    expect(selectedOnly).not.toBeNull();
    expect(selectedOnly.getAttribute('aria-checked')).toBe('false');
    await act(async () => selectedOnly.click());
    expect(container.textContent).toContain('Visible');
    expect(container.textContent).not.toContain('Excluded');
    await act(async () => selectedOnly.click());
    expect(container.textContent).toContain('Excluded');
    expect(change).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    const properties = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-operation-properties-tab"]'
    )!;
    await act(async () => fireEvent.mouseDown(properties, { button: 0, ctrlKey: false }));
    expect(properties.getAttribute('data-state')).toBe('active');
    await act(async () => settle());
    expect(edit.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-slot="source-occurrence-alias"]')).toBeNull();
    expect(container.querySelector('[role="checkbox"]')).toBeNull();
    expect(properties.getAttribute('data-state')).toBe('active');
  });
});
