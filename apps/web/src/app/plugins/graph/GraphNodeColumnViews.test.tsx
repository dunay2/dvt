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

describe('card Input / Output views', () => {
  setupWorkbenchTest();
  const columns = [
    {
      id: 'selected',
      name: 'name',
      type: 'string',
      output: true,
      source: { nodeId: 'producer', columnId: 'producer-name' },
    },
    {
      id: 'available',
      name: 'email',
      type: 'string',
      output: false,
      source: { nodeId: 'producer', columnId: 'producer-email' },
    },
  ];
  function render(
    onColumnOutputToggle?: GraphNodeColumnSectionProps['onColumnOutputToggle']
  ): void {
    act(() =>
      root.render(
        <ReactFlowProvider>
          <GraphNodeColumnViews
            columns={columns}
            inputColumns={columns}
            expanded
            nodeId="consumer"
            onColumnOutputToggle={onColumnOutputToggle}
          />
        </ReactFlowProvider>
      )
    );
  }
  it('separates received fields from selected outputs without duplicating rows', () => {
    render(vi.fn());
    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(2);
    const output = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent === 'Output (1)'
    )!;
    act(() => fireEvent.keyDown(output, { key: 'Enter' }));
    expect(output.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(1);
  });
  it.each([true, false])('transfers only a connected available field (editable=%s)', (editable) => {
    const toggle = vi.fn();
    render(editable ? toggle : undefined);
    const target = container.querySelector('[data-slot="tabs"]')!;
    const drop = (nodeId: string): void => {
      act(() =>
        fireEvent.drop(target, {
          dataTransfer: {
            getData: () => JSON.stringify({ nodeId, columnId: 'producer-email' }),
          },
        })
      );
    };
    drop('unrelated');
    expect(toggle).not.toHaveBeenCalled();
    drop('producer');
    if (editable)
      expect(toggle).toHaveBeenCalledWith({
        nodeId: 'consumer',
        columnId: 'available',
        columnType: 'string',
        output: true,
        source: columns[1]!.source,
      });
    else expect(toggle).not.toHaveBeenCalled();
  });
});
