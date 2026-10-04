// @vitest-environment jsdom
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import {
  setupWorkbenchTest,
  root,
  container,
} from '../../views/canvas/CanvasRelationalTreeWorkbench.test-support';
import { GraphNodeColumnViews } from './GraphNodeColumnViews';
import type { GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

describe('card Input / Output boundary', () => {
  setupWorkbenchTest();
  const columns = [
    { id: 'published', name: 'name', type: 'string', output: true },
    { id: 'excluded', name: 'email', type: 'string', output: false },
  ];
  const inputs = [
    {
      id: 'input-a',
      name: 'name',
      type: 'string',
      source: { nodeId: 'producer-a', columnId: 'name' },
    },
    {
      id: 'input-b',
      name: 'email',
      type: 'string',
      source: { nodeId: 'producer-b', columnId: 'email' },
    },
  ];
  function render(
    onInputMapping?: GraphNodeColumnSectionProps['onInputMapping'],
    overrides: Partial<GraphNodeColumnSectionProps> = {}
  ): ReturnType<typeof vi.fn> {
    const mutation = vi.fn();
    act(() =>
      root.render(
        <ReactFlowProvider>
          <GraphNodeColumnViews
            columns={columns}
            inputColumns={inputs}
            expanded
            nodeId="consumer"
            onInputMapping={onInputMapping}
            onColumnOutputToggle={mutation}
            onAutomap={mutation}
            onColumnReorder={mutation}
            {...overrides}
          />
        </ReactFlowProvider>
      )
    );
    return mutation;
  }
  function outputView(): void {
    const tab = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (item) => item.textContent === 'Output (1)'
    )!;
    act(() => {
      fireEvent.keyDown(tab, { key: 'Enter' });
    });
  }
  function drop(nodeId = 'producer-b', columnId = 'email'): void {
    act(() => {
      fireEvent.drop(container.querySelector('[data-slot="tabs"]')!, {
        dataTransfer: { getData: () => JSON.stringify({ nodeId, columnId }) },
      });
    });
  }
  it('publishes only explicit outputs without output-authoring controls', () => {
    const mutation = render();
    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(2);
    outputView();
    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="graph-node-column-output-state"]')).toBeNull();
    expect(container.querySelector('[data-slot="graph-node-column-automap"]')).toBeNull();
    drop();
    expect(mutation).not.toHaveBeenCalled();
  });
  it('delegates a second producer field to Input admission, never to Output', () => {
    const map = vi.fn();
    const mutation = render(map);
    drop();
    expect(map).toHaveBeenCalledExactlyOnceWith({
      source: { nodeId: 'producer-b', columnId: 'email' },
      target: { nodeId: 'consumer' },
    });
    outputView();
    drop();
    expect(map).toHaveBeenCalledTimes(1);
    expect(mutation).not.toHaveBeenCalled();
  });
  it('does not admit read-only, self or malformed transfers', () => {
    render();
    drop();
    const map = vi.fn();
    render(map);
    drop('consumer');
    drop('');
    drop('producer-b', '');
    expect(map).not.toHaveBeenCalled();
  });
  it.each([
    ['pending', 'Updating schema', 'Calculando esquema'],
    ['unavailable', 'Unavailable', 'No disponible'],
    ['unconfigured', 'Not configured', 'Sin configurar'],
  ] as const)(
    'does not publish stale fields or a zero count while Output is %s',
    (state, en, es) => {
      const previousLanguage = useApplicationLanguageStore.getState().language;
      try {
        for (const [language, label] of [
          ['en', en],
          ['es', es],
        ] as const) {
          act(() => useApplicationLanguageStore.setState({ language }));
          const map = vi.fn();
          render(map, { outputState: state, view: 'output' });
          expect(container.textContent).toContain(`Output (${label})`);
          expect(container.querySelector('[role="status"]')?.textContent).toBe(label);
          expect(container.querySelector('[draggable="true"]')).toBeNull();
          expect(container.querySelector('[data-slot="graph-node-column-row"]')).toBeNull();
          expect(container.querySelector('[data-port="source"]')).toBeNull();
          drop();
          expect(map).not.toHaveBeenCalled();
          render(map, { outputState: state, view: 'input' });
          expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(2);
          drop();
          expect(map).toHaveBeenCalledOnce();
        }
      } finally {
        act(() => useApplicationLanguageStore.setState({ language: previousLanguage }));
      }
    }
  );
  it('distinguishes a valid empty projection from an unavailable schema', () => {
    render(undefined, { outputState: 'ready', view: 'output', columns: [] });
    expect(container.textContent).toContain('Output (0)');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
