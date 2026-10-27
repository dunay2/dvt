// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { DvtTransformCodeWorkbenchContent } from './DvtTransformCodeWorkbenchContent';

const TRANSFORM: CanonicalNode = {
  id: 'transform',
  name: 'Transform',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const COPY = {
  inspectorTransformOutputViewLabel: 'Output view',
  inspectorTransformOutputSubstraitLabel: 'Substrait',
  inspectorTransformOutputPostgresSqlLabel: 'PostgreSQL SQL',
  inspectorTransformOutputLoadingMessage: 'Loading',
  inspectorTransformOutputErrorMessage: 'Error',
};

describe('DVT Transform code workbench content', () => {
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

  it('keeps Code read-only without exposing semantic-editor navigation', () => {
    act(() => {
      root.render(
        <DvtTransformCodeWorkbenchContent
          transformNode={TRANSFORM}
          nodes={[TRANSFORM]}
          edges={[]}
          canonicalContent="{}"
          copy={COPY}
        />
      );
    });

    expect(container.querySelector('[data-slot="dvt-transform-output-view"]')).not.toBeNull();
    expect(container.querySelector('[data-slot^="dvt-select-operation-"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-open-semantic-editor"]')).toBeNull();
  });
});
