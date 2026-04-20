import type { DesignGraphDraft } from '@dvt/contracts';

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

const draftStoresByKey = new WeakMap<object, MockWorkspaceGraphDraftStore>();

export function getMockWorkspaceGraphDraftStore(
  draftStoreKey: object
): MockWorkspaceGraphDraftStore {
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

export function cloneDesignGraphDraft(draft: DesignGraphDraft): DesignGraphDraft {
  return structuredClone(draft);
}

export function createDraftRequestSignature(input: {
  expectedRevision: string | null;
  draft: DesignGraphDraft;
}): string {
  return JSON.stringify({
    expectedRevision: input.expectedRevision,
    draft: input.draft,
  });
}
