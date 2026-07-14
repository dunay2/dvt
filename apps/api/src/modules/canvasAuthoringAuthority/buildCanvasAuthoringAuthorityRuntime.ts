import type { Pool } from 'pg';

import { CanvasAuthoringAuthorityPolicy } from '../../application/services/canvasAuthoringAuthorityPolicy.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';

export function buildCanvasAuthoringAuthorityRuntime(input: {
  readonly pool: Pool;
  readonly schema: string;
  readonly queryTimeoutMs?: number;
}) {
  const canvasAuthoringAuthorityStore = new PostgresCanvasAuthoringAuthorityStore(input);
  const canvasAuthoringAuthorityPolicy = new CanvasAuthoringAuthorityPolicy(
    canvasAuthoringAuthorityStore
  );
  return { canvasAuthoringAuthorityStore, canvasAuthoringAuthorityPolicy };
}
