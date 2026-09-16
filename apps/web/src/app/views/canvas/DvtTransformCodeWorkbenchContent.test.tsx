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
  inspectorDbtOriginLabel: 'Input',
  inspectorDvtRelationalLeftInput: 'Left input',
  inspectorDvtRelationalRightInput: 'Right input',
  nodePresentationColumnsLabel: 'Columns',
  reactFlowFitViewLabel: 'Fit view',
  reactFlowZoomInLabel: 'Zoom in',
  reactFlowZoomOutLabel: 'Zoom out',
  relationalTreeDetailLabel: 'Detail',
  relationalTreeInputIdentityUnavailableMessage: 'Input identity unavailable.',
  relationalTreeInvalidMessage: 'The canonical relational tree could not be read.',
  relationalTreeLabel: 'Relational tree',
  relationalTreeMissingLabel: 'Missing',
  relationalTreeOutputLabel: 'Output',
  relationalTreeParticipatingLabel: 'Participating',
  relationalTreePendingLabel: 'Pending',
  relationalTreePrimaryInputLabel: 'Primary input',
  relationalTreeReadOnlyMessage: 'Inspection only.',
  relationalTreeSecondaryInputTemplate: 'Secondary input {ordinal}',
  relationalTreeSourcesLabel: 'Sources',
  relationalTreeUnavailableMessage: 'No canonical relational tree is available.',
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

  it('keeps pending and canonical composition in the same relational Workbench', () => {
    const render = (state: 'pending' | 'canonical'): void => {
      act(() => {
        root.render(
          <DvtTransformCodeWorkbenchContent
            transformNode={TRANSFORM}
            nodes={[TRANSFORM]}
            edges={[]}
            relationalComposition={
              state === 'pending'
                ? { state, connectedInputCount: 2, pendingInputCount: 1 }
                : { state, connectedInputCount: 2, operation: 'inner_join' }
            }
            pendingCompositionAuthoring={<div data-slot="pending-composition-authoring" />}
            copy={COPY}
          />
        );
      });
    };

    render('pending');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-workbench"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="pending-composition-authoring"]')).not.toBeNull();

    render('canonical');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-workbench"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="pending-composition-authoring"]')).toBeNull();
  });
});
