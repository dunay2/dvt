import { describe, expect, it, vi } from 'vitest';

import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { resolveCanvasViewCopy } from './copy';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import {
  createNewCanvasDocumentCommand,
  hasRenderableCanvasTabs,
  resolveCanvasReplacementActionState,
} from './canvasPlaygroundTabStripModel';

const transformationCanvasKind: CanvasKindRegistration = {
  kind: 'transformation',
  pluginId: 'dvt',
  label: 'Transformation',
  description: 'Author transformation pipelines.',
  createTitle: 'Transformation canvas',
  emptyState: {
    title: 'No graph content loaded',
    editableMessage: 'Add governed nodes to start authoring.',
    firstNodeLabel: 'Add first node',
    firstNodeHelper: 'Choose a node kind.',
  },
  nodeKinds: [],
};

const dbtCanvasKind: CanvasKindRegistration = {
  kind: 'dbt',
  pluginId: 'dbt',
  label: 'dbt',
  description: 'Author dbt projects.',
  createTitle: 'dbt canvas',
  emptyState: {
    title: 'No dbt content loaded',
    editableMessage: 'Add dbt resources to start authoring.',
    firstNodeLabel: 'Add first dbt node',
    firstNodeHelper: 'Choose a dbt resource.',
  },
  nodeKinds: [],
};

const populatedTabState: CanvasPlaygroundTabState = {
  activeTabId: 'workspace-draft-canvas',
  tabs: [
    {
      id: 'workspace-draft-canvas',
      title: 'Sales canvas',
      kind: 'transformation',
      kindLabel: 'Transformation',
      source: 'workspace_draft',
    },
  ],
};

describe('canvas playground tab strip model', () => {
  it('keeps replacement copy locale-driven and outside the JSX template', () => {
    const copy = resolveCanvasViewCopy('es-ES');

    expect(
      resolveCanvasReplacementActionState({
        tabState: populatedTabState,
        availableCanvasKinds: [transformationCanvasKind],
        canEditEdges: true,
        onCreateCanvasDocument: vi.fn(),
        copy,
      })
    ).toEqual({
      activeCanvasKind: transformationCanvasKind,
      viewState: {
        canReplaceCanvas: true,
        buttonTitle: copy.newCanvasLabel,
        buttonLabel: copy.newCanvasLabel,
        dialogTitle: copy.replaceCanvasTitle,
        dialogDescription: copy.replaceCanvasMessage,
        cancelLabel: copy.replaceCanvasCancelLabel,
        confirmLabel: copy.replaceCanvasConfirmLabel,
        templateLabel: copy.routeNeedsCanvasTemplateLabel,
        templateOptions: [
          {
            kind: 'transformation',
            title: 'Transformation canvas',
            description: 'Author transformation pipelines.',
          },
        ],
      },
    });
  });

  it('keeps new-canvas command construction out of the presentation template', () => {
    expect(createNewCanvasDocumentCommand(transformationCanvasKind)).toEqual({
      kind: 'transformation',
      title: 'Transformation canvas',
      mode: 'create_new',
    });
  });

  it('offers every registered canvas runtime template for replacement', () => {
    const state = resolveCanvasReplacementActionState({
      tabState: populatedTabState,
      availableCanvasKinds: [dbtCanvasKind, transformationCanvasKind],
      canEditEdges: true,
      onCreateCanvasDocument: vi.fn(),
      copy: resolveCanvasViewCopy('en-US'),
    });

    expect(state.viewState.templateOptions.map((option) => option.kind)).toEqual([
      'dbt',
      'transformation',
    ]);
  });

  it('fails closed when no authoritative canvas tab can be rendered', () => {
    expect(hasRenderableCanvasTabs({ activeTabId: null, tabs: [] })).toBe(false);
  });
});
