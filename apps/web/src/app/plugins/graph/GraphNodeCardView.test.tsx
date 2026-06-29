// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeCardView } from './GraphNodeCardView';

const BASE_PROPS = {
  cardModel: {
    title: 'Orders model',
    kindLabel: 'Model',
    subtitle: 'analytics',
    metrics: [],
  },
  typeLabel: 'Model',
  tags: [],
  columns: [],
  showColumns: false,
  selected: false,
  hovered: false,
  dimmed: false,
};

describe('GraphNodeCardView', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('renders a node-local play action in the card header when available', () => {
    const onPlay = vi.fn();

    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          playAction={{ label: 'Select for execution', onPress: onPlay, disabled: false }}
        />
      );
    });

    const button = container.querySelector('button[aria-label="Select for execution"]');
    expect(button).not.toBeNull();
    act(() => {
      fireEvent.click(button!);
    });

    expect(onPlay).toHaveBeenCalledOnce();
  });
});
