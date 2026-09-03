import {
  DvtTransformAuthoringAuthorityV1Schema,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON,
  type DvtSubstraitSemanticDocumentV1,
  type DvtTransformAuthoringAuthorityV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
} from '../../src/application/ports/workspaceFiles.js';
import type {
  IWorkspaceGraphDraftAuditPort,
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftDecisionContext,
} from '../../src/application/ports/workspaceGraphDraft.js';
import { GetWorkspaceGraphDraftUseCase } from '../../src/application/services/getWorkspaceGraphDraftUseCase.js';
import { SaveWorkspaceGraphDraftUseCase } from '../../src/application/services/saveWorkspaceGraphDraftUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../src/domain/auth/types.js';
import { TEST_WORKSPACE_SCOPE } from '../fixtures/workspaceGraphDraftFixture.js';

const audit: IWorkspaceGraphDraftAuditPort = { record: async () => undefined };
const unusedWorkspaceFiles: IWorkspaceFileRepository = {
  listFiles: async () => [],
  getFileContent: async () => {
    throw new Error('Semantic persistence must not read project files.');
  },
  saveFileContent: async () => {
    throw new Error('Semantic persistence must not write project files.');
  },
  deleteFileContent: async () => {
    throw new Error('Semantic persistence must not delete project files.');
  },
};
const unusedBatchMutation: IWorkspaceFileBatchMutationPort = {
  apply: async () => {
    throw new Error('Semantic persistence must not mutate project files.');
  },
};

export function buildSemanticSaveUseCase(
  store: IWorkspaceGraphDraftStore
): SaveWorkspaceGraphDraftUseCase {
  return new SaveWorkspaceGraphDraftUseCase(store, audit, () => new Date(), {
    workspaceFiles: unusedWorkspaceFiles,
    batchMutation: unusedBatchMutation,
  });
}

export function buildSemanticGetUseCase(
  store: IWorkspaceGraphDraftStore
): GetWorkspaceGraphDraftUseCase {
  return new GetWorkspaceGraphDraftUseCase(
    store,
    audit,
    {
      resolveGraphDraftReadAuthority: async ({ canvasId }) => ({
        kind: 'resolved',
        binding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId,
          authority: { kind: 'graph-draft' },
        },
      }),
    },
    {
      getConnection: async () => {
        throw new Error('The canonical fixture has no connected source metadata.');
      },
    }
  );
}

export function writableSemanticDecision(): WorkspaceGraphDraftDecisionContext {
  return {
    authentication: 'authenticated',
    requestId: 'request-1',
    correlationId: 'request-1',
    decisionId: 'decision-1',
    recordedAt: '2026-09-03T10:00:00.000Z',
    requestedScope: {
      tenantId: TenantId.unsafe(TEST_WORKSPACE_SCOPE.tenantId),
      projectId: ProjectId.unsafe(TEST_WORKSPACE_SCOPE.projectId),
      environmentId: EnvironmentId.unsafe(TEST_WORKSPACE_SCOPE.environmentId),
    },
    scope: TEST_WORKSPACE_SCOPE,
    capability: {
      scope: TEST_WORKSPACE_SCOPE,
      mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable,
      canRead: true,
      canWrite: true,
      reason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.authorized,
    },
  };
}

export function readTransformAuthority(
  draft: WorkspaceGraphAuthoringDraft
): DvtTransformAuthoringAuthorityV1 {
  const transform = draft.nodes.find(({ kind }) => kind === 'dvt:transform');
  return DvtTransformAuthoringAuthorityV1Schema.parse(transform?.metadata?.transformAuthoring);
}

export function withSemanticDocument(
  draft: WorkspaceGraphAuthoringDraft,
  semanticDocument: DvtSubstraitSemanticDocumentV1
): WorkspaceGraphAuthoringDraft {
  return {
    ...draft,
    nodes: draft.nodes.map((node) =>
      node.kind === 'dvt:transform'
        ? {
            ...node,
            metadata: {
              transformAuthoring: { version: 'v1', mode: 'substrait', semanticDocument },
            },
          }
        : node
    ),
  };
}
