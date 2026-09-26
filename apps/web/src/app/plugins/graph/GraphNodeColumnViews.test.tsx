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
    onInputMapping?: GraphNodeColumnSectionProps['onInputMapping']
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
    act(() => fireEvent.keyDown(tab, { key: 'Enter' }));
  }
  function drop(nodeId = 'producer-b', columnId = 'email'): void {
    act(() =>
      fireEvent.drop(container.querySelector('[data-slot="tabs"]')!, {
        dataTransfer: { getData: () => JSON.stringify({ nodeId, columnId }) },
      })
    );
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
});
