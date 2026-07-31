import type { Pool } from 'pg';

import type { IWorkspaceGraphDraftStore } from '../../application/ports/workspaceGraphDraft.js';
import { CanvasAuthoringAuthorityPolicy } from '../../application/services/canvasAuthoringAuthorityPolicy.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';

export function buildCanvasAuthoringAuthorityRuntime(input: {
  readonly pool: Pool;
  readonly schema: string;
  readonly workspaceGraphDraftStore: IWorkspaceGraphDraftStore;
  readonly queryTimeoutMs?: number;
}) {
  const canvasAuthoringAuthorityStore = new PostgresCanvasAuthoringAuthorityStore(input);
  const canvasAuthoringAuthorityPolicy = new CanvasAuthoringAuthorityPolicy(
    canvasAuthoringAuthorityStore,
    input.workspaceGraphDraftStore
  );
  return { canvasAuthoringAuthorityStore, canvasAuthoringAuthorityPolicy };
}
