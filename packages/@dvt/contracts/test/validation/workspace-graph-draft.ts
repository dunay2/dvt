import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
  WorkspaceGraphAuthoringDraftSchema,
  resolveWorkspaceGraphDraftCanvasIds,
} from '../../src/index.js';
import {
  ContractValidationError,
  parseWorkspaceGraphDraftReadResponse,
  parseWorkspaceGraphDraftSaveRequest,
  parseWorkspaceGraphDraftSaveResponse,
} from '../../src/validation.js';

const baseScope = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'prod',
} as const;

const baseDraft = {
  canvas: {
    kind: 'transformation',
    title: 'Main canvas',
  },
  nodeIds: ['source-1'],
  nodePositions: {
    'source-1': { x: 120, y: 80 },
  },
  nodes: [
    {
      id: 'source-1',
      name: 'Orders source',
      pluginId: 'dbt',
      kind: 'postgres_table',
      role: 'input',
      status: 'idle',
      tags: ['source'],
    },
  ],
  edges: [],
} as const;

const compileShapedDraft = {
  context: {
    tenantId: baseScope.tenantId,
    projectId: baseScope.projectId,
    environmentId: baseScope.environmentId,
    executionTarget: 'postgres',
  },
  nodes: [],
  edges: [],
} as const;

type WorkspaceGraphDraftCapabilityFixture = {
  scope: typeof baseScope;
  mode: 'writable' | 'read_only';
  canRead: true;
  canWrite: boolean;
  reason: 'authorized' | 'write_denied';
};

function buildCapabilityFixture<
  TCapability extends Omit<WorkspaceGraphDraftCapabilityFixture, 'scope'>,
>(capability: TCapability): { scope: typeof baseScope } & TCapability {
  return {
    scope: baseScope,
    ...capability,
  };
}

const writableCapability = buildCapabilityFixture({
  mode: 'writable' as const,
  canRead: true as const,
  canWrite: true as const,
  reason: 'authorized' as const,
});

const readOnlyCapability = buildCapabilityFixture({
  mode: 'read_only' as const,
  canRead: true as const,
  canWrite: false as const,
  reason: 'write_denied' as const,
});

export function registerValidationWorkspaceGraphDraftSuite(): void {
  describe('workspace graph-draft persistence boundary contracts', () => {
    it('owns the active schema and initial revision protocol constants', () => {
      expect(WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION).toBe('workspace-graph-draft.v1');
      expect(WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION).toBe('initial');
    });

    it('projects every declared Canvas identity through one sorted set', () => {
      const draft = WorkspaceGraphAuthoringDraftSchema.parse({
        ...baseDraft,
        canvas: { ...baseDraft.canvas, id: 'secondary-canvas', title: 'Secondary' },
        activeCanvasId: 'secondary-canvas',
        canvases: [
          {
            canvas: { ...baseDraft.canvas, id: 'main-canvas' },
            nodeIds: [],
            nodePositions: {},
            nodes: [],
            edges: [],
          },
          {
            canvas: { ...baseDraft.canvas, id: 'secondary-canvas', title: 'Secondary' },
            nodeIds: baseDraft.nodeIds,
            nodePositions: baseDraft.nodePositions,
            nodes: baseDraft.nodes,
            edges: baseDraft.edges,
          },
        ],
      });

      expect(resolveWorkspaceGraphDraftCanvasIds(draft)).toEqual([
        'main-canvas',
        'secondary-canvas',
      ]);
    });

    it('parses save request with compare-and-swap and idempotency semantics', () => {
      const request = parseWorkspaceGraphDraftSaveRequest({
        scope: baseScope,
        schemaVersion: 'workspace-graph-draft.v1',
        expectedRevision: 'rev-17',
        idempotencyKey: 'save-tenant-a-project-a-prod-rev-17',
        draft: baseDraft,
      });

      expect(request.expectedRevision).toBe('rev-17');
      expect(request.idempotencyKey).toContain('save-');
      expect(request.draft.nodeIds).toEqual(['source-1']);
    });

    it('rejects compile-shaped drafts as the editable persistence aggregate', () => {
      expect(() =>
        parseWorkspaceGraphDraftSaveRequest({
          scope: baseScope,
          schemaVersion: 'workspace-graph-draft.v1',
          expectedRevision: 'rev-18',
          idempotencyKey: 'save-tenant-a-project-a-prod-rev-18',
          draft: compileShapedDraft,
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects save requests when canvas document identity is missing', () => {
      expect(() =>
        parseWorkspaceGraphDraftSaveRequest({
          scope: baseScope,
          schemaVersion: 'workspace-graph-draft.v1',
          expectedRevision: 'rev-18a',
          idempotencyKey: 'save-tenant-a-project-a-prod-rev-18a',
          draft: {
            nodeIds: [],
            nodePositions: {},
            nodes: [],
            edges: [],
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects save response when denied uses writable capability mode', () => {
      expect(() =>
        parseWorkspaceGraphDraftSaveResponse({
          kind: 'denied',
          capability: writableCapability,
          auditRef: {
            correlationId: 'corr-1',
            decisionId: 'dec-1',
            action: 'draft_write',
            outcome: 'read_only',
            recordedAt: '2026-04-16T10:00:00.000Z',
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('parses special save outcomes through the canonical response vocabulary', () => {
      const response = parseWorkspaceGraphDraftSaveResponse({
        kind: 'unsupported_schema_version',
        capability: writableCapability,
        auditRef: {
          correlationId: 'corr-schema',
          decisionId: 'dec-schema',
          action: 'draft_write',
          outcome: 'allowed',
          recordedAt: '2026-04-16T10:00:30.000Z',
        },
        expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        requestedSchemaVersion: 'workspace-graph-draft.v0',
      });

      expect(response).toMatchObject({
        kind: 'unsupported_schema_version',
        expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      });
    });

    it('parses read format_error outcome with read capability and audit correlation', () => {
      const response = parseWorkspaceGraphDraftReadResponse({
        kind: 'format_error',
        capability: readOnlyCapability,
        auditRef: {
          correlationId: 'corr-2',
          decisionId: 'dec-2',
          action: 'draft_read',
          outcome: 'read_only',
          recordedAt: '2026-04-16T10:01:00.000Z',
        },
        formatError: {
          reason: 'unsupported_schema_version',
          storedSchemaVersion: 'workspace-graph-draft.v0',
        },
      });

      expect(response.kind).toBe('format_error');
      expect(response.auditRef.action).toBe('draft_read');
    });

    it('parses the active graph-draft authority as part of the canonical read model', () => {
      const authorityAwareDraft = {
        ...baseDraft,
        canvas: {
          ...baseDraft.canvas,
          id: 'main-canvas',
        },
      };
      const response = parseWorkspaceGraphDraftReadResponse({
        kind: 'ok',
        capability: writableCapability,
        auditRef: {
          correlationId: 'corr-3',
          decisionId: 'dec-3',
          action: 'draft_read',
          outcome: 'allowed',
          recordedAt: '2026-04-16T10:02:00.000Z',
        },
        formatMeta: {
          schemaVersion: 'workspace-graph-draft.v1',
          storedSchemaVersion: 'workspace-graph-draft.v1',
          migrationState: 'native',
        },
        authoringAuthority: {
          kind: 'resolved',
          binding: {
            schemaVersion: 'canvas-authoring-authority-binding.v1',
            canvasId: 'main-canvas',
            authority: { kind: 'graph-draft' },
          },
        },
        record: {
          scope: baseScope,
          schemaVersion: 'workspace-graph-draft.v1',
          revision: 'rev-19',
          draft: authorityAwareDraft,
          updatedAt: '2026-04-16T10:02:00.000Z',
        },
      });

      expect(response).toMatchObject({
        kind: 'ok',
        authoringAuthority: {
          kind: 'resolved',
          binding: {
            canvasId: 'main-canvas',
            authority: { kind: 'graph-draft' },
          },
        },
      });
    });

    it('rejects an authority binding for a different active Canvas', () => {
      expect(() =>
        parseWorkspaceGraphDraftReadResponse({
          kind: 'ok',
          capability: writableCapability,
          auditRef: {
            correlationId: 'corr-4',
            decisionId: 'dec-4',
            action: 'draft_read',
            outcome: 'allowed',
            recordedAt: '2026-04-16T10:03:00.000Z',
          },
          formatMeta: {
            schemaVersion: 'workspace-graph-draft.v1',
            storedSchemaVersion: 'workspace-graph-draft.v1',
            migrationState: 'native',
          },
          authoringAuthority: {
            kind: 'resolved',
            binding: {
              schemaVersion: 'canvas-authoring-authority-binding.v1',
              canvasId: 'other-canvas',
              authority: { kind: 'graph-draft' },
            },
          },
          record: {
            scope: baseScope,
            schemaVersion: 'workspace-graph-draft.v1',
            revision: 'rev-20',
            draft: {
              ...baseDraft,
              canvas: {
                ...baseDraft.canvas,
                id: 'main-canvas',
              },
            },
            updatedAt: '2026-04-16T10:03:00.000Z',
          },
        })
      ).toThrow(ContractValidationError);
    });
  });
}
