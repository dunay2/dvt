import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE,
  WORKSPACE_GRAPH_AUTHORING_NODE_ROLE,
  WORKSPACE_GRAPH_AUTHORING_NODE_STATUS,
  WorkspaceGraphAuthoringCommandSchema,
  WorkspaceGraphAuthoringDraftSchema,
} from '../src/index.js';

const sourceNode = {
  id: 'source-1',
  name: 'Orders source',
  pluginId: 'dbt',
  kind: 'postgres_table',
  role: WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.input,
  status: WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.idle,
  tags: ['source'],
} as const;

describe('WorkspaceGraphAuthoringDraft contract', () => {
  it('accepts an empty editable graph because compile readiness is downstream', () => {
    const result = WorkspaceGraphAuthoringDraftSchema.safeParse({
      canvas: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      nodeIds: [],
      nodePositions: {},
      nodes: [],
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it('accepts a first-node editable graph without requiring compile edges', () => {
    const result = WorkspaceGraphAuthoringDraftSchema.safeParse({
      canvas: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      nodeIds: [sourceNode.id],
      nodePositions: {
        [sourceNode.id]: { x: 120, y: 80 },
      },
      nodes: [sourceNode],
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it('accepts a project draft with multiple named canvases and one active canvas', () => {
    const result = WorkspaceGraphAuthoringDraftSchema.safeParse({
      canvas: {
        id: 'canvas-modeling',
        kind: 'transformation',
        title: 'Modeling',
        environmentId: 'dev',
        defaultPermission: 'write',
      },
      activeCanvasId: 'canvas-modeling',
      canvases: [
        {
          canvas: {
            id: 'canvas-ingest',
            kind: 'transformation',
            title: 'Ingest',
            environmentId: 'dev',
            defaultPermission: 'write',
          },
          nodeIds: [],
          nodePositions: {},
          nodes: [],
          edges: [],
        },
        {
          canvas: {
            id: 'canvas-modeling',
            kind: 'transformation',
            title: 'Modeling',
            environmentId: 'dev',
            defaultPermission: 'write',
          },
          nodeIds: [sourceNode.id],
          nodePositions: {
            [sourceNode.id]: { x: 120, y: 80 },
          },
          nodes: [sourceNode],
          edges: [],
        },
      ],
      nodeIds: [sourceNode.id],
      nodePositions: {
        [sourceNode.id]: { x: 120, y: 80 },
      },
      nodes: [sourceNode],
      edges: [],
    });

    expect(result.success).toBe(true);
  });

  it('rejects multiple canvases with duplicate canvas ids', () => {
    const result = WorkspaceGraphAuthoringDraftSchema.safeParse({
      canvas: {
        id: 'canvas-1',
        kind: 'transformation',
        title: 'Main canvas',
      },
      activeCanvasId: 'canvas-1',
      canvases: [
        {
          canvas: {
            id: 'canvas-1',
            kind: 'transformation',
            title: 'Main canvas',
          },
          nodeIds: [],
          nodePositions: {},
          nodes: [],
          edges: [],
        },
        {
          canvas: {
            id: 'canvas-1',
            kind: 'transformation',
            title: 'Duplicate',
          },
          nodeIds: [],
          nodePositions: {},
          nodes: [],
          edges: [],
        },
      ],
      nodeIds: [],
      nodePositions: {},
      nodes: [],
      edges: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects multiple canvases when the active canvas id is not listed', () => {
    const result = WorkspaceGraphAuthoringDraftSchema.safeParse({
      canvas: {
        id: 'canvas-missing',
        kind: 'transformation',
        title: 'Missing canvas',
      },
      activeCanvasId: 'canvas-missing',
      canvases: [
        {
          canvas: {
            id: 'canvas-existing',
            kind: 'transformation',
            title: 'Existing canvas',
          },
          nodeIds: [],
          nodePositions: {},
          nodes: [],
          edges: [],
        },
      ],
      nodeIds: [],
      nodePositions: {},
      nodes: [],
      edges: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects edges that reference nodes outside the aggregate', () => {
    const result = WorkspaceGraphAuthoringDraftSchema.safeParse({
      canvas: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      nodeIds: [sourceNode.id],
      nodePositions: {
        [sourceNode.id]: { x: 120, y: 80 },
      },
      nodes: [sourceNode],
      edges: [
        {
          id: 'edge-1',
          sourceId: sourceNode.id,
          targetId: 'missing-node',
          relation: 'lineage',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects drafts without canvas document identity', () => {
    const result = WorkspaceGraphAuthoringDraftSchema.safeParse({
      nodeIds: [],
      nodePositions: {},
      nodes: [],
      edges: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepts add-node commands as pure aggregate mutations', () => {
    const result = WorkspaceGraphAuthoringCommandSchema.safeParse({
      type: WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.addNode,
      node: sourceNode,
      position: { x: 120, y: 80 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects application concerns inside aggregate commands', () => {
    const result = WorkspaceGraphAuthoringCommandSchema.safeParse({
      type: WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.addNode,
      node: sourceNode,
      position: { x: 120, y: 80 },
      idempotencyKey: 'save-1',
    });

    expect(result.success).toBe(false);
  });
});
