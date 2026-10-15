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
import { graphColumnTransferTarget } from './graphColumnTransfer';
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
  it.each([
    ['input', []],
    ['output', []],
    ['input', ['source']],
    ['output', ['target']],
  ] as const)('does not revive denied ports in %s view from %j', (view, portDirections) => {
    renderPorts(view, portDirections);
    expect(container.querySelectorAll('[data-slot="canvas-node-port-handle"]')).toHaveLength(0);
  });
  it.each([
    ['input', ['target']],
    ['output', ['source']],
    ['input', ['target', 'source']],
    ['output', ['target', 'source']],
    ['input', undefined],
    ['output', undefined],
  ] as const)('keeps only the admitted view direction in %s from %j', (view, portDirections) => {
    renderPorts(view, portDirections);
    const handles = container.querySelectorAll('[data-slot="canvas-node-port-handle"]');
    expect(handles).toHaveLength(1);
    expect(handles[0]!.getAttribute('data-port')).toBe(view === 'input' ? 'target' : 'source');
  });
  it.each(['en', 'es'] as const)(
    'distinguishes an unresolved input without hiding its stable target in %s',
    (language) => {
      useApplicationLanguageStore.setState({ language });
      const unavailable = { ...inputs[0]!, inputState: 'unresolved' as const };
      render(undefined, { inputColumns: [unavailable, inputs[1]!] });
      const piece = container.querySelector<HTMLElement>('[data-field-id="input-a"]')!;
      expect(piece.getAttribute('data-input-state')).toBe('unresolved');
      expect(piece.getAttribute('aria-label')).toBe(
        language === 'es' ? 'name, entrada no disponible' : 'name, unavailable input'
      );
      expect(piece.textContent).toContain(language === 'es' ? 'No disponible' : 'Unavailable');
      expect(container.querySelectorAll('[data-slot="graph-node-column-piece"]')).toHaveLength(2);
    }
  );
  function render(
    onInputMapping?: GraphNodeColumnSectionProps['onInputMapping'],
    overrides: Partial<GraphNodeColumnSectionProps> = {}
  ): ReturnType<typeof vi.fn> {
    const mutation = vi.fn();
    act(() =>
      root.render(
        <ReactFlowProvider>
          <div {...graphColumnTransferTarget({ nodeId: 'consumer', onInputMapping })}>
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
          </div>
        </ReactFlowProvider>
      )
    );
    return mutation;
  }
  function renderPorts(
    view: GraphNodeColumnSectionProps['view'],
    portDirections: GraphNodeColumnSectionProps['portDirections']
  ): void {
    const column = {
      id: 'amount',
      name: 'amount',
      type: 'numeric',
      sourceHandleId: 'column:source:consumer:amount',
      targetHandleId: 'column:target:consumer:amount',
    };
    render(undefined, { columns: [column], inputColumns: [column], view, portDirections });
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
      fireEvent.drop(container.querySelector('[role="tabpanel"]')!, {
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
  it('keeps each view in its canonical order without borrowing the other view identities', () => {
    const published = [...inputs].reverse().map(({ name, type }) => ({
      id: `published-${name}`,
      name,
      type,
      output: true,
    }));
    const disclosure = vi.fn();
    const mutation = render(undefined, { columns: published, onDisclosureChange: disclosure });
    for (const view of ['Output', 'Input', 'Output']) {
      const tab = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
        (item) => item.textContent === `${view} (2)`
      )!;
      act(() => {
        tab.focus();
        fireEvent.keyDown(tab, { key: 'Enter' });
      });
      const expected = view === 'Output' ? published : inputs;
      const fields = [
        ...container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]'),
      ];
      expect(fields.map((field) => field.dataset.columnName)).toEqual(
        expected.map((field) => field.name)
      );
      expect(fields.map((field) => field.dataset.fieldId)).toEqual(
        expected.map((field) => field.id)
      );
      expect(document.activeElement).toBe(tab);
      expect(
        container
          .querySelector('[data-slot="graph-node-column-toggle"]')
          ?.getAttribute('aria-expanded')
      ).toBe('true');
    }
    expect(disclosure).not.toHaveBeenCalled();
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
    async (state, en, es) => {
      const previousLanguage = useApplicationLanguageStore.getState().language;
      try {
        for (const [language, label] of [
          ['en', en],
          ['es', es],
        ] as const) {
          await act(() => useApplicationLanguageStore.setState({ language }));
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
        await act(() => useApplicationLanguageStore.setState({ language: previousLanguage }));
      }
    }
  );
  it('distinguishes a valid empty projection from an unavailable schema', () => {
    render(undefined, { outputState: 'ready', view: 'output', columns: [] });
    expect(container.textContent).toContain('Output (0)');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
