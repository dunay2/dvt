// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

  it('renders already-selected display tags without choosing them from metadata', () => {
    act(() => {
      root.render(<GraphNodeTagList tags={['postgres', 'public', 'source', 'hidden']} />);
    });

    expect(container.querySelector('[data-slot="graph-node-tag-list"]')).not.toBeNull();
    expect(container.textContent).toBe('postgrespublicsource');
    expect(container.textContent).not.toContain('hidden');
  });

  it('honors the supplied visible tag limit', () => {
    act(() => {
      root.render(<GraphNodeTagList tags={['model', 'authoring']} limit={1} />);
    });

    expect(container.textContent).toBe('model');
  });

  it('renders the supplied accent tone without deriving it from tag text', () => {
    act(() => {
      root.render(<GraphNodeTagList tags={['public', 'source']} tone="source" />);
    });

    const list = container.querySelector('[data-slot="graph-node-tag-list"]');
    const tags = container.querySelectorAll('[data-slot="graph-node-tag"]');

    expect(list?.getAttribute('data-tone')).toBe('source');
    expect(tags).toHaveLength(2);
    expect(tags[0]?.getAttribute('data-tone')).toBe('source');
    expect(tags[1]?.getAttribute('data-tone')).toBe('source');
  });
});
