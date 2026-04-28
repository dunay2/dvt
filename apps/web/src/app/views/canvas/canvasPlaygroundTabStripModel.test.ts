import { describe, expect, it, vi } from 'vitest';

import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { resolveCanvasViewCopy } from './copy';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import {
  createReplaceCurrentCanvasDocumentCommand,
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
      canReplaceCanvas: true,
      buttonTitle: copy.newCanvasLabel,
      buttonLabel: copy.newCanvasLabel,
      dialogTitle: copy.replaceCanvasTitle,
      dialogDescription: copy.replaceCanvasMessage,
      cancelLabel: copy.replaceCanvasCancelLabel,
      confirmLabel: copy.replaceCanvasConfirmLabel,
    });
  });

  it('keeps replacement command construction out of the presentation template', () => {
    expect(createReplaceCurrentCanvasDocumentCommand(transformationCanvasKind)).toEqual({
      kind: 'transformation',
      title: 'Transformation canvas',
      mode: 'replace_current',
    });
  });

  it('fails closed when no authoritative canvas tab can be rendered', () => {
    expect(hasRenderableCanvasTabs({ activeTabId: null, tabs: [] })).toBe(false);
  });
});
