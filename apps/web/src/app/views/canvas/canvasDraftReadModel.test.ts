import { describe, expect, it } from 'vitest';

import type { WorkspaceGraphDraftAuthoringReadResult } from '../../ports/workspaceGraphDraftAuthoring';
import {
  buildDraftReadDeniedResponse,
  buildDraftReadOkResponse,
} from '../../services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import {
  createUnknownCanvasAuthoringDraftReadModel,
  projectCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';

const DEFAULT_CANVAS_AUTHORING_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

function buildFormatErrorReadResult(): WorkspaceGraphDraftAuthoringReadResult {
  return {
    kind: 'format_error',
    capability: {
      scope: DEFAULT_CANVAS_AUTHORING_SCOPE,
      mode: 'read_only',
      canRead: true,
      canWrite: false,
      reason: 'write_denied',
    },
    auditRef: {
      correlationId: 'corr-format',
      decisionId: 'dec-format',
      action: 'draft_read',
      outcome: 'allowed',
      recordedAt: '2026-05-03T00:00:00.000Z',
    },
    formatError: {
      reason: 'unsupported_schema_version',
      storedSchemaVersion: 'workspace-graph-draft.v0',
    },
  };
}

describe('Canvas authoring draft read model', () => {
  it('projects ok protected reads without losing the authoring aggregate', () => {
    const result = projectCanvasAuthoringDraftReadModel(
      buildDraftReadOkResponse(DEFAULT_CANVAS_AUTHORING_SCOPE)
    );

    expect(result.accessMode).toBe('writable');
    expect(result.capabilityReason).toBe('authorized');
    expect(result.formatMeta?.schemaVersion).toBe('workspace-graph-draft.v1');
    expect(result.record?.revision).toBe('rev-1');
    expect(result.record?.savedAt).toBe('2026-04-18T01:00:00.000Z');
    expect(result.record?.draft.nodes.map((node) => node.id)).toEqual([
      'source_node',
      'transform_node',
      'sink_node',
    ]);
    expect(result.semanticGraph?.canonicalNodes.map((node) => node.id)).toEqual([
      'source_node',
      'transform_node',
      'sink_node',
    ]);
  });

  it('keeps not_found as an unknown read model with no synthetic draft', () => {
    const result = projectCanvasAuthoringDraftReadModel({ kind: 'not_found' });

    expect(result).toEqual(createUnknownCanvasAuthoringDraftReadModel());
  });

  it('projects denied reads without leaking a record', () => {
    const result = projectCanvasAuthoringDraftReadModel(
      buildDraftReadDeniedResponse(DEFAULT_CANVAS_AUTHORING_SCOPE)
    );

    expect(result.accessMode).toBe('forbidden');
    expect(result.capabilityReason).toBe('workspace_scope_denied');
    expect(result.record).toBeNull();
    expect(result.semanticGraph).toBeNull();
  });

  it('projects format errors as typed fail-closed outcomes', () => {
    const result: CanvasAuthoringDraftReadModel = projectCanvasAuthoringDraftReadModel(
      buildFormatErrorReadResult()
    );

    expect(result.accessMode).toBe('read_only');
    expect(result.capabilityReason).toBe('write_denied');
    expect(result.formatError).toEqual({
      reason: 'unsupported_schema_version',
      storedSchemaVersion: 'workspace-graph-draft.v0',
    });
    expect(result.record).toBeNull();
    expect(result.semanticGraph).toBeNull();
  });
});
