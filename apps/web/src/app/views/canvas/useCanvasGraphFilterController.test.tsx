// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import type { Node } from '@xyflow/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  useCanvasGraphFilterController,
  type CanvasGraphFilterControlModel,
} from './useCanvasGraphFilterController';

describe('useCanvasGraphFilterController', () => {
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

  it('derives only available values and clears all ephemeral state', () => {
    function Harness(): JSX.Element {
      const controller = useCanvasGraphFilterController({ nodes: graphNodes() });
      return (
        <div>
          <button type="button" onClick={() => controller.setOpen(true)}>
            Open
          </button>
          <button type="button" onClick={() => controller.selectDimension('status')}>
            Status
          </button>
          <button type="button" onClick={() => controller.selectValue('failed')}>
            Failed
          </button>
          <button type="button" onClick={controller.addDraftPredicate}>
            Add
          </button>
          <button type="button" onClick={() => controller.setComposition('or')}>
            OR
          </button>
          <button type="button" onClick={() => controller.setPresentation('hide')}>
            Hide
          </button>
          <button type="button" onClick={controller.clear}>
            Clear
          </button>
          <button type="button" onClick={() => controller.filterByTag('finance')}>
            Filter finance
          </button>
          <output>{JSON.stringify(controller.model)}</output>
        </div>
      );
    }

    act(() => root.render(<Harness />));
    expect(model().optionGroups.find((group) => group.dimension === 'status')?.values).toEqual([
      'failed',
      'success',
    ]);

    click('Open');
    click('Status');
    click('Failed');
    click('Add');
    click('OR');
    click('Hide');
    expect(model()).toMatchObject({
      open: true,
      predicates: [{ dimension: 'status', value: 'failed' }],
      composition: 'or',
      presentation: 'hide',
      status: 'matched',
      matchCount: 1,
    });

    click('Clear');
    expect(model()).toMatchObject({
      predicates: [],
      composition: 'and',
      presentation: 'dim',
      status: 'idle',
      matchCount: 2,
    });

    click('Filter finance');
    click('Filter finance');
    expect(model()).toMatchObject({
      open: true,
      draftDimension: 'tag',
      draftValue: 'finance',
      predicates: [{ dimension: 'tag', value: 'finance' }],
      status: 'matched',
      matchCount: 2,
    });

    function click(label: string): void {
      act(() => {
        fireEvent.click(
          Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent === label
          )!
        );
      });
    }
    function model(): CanvasGraphFilterControlModel {
      return JSON.parse(
        container.querySelector('output')?.textContent ?? '{}'
      ) as CanvasGraphFilterControlModel;
    }
  });
});

function graphNodes(): Node[] {
  return [
    {
      id: 'source',
      position: { x: 0, y: 0 },
      data: {
        pluginId: 'dbt',
        pluginKind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: ['finance'],
      },
    },
    {
      id: 'model',
      position: { x: 1, y: 0 },
      data: {
        pluginId: 'dbt',
        pluginKind: 'dvt:transform',
        role: 'transform',
        status: 'failed',
        tags: ['finance'],
      },
    },
  ];
}
