import type {
  DesignGraphDraft,
  WorkspaceGraphDraftAuditAction,
  WorkspaceGraphDraftAuditOutcome,
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityOutcome,
  WorkspaceGraphDraftCapabilityReason,
  WorkspaceGraphDraftFormatMeta,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { SessionContextPort } from '../../ports/sessionContext';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from './workspaceGraphDraftProtocol';

type MockWorkspaceGraphDraftRecord = {
  readonly revision: string;
  readonly updatedAt: string;
  readonly draft: DesignGraphDraft;
};

type MockIdempotencyEntry =
  | {
      readonly requestSignature: string;
      readonly outcome: 'saved';
      readonly revision: string;
    }
  | {
      readonly requestSignature: string;
      readonly outcome: 'conflict';
      readonly currentRevision: string;
    };

type MockWorkspaceGraphDraftStore = {
  currentRecord: MockWorkspaceGraphDraftRecord | null;
  idempotencyEntries: Map<string, MockIdempotencyEntry>;
};

type MockWorkspaceGraphDraftPortArgs = {
  draftStoreKey: object;
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>;
};

const draftStoresByKey = new WeakMap<object, MockWorkspaceGraphDraftStore>();

function readWorkspaceGraphDraftScope(
  sessionContext: Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'>
): WorkspaceGraphDraftScope {
  const scope = sessionContext.getWorkspaceScopeSnapshot();

  return {
    tenantId: scope.tenantId,
    projectId: scope.projectId,
    environmentId: scope.environmentId,
  };
}

function buildCapability(
  scope: WorkspaceGraphDraftScope,
  mode: WorkspaceGraphDraftCapabilityMode,
  reason: WorkspaceGraphDraftCapabilityReason
): WorkspaceGraphDraftCapabilityOutcome {
  switch (mode) {
    case 'writable':
      return { scope, mode, canRead: true, canWrite: true, reason };
    case 'read_only':
      return { scope, mode, canRead: true, canWrite: false, reason };
    case 'forbidden':
      return { scope, mode, canRead: false, canWrite: false, reason };
  }
}

function buildAuditRef(
  action: WorkspaceGraphDraftAuditAction,
  outcome: WorkspaceGraphDraftAuditOutcome
) {
  return {
    correlationId: 'mock-correlation-id',
    decisionId: 'mock-decision-id',
    action,
    outcome,
    recordedAt: new Date().toISOString(),
  };
}

function buildFormatMeta(): WorkspaceGraphDraftFormatMeta {
  return {
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    migrationState: 'native',
  };
}

function getDraftStore(draftStoreKey: object): MockWorkspaceGraphDraftStore {
  const existingStore = draftStoresByKey.get(draftStoreKey);
  if (existingStore) {
    return existingStore;
  }

  const nextStore: MockWorkspaceGraphDraftStore = {
    currentRecord: null,
    idempotencyEntries: new Map<string, MockIdempotencyEntry>(),
  };
  draftStoresByKey.set(draftStoreKey, nextStore);
  return nextStore;
}

function cloneDesignGraphDraft(draft: DesignGraphDraft): DesignGraphDraft {
  return structuredClone(draft);
}

function createRequestSignature(input: {
  expectedRevision: string | null;
  draft: DesignGraphDraft;
}): string {
  return JSON.stringify({
    expectedRevision: input.expectedRevision,
    draft: input.draft,
  });
}

export function createMockWorkspaceGraphDraftAuthoringPort({
  draftStoreKey,
  sessionContext,
}: MockWorkspaceGraphDraftPortArgs): IWorkspaceGraphDraftAuthoringPort {
  const store = getDraftStore(draftStoreKey);

  return {
    async readGraphDraft() {
      if (store.currentRecord == null) {
        return { kind: 'not_found' };
      }

      const scope = readWorkspaceGraphDraftScope(sessionContext);

      return {
        kind: 'ok',
        capability: buildCapability(scope, 'writable', 'authorized'),
        auditRef: buildAuditRef('draft_read', 'allowed'),
        formatMeta: buildFormatMeta(),
        record: {
          scope,
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          revision: store.currentRecord.revision,
          draft: cloneDesignGraphDraft(store.currentRecord.draft),
          updatedAt: store.currentRecord.updatedAt,
        },
      };
    },

    async saveGraphDraft(input) {
      const scope = readWorkspaceGraphDraftScope(sessionContext);
      const requestSignature = createRequestSignature(input);
      const existingIdempotencyEntry = store.idempotencyEntries.get(input.idempotencyKey);

      if (existingIdempotencyEntry) {
        if (existingIdempotencyEntry.requestSignature !== requestSignature) {
          return { kind: 'idempotency_mismatch' };
        }

        if (existingIdempotencyEntry.outcome === 'saved') {
          return {
            kind: 'saved',
            capability: buildCapability(scope, 'writable', 'authorized'),
            auditRef: buildAuditRef('draft_write', 'allowed'),
            formatMeta: buildFormatMeta(),
            revision: existingIdempotencyEntry.revision,
          };
        }

        return {
          kind: 'conflict',
          capability: buildCapability(scope, 'writable', 'authorized'),
          auditRef: buildAuditRef('draft_write', 'conflict'),
          formatMeta: buildFormatMeta(),
          currentRevision: existingIdempotencyEntry.currentRevision,
        };
      }

      const currentRevision = store.currentRecord?.revision ?? null;
      if (input.expectedRevision !== currentRevision && store.currentRecord != null) {
        const conflictEntry: MockIdempotencyEntry = {
          requestSignature,
          outcome: 'conflict',
          currentRevision: store.currentRecord.revision,
        };
        store.idempotencyEntries.set(input.idempotencyKey, conflictEntry);

        return {
          kind: 'conflict',
          capability: buildCapability(scope, 'writable', 'authorized'),
          auditRef: buildAuditRef('draft_write', 'conflict'),
          formatMeta: buildFormatMeta(),
          currentRevision: conflictEntry.currentRevision,
        };
      }

      const nextRecord: MockWorkspaceGraphDraftRecord = {
        revision: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        draft: cloneDesignGraphDraft(input.draft),
      };
      store.currentRecord = nextRecord;
      store.idempotencyEntries.set(input.idempotencyKey, {
        requestSignature,
        outcome: 'saved',
        revision: nextRecord.revision,
      });

      return {
        kind: 'saved',
        capability: buildCapability(scope, 'writable', 'authorized'),
        auditRef: buildAuditRef('draft_write', 'allowed'),
        formatMeta: buildFormatMeta(),
        revision: nextRecord.revision,
      };
    },
  };
}
