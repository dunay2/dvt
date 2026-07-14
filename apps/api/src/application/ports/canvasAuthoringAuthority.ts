import type { CanvasAuthoringAuthorityBinding, WorkspaceGraphDraftScope } from '@dvt/contracts';

export interface CanvasAuthoringAuthorityKey extends WorkspaceGraphDraftScope {
  readonly canvasId: string;
}

export interface CanvasAuthoringAuthorityStoredRecord {
  readonly key: CanvasAuthoringAuthorityKey;
  readonly binding: CanvasAuthoringAuthorityBinding;
  readonly revision: string;
  readonly updatedAt: string;
}

export type CanvasAuthoringAuthorityBindResult =
  | {
      readonly kind: 'bound';
      readonly record: CanvasAuthoringAuthorityStoredRecord;
      readonly deduplicated: boolean;
    }
  | {
      readonly kind: 'conflict';
      readonly current: CanvasAuthoringAuthorityStoredRecord;
    }
  | { readonly kind: 'idempotency_mismatch' };

export type CanvasAuthoringAuthorityReleaseResult =
  | { readonly kind: 'released' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'conflict'; readonly currentRevision: string }
  | { readonly kind: 'idempotency_mismatch' };

export interface ICanvasAuthoringAuthorityStore {
  migrate(): Promise<void>;
  close(): Promise<void>;
  read(key: CanvasAuthoringAuthorityKey): Promise<CanvasAuthoringAuthorityStoredRecord | null>;
  bind(input: {
    readonly key: CanvasAuthoringAuthorityKey;
    readonly binding: CanvasAuthoringAuthorityBinding;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly revision: string;
    readonly nowIso: string;
  }): Promise<CanvasAuthoringAuthorityBindResult>;
  release(input: {
    readonly key: CanvasAuthoringAuthorityKey;
    readonly expectedRevision: string;
    readonly idempotencyKey: string;
    readonly requestHash: string;
  }): Promise<CanvasAuthoringAuthorityReleaseResult>;
}
