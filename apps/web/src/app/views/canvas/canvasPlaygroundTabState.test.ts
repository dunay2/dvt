import { describe, expect, it } from 'vitest';

import { DBT_NODE_KINDS, DVT_AUTHORING_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import {
  deriveCanvasPlaygroundTabState,
  WORKSPACE_DRAFT_CANVAS_TAB_ID,
} from './canvasPlaygroundTabState';

describe('deriveCanvasPlaygroundTabState', () => {
  const availableCanvasKinds = [
    {
      kind: 'dbt',
      pluginId: 'dbt',
      label: 'dbt',
      description: 'dbt canvas',
      createTitle: 'dbt canvas',
      emptyState: {
        title: 'Start dbt canvas',
        editableMessage: 'dbt editable',
        firstNodeLabel: 'Add first dbt node',
        firstNodeHelper: 'dbt helper',
      },
      nodeKinds: DBT_NODE_KINDS,
    },
    {
      kind: 'transformation',
      pluginId: 'dvt',
      label: 'Transformation',
      description: 'Transformation canvas',
      createTitle: 'Transformation canvas',
      emptyState: {
        title: 'Start transformation canvas',
        editableMessage: 'transformation editable',
        firstNodeLabel: 'Add first transformation node',
        firstNodeHelper: 'transformation helper',
      },
      nodeKinds: DVT_AUTHORING_NODE_KINDS,
    },
  ] as const;

  it('returns an empty host state when no canvas document exists yet', () => {
    expect(
      deriveCanvasPlaygroundTabState({
        canvasDocument: null,
        availableCanvasKinds,
      })
    ).toEqual({
      activeTabId: null,
      tabs: [],
    });
  });

  it('derives one authoritative workspace-draft tab from the persisted canvas identity', () => {
    expect(
      deriveCanvasPlaygroundTabState({
        canvasDocument: {
          kind: 'transformation',
          title: 'Transformation canvas',
        },
        availableCanvasKinds,
      })
    ).toEqual({
      activeTabId: WORKSPACE_DRAFT_CANVAS_TAB_ID,
      tabs: [
        {
          id: WORKSPACE_DRAFT_CANVAS_TAB_ID,
          title: 'Transformation canvas',
          kind: 'transformation',
          kindLabel: 'Transformation',
          source: 'workspace_draft',
        },
      ],
    });
  });

  it('fails closed to the raw kind when the registry does not know the label', () => {
    expect(
      deriveCanvasPlaygroundTabState({
        canvasDocument: {
          kind: 'custom',
          title: 'Custom canvas',
        },
        availableCanvasKinds: [],
      })
    ).toEqual({
      activeTabId: WORKSPACE_DRAFT_CANVAS_TAB_ID,
      tabs: [
        {
          id: WORKSPACE_DRAFT_CANVAS_TAB_ID,
          title: 'Custom canvas',
          kind: 'custom',
          kindLabel: 'custom',
          source: 'workspace_draft',
        },
      ],
    });
  });
});
