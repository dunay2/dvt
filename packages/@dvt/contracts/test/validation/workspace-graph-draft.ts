import { describe, expect, it } from 'vitest';

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
  context: {
    tenantId: baseScope.tenantId,
    projectId: baseScope.projectId,
    environmentId: baseScope.environmentId,
    executionTarget: 'postgres',
  },
  nodes: [
    {
      id: 'source-1',
      type: 'source',
      payload: {
        kind: 'postgres_table',
        schema: 'raw',
        table: 'orders',
        alias: 'orders_src',
      },
    },
    {
      id: 'transform-1',
      type: 'sql_transform',
      payload: {
        dialect: 'postgres',
        entrypoint: 'models/orders.sql',
        sqlArtifact: {
          repo: 'org/repo',
          path: 'models/orders.sql',
          ref: 'refs/heads/main',
          commitSha: 'commit-sql-1',
          contentSha256: 'a'.repeat(64),
        },
      },
    },
    {
      id: 'sink-1',
      type: 'sink',
      payload: {
        kind: 'postgres_table',
        schema: 'analytics',
        table: 'orders_daily',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  ],
  edges: [
    { fromNodeId: 'source-1', toNodeId: 'transform-1' },
    { fromNodeId: 'transform-1', toNodeId: 'sink-1' },
  ],
} as const;

function buildWritableCapability() {
  return {
    scope: baseScope,
    mode: 'writable' as const,
    canRead: true,
    canWrite: true,
    reason: 'authorized' as const,
  };
}

function buildReadOnlyCapability() {
  return {
    scope: baseScope,
    mode: 'read_only' as const,
    canRead: true,
    canWrite: false,
    reason: 'write_denied' as const,
  };
}

export function registerValidationWorkspaceGraphDraftSuite(): void {
  describe('workspace graph-draft persistence boundary contracts', () => {
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
    });

    it('rejects save response when denied uses writable capability mode', () => {
      expect(() =>
        parseWorkspaceGraphDraftSaveResponse({
          kind: 'denied',
          capability: buildWritableCapability(),
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

    it('parses read format_error outcome with read capability and audit correlation', () => {
      const response = parseWorkspaceGraphDraftReadResponse({
        kind: 'format_error',
        capability: buildReadOnlyCapability(),
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
  });
}
