/**
 * Owned concern: guard semantic architecture rules for the workspace graph
 * authoring draft aggregate.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE,
  WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION,
  WORKSPACE_GRAPH_AUTHORING_NODE_ROLE,
  WORKSPACE_GRAPH_AUTHORING_NODE_STATUS,
  WorkspaceGraphAuthoringCommandSchema,
  WorkspaceGraphDraftSaveRequestSchema,
} from '../src/index.js';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../../docs/architecture/components/planner/workspace-authoring-draft-aggregate.md'
);
const PLANNER_CONTRACTS_ROOT = join(import.meta.dirname, '../src/contracts/planner');
const AUTHORING_DRAFT_PATH = join(PLANNER_CONTRACTS_ROOT, 'WorkspaceGraphAuthoringDraft.v1.ts');
const AUTHORING_COMMAND_PATH = join(PLANNER_CONTRACTS_ROOT, 'WorkspaceGraphAuthoringCommand.v1.ts');
const DRAFT_ENVELOPE_PATH = join(PLANNER_CONTRACTS_ROOT, 'WorkspaceGraphDraft.v1.ts');

const scope = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

const sqlNode = {
  id: 'sql-1',
  name: 'Transform orders',
  pluginId: 'dbt',
  kind: 'sql_transform',
  role: WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.transform,
  status: WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.idle,
  tags: ['sql'],
} as const;

const looseNode = {
  id: 'loose-dashboard',
  name: 'Draft dashboard',
  pluginId: 'dbt',
  kind: 'dashboard',
  role: WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.output,
  status: WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.idle,
  tags: ['loose'],
} as const;

describe('WorkspaceGraphAuthoringDraft component architecture', () => {
  it('ships a local component guide with API, invariants, transitions, and consumers', () => {
    expect(existsSync(DOC_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Execution selection rule',
      '## Erosion path to prevent',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
    expect(docText).toContain('canonical Substrait');
    expect(docText).toContain('API compiles, stores, validates, and admits');
    expect(docText).toContain('shadow engine');
  });

  it('states owned concern docblocks on aggregate and persistence modules', () => {
    for (const path of [AUTHORING_DRAFT_PATH, AUTHORING_COMMAND_PATH, DRAFT_ENVELOPE_PATH]) {
      expect(readFileSync(path, 'utf8')).toContain('Owned concern:');
    }
  });

  it('keeps the protected draft envelope on authoring aggregate truth only', () => {
    const envelopeSource = readFileSync(DRAFT_ENVELOPE_PATH, 'utf8');

    expect(envelopeSource).toContain('WorkspaceGraphAuthoringDraftSchema');
    expect(envelopeSource).toContain('draft: WorkspaceGraphAuthoringDraft');
  });

  it('accepts disconnected authoring drafts because execution selection is downstream', () => {
    const result = WorkspaceGraphDraftSaveRequestSchema.safeParse({
      scope,
      schemaVersion: 'workspace-graph-draft.v1',
      expectedRevision: 'initial',
      idempotencyKey: 'save-first-authoring-draft',
      draft: {
        canvas: {
          kind: 'workspace-graph-authoring-canvas',
          title: 'Authoring draft',
        },
        nodeIds: [sqlNode.id, looseNode.id],
        nodePositions: {
          [sqlNode.id]: { x: 120, y: 80 },
          [looseNode.id]: { x: 420, y: 180 },
        },
        nodes: [sqlNode, looseNode],
        edges: [],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects compile-shaped drafts as persistence payloads', () => {
    const result = WorkspaceGraphDraftSaveRequestSchema.safeParse({
      scope,
      schemaVersion: 'workspace-graph-draft.v1',
      expectedRevision: 'initial',
      idempotencyKey: 'save-legacy-compile-draft',
      draft: {
        context: {
          tenantId: scope.tenantId,
          projectId: scope.projectId,
          environmentId: scope.environmentId,
          executionTarget: 'postgres',
        },
        nodes: [],
        edges: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it('keeps aggregate commands pure and outside application orchestration metadata', () => {
    const result = WorkspaceGraphAuthoringCommandSchema.safeParse({
      type: WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.connectNodes,
      edge: {
        id: 'edge-1',
        sourceId: sqlNode.id,
        targetId: looseNode.id,
        relation: WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION.lineage,
      },
      expectedRevision: 'rev-1',
      idempotencyKey: 'save-1',
    });

    expect(result.success).toBe(false);
  });
});
