// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeTagList } from './GraphNodeTagList';

describe('GraphNodeTagList', () => {
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

  it('omits itself when no display tags are supplied', () => {
    act(() => {
      root.render(<GraphNodeTagList tags={[]} />);
    });

    expect(container.querySelector('[data-slot="graph-node-tag-list"]')).toBeNull();
  });

  it('renders already-selected display tags with explicit overflow instead of hiding values', () => {
    act(() => {
      root.render(
        <GraphNodeTagList
          tags={['postgres', 'public', 'source', 'hidden'].map((tag) => ({
            value: tag,
            label: tag,
          }))}
        />
      );
    });

    expect(container.querySelector('[data-slot="graph-node-tag-list"]')).not.toBeNull();
    expect(container.textContent).toBe('postgrespublicsource+1');
    expect(
      container.querySelector('[data-slot="graph-node-tag-overflow"]')?.getAttribute('title')
    ).toBe('hidden');
    const overflow = container.querySelector<HTMLButtonElement>(
      'button[data-slot="graph-node-tag-overflow"]'
    )!;
    expect(overflow.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      fireEvent.keyDown(overflow, { key: 'Enter' });
    });

    expect(overflow.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toBe('postgrespublicsourcehidden−1');
  });

  it('honors the supplied visible tag limit', () => {
    act(() => {
      root.render(
        <GraphNodeTagList
          tags={['model', 'authoring'].map((tag) => ({ value: tag, label: tag }))}
          limit={1}
        />
      );
    });

    expect(container.textContent).toBe('model+1');
  });

  it('keeps the complete value accessible when a tag must fit the card', () => {
    const longTag = 'customer-segmentation-with-a-historical-suffix';

    act(() => {
      root.render(<GraphNodeTagList tags={[{ value: longTag, label: longTag }]} />);
    });

    const tag = container.querySelector('[data-slot="graph-node-tag"]');
    expect(tag?.textContent).toBe(longTag);
    expect(tag?.getAttribute('title')).toBe(longTag);
  });

  it('selects the canonical tag through a localized keyboard-operable action', () => {
    const onSelectTag = vi.fn();

    act(() => {
      root.render(
        <GraphNodeTagList
          tags={[
            { value: 'authoring', label: 'En edición' },
            { value: 'finance', label: 'finanzas' },
          ]}
          onSelectTag={onSelectTag}
          getSelectTagLabel={(tag) => `Filtrar por la etiqueta ${tag}`}
        />
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Filtrar por la etiqueta En edición"]'
    );
    expect(button).not.toBeNull();
    expect(button?.className).toContain('cursor-pointer');

    act(() => {
      fireEvent.keyDown(button!, { key: 'Enter' });
      fireEvent.keyDown(button!, { key: ' ' });
    });

    expect(onSelectTag).toHaveBeenCalledTimes(2);
    expect(onSelectTag).toHaveBeenNthCalledWith(1, 'authoring');
    expect(onSelectTag).toHaveBeenNthCalledWith(2, 'authoring');
  });

  it('renders the supplied accent tone without deriving it from tag text', () => {
    act(() => {
      root.render(
        <GraphNodeTagList
          tags={['public', 'source'].map((tag) => ({ value: tag, label: tag }))}
          tone="source"
        />
      );
    });

    const list = container.querySelector('[data-slot="graph-node-tag-list"]');
    const tags = container.querySelectorAll('[data-slot="graph-node-tag"]');

    expect(list?.getAttribute('data-tone')).toBe('source');
    expect(tags).toHaveLength(2);
    expect(tags[0]?.getAttribute('data-tone')).toBe('source');
    expect(tags[1]?.getAttribute('data-tone')).toBe('source');
  });
});
