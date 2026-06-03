/**
 * Owned concern: define the API application port family for protected
 * workspace graph draft read/write persistence.
 *
 * The port owns capability, audit, telemetry, schema-version, revision, and
 * store-facing authoring draft semantics. It does not own HTTP transport,
 * Canvas projection, compile projection, or runtime execution.
 */
import type {
  WorkspaceGraphAuthoringDraft,
  WorkspaceGraphDraftCapabilityMode,
  WorkspaceGraphDraftCapabilityOutcome,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type {
  AuthenticatedPrincipal,
  EnvironmentId,
  ProjectId,
  TenantId,
} from '../../domain/auth/types.js';

import {
  AUTHORIZATION_ACTION,
  type CommandAuthorizationAction,
  type QueryAuthorizationAction,
} from './accessDecision.js';

export const WORKSPACE_GRAPH_DRAFT_ACTION = {
  view: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  save: AUTHORIZATION_ACTION.workspaceGraphDraftSave,
} as const satisfies {
  readonly view: QueryAuthorizationAction;
  readonly save: CommandAuthorizationAction;
};

export const WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION = 'workspace-graph-draft.v1';
export const WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION = 'initial';

export interface WorkspaceGraphDraftRequestedScope {
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
}

export interface WorkspaceGraphDraftStoredRecord {
  readonly scope: WorkspaceGraphDraftScope;
  readonly schemaVersion: string;
  readonly revision: string;
  readonly draftPayload: unknown;
  readonly updatedAt: string;
}

export type WorkspaceGraphDraftSaveStoreResult =
  | {
      readonly kind: 'saved';
      readonly schemaVersion: string;
      readonly revision: string;
      readonly updatedAt: string;
      readonly deduplicated: boolean;
    }
  | {
      readonly kind: 'conflict';
      readonly currentRevision: string;
      readonly storedSchemaVersion: string;
      readonly updatedAt: string | null;
    }
  | {
      readonly kind: 'idempotency_mismatch';
    };

export interface IWorkspaceGraphDraftStore {
  migrate(): Promise<void>;
  close(): Promise<void>;
  read(scope: WorkspaceGraphDraftScope): Promise<WorkspaceGraphDraftStoredRecord | null>;
  save(input: {
    readonly scope: WorkspaceGraphDraftScope;
    readonly schemaVersion: string;
    readonly expectedRevision: string;
    readonly idempotencyKey: string;
    readonly draft: WorkspaceGraphAuthoringDraft;
    readonly requestHash: string;
    readonly revision: string;
    readonly nowIso: string;
  }): Promise<WorkspaceGraphDraftSaveStoreResult>;
}

export interface WorkspaceGraphDraftDecisionContext {
  readonly authentication: 'authenticated' | 'unauthenticated';
  readonly requestId: string;
  readonly correlationId: string;
  readonly decisionId: string;
  readonly recordedAt: string;
  readonly requestedScope: WorkspaceGraphDraftRequestedScope;
  readonly scope: WorkspaceGraphDraftScope;
  readonly capability: WorkspaceGraphDraftCapabilityOutcome;
  readonly principal?: AuthenticatedPrincipal;
}

export interface IWorkspaceGraphDraftAuditPort {
  record(input: {
    readonly action: 'draft_read' | 'draft_write';
    readonly outcome: 'allowed' | 'read_only' | 'forbidden' | 'conflict';
    readonly decision: WorkspaceGraphDraftDecisionContext;
    readonly metadata?: Readonly<Record<string, unknown>>;
  }): Promise<void>;
}

export type WorkspaceGraphDraftReadTelemetryOutcome =
  | 'ok'
  | 'format_error'
  | 'denied'
  | 'not_found';
export type WorkspaceGraphDraftWriteTelemetryOutcome =
  | 'saved'
  | 'conflict'
  | 'denied'
  | 'idempotency_mismatch';

export interface IWorkspaceGraphDraftTelemetry {
  recordRead(
    outcome: WorkspaceGraphDraftReadTelemetryOutcome,
    mode: WorkspaceGraphDraftCapabilityMode,
    latencyMs: number
  ): void;
  recordWrite(
    outcome: WorkspaceGraphDraftWriteTelemetryOutcome,
    mode: WorkspaceGraphDraftCapabilityMode,
    latencyMs: number
  ): void;
}
