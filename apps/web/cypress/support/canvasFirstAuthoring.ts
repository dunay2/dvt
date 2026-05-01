/**
 * Owned concern: resolve and preflight the live first-authoring workspace scope
 * without seeding draft success outside the Canvas UI flow.
 */
import { hasLiveProtectedRuntimeEnv, resolveLiveWorkspaceSession } from './liveProtectedRuntime';
import type { E2eWorkspaceSession } from './workspaceSession';

type FirstAuthoringVariant = 'transformation' | 'dbt';
type DraftNodePosition = Readonly<{ x: number; y: number }>;
type CanvasLayoutStorageBody = {
  readonly state?: {
    readonly canvasLayouts?: unknown;
  };
  readonly canvasLayouts?: unknown;
};
type WorkspaceGraphDraftReadBody = {
  readonly kind?: unknown;
  readonly record?: {
    readonly revision?: unknown;
    readonly draft?: {
      readonly nodeIds?: unknown;
      readonly nodePositions?: unknown;
    };
  };
};
type DraftReadRequest = Readonly<{
  method: 'GET';
  url: string;
  headers: Readonly<{
    Authorization: string;
    Accept: 'application/json';
  }>;
  auth: Readonly<{
    bearer: string;
  }>;
  failOnStatusCode: false;
}>;

const CANVAS_INTERACTION_STORAGE_KEY = 'dvt-web-canvas-interaction';

function isLiveProtectedRuntimeRequired(): boolean {
  const value = Cypress.env('requireLiveProtectedRuntime');

  return value === true || value === '1' || value === 'true';
}

export function requireLiveProtectedRuntimeEnv(): void {
  if (hasLiveProtectedRuntimeEnv()) {
    return;
  }

  throw new Error(
    'Cypress env apiBaseUrl and apiBearerToken are required when first-authoring live proof is mandatory'
  );
}

export function skipWhenFirstAuthoringLiveEnvIsMissing(context: Mocha.Context): boolean {
  if (hasLiveProtectedRuntimeEnv()) {
    return false;
  }

  if (isLiveProtectedRuntimeRequired()) {
    requireLiveProtectedRuntimeEnv();
  }

  context.skip();
  return true;
}

export function resolveLiveFirstAuthoringWorkspaceSession(
  variant: FirstAuthoringVariant = 'transformation'
): E2eWorkspaceSession {
  const session = resolveLiveWorkspaceSession();
  const configuredRunId = Cypress.env('firstAuthoringRunId');
  const runId =
    typeof configuredRunId === 'string' && configuredRunId.trim().length > 0
      ? configuredRunId.trim()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  Cypress.env('firstAuthoringRunId', runId);

  return {
    tenantId: session.tenantId,
    projectId: `${session.projectId}-tf-e2-m-c-first-authoring-${variant}-${runId}`,
    environmentId: session.environmentId,
  };
}

function readRequiredFirstAuthoringEnv(name: 'apiBaseUrl' | 'apiBearerToken'): string {
  const value = Cypress.env(name);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Cypress env ${name} is required for the first-authoring live proof`);
  }

  return value.trim();
}

function buildDraftReadUrl(session: E2eWorkspaceSession): string {
  const query = new URLSearchParams(session);

  return `${readRequiredFirstAuthoringEnv('apiBaseUrl')}/workspace/graph/draft?${query.toString()}`;
}

function buildDraftReadRequest(session: E2eWorkspaceSession): DraftReadRequest {
  const apiBearerToken = readRequiredFirstAuthoringEnv('apiBearerToken');

  return {
    method: 'GET' as const,
    url: buildDraftReadUrl(session),
    headers: {
      Authorization: `Bearer ${apiBearerToken}`,
      Accept: 'application/json',
    },
    auth: {
      bearer: apiBearerToken,
    },
    failOnStatusCode: false,
  };
}

function resolveDraftNodePosition(
  body: WorkspaceGraphDraftReadBody,
  nodeId: string
): DraftNodePosition | null {
  if (body.kind !== 'ok') {
    return null;
  }

  const nodeIds = body.record?.draft?.nodeIds;
  const nodePositions = body.record?.draft?.nodePositions;
  if (!Array.isArray(nodeIds) || nodeIds.includes(nodeId) === false) {
    return null;
  }

  if (nodePositions === null || typeof nodePositions !== 'object') {
    return null;
  }

  const position = (nodePositions as Record<string, unknown>)[nodeId];
  if (position === null || typeof position !== 'object') {
    return null;
  }

  const { x, y } = position as { x?: unknown; y?: unknown };
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
}

function positionsDiffer(left: DraftNodePosition, right: DraftNodePosition): boolean {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y) > 1;
}

function readWorkspaceLayoutKey(session: E2eWorkspaceSession): string {
  return `${session.tenantId}::${session.projectId}::${session.environmentId}`;
}

function summarizeDraftReadResponse(response: Cypress.Response<unknown>): string {
  const body = response.body as WorkspaceGraphDraftReadBody;
  const nodeIds = body.record?.draft?.nodeIds;
  const nodePositions = body.record?.draft?.nodePositions;
  const positions =
    nodePositions !== null && typeof nodePositions === 'object'
      ? (nodePositions as Record<string, unknown>)
      : {};
  const positionIds =
    nodePositions !== null && typeof nodePositions === 'object' ? Object.keys(positions) : [];

  return JSON.stringify({
    status: response.status,
    kind: body.kind,
    revision: body.record?.revision,
    nodeIds: Array.isArray(nodeIds) ? nodeIds : [],
    positions: Object.fromEntries(
      positionIds.map((positionId) => [positionId, positions[positionId]])
    ),
  });
}

function readCanvasLayoutsFromStorage(body: CanvasLayoutStorageBody): Record<string, unknown> {
  const canvasLayouts = body.state?.canvasLayouts ?? body.canvasLayouts;

  return canvasLayouts !== null && typeof canvasLayouts === 'object'
    ? (canvasLayouts as Record<string, unknown>)
    : {};
}

function resolveCanvasLayoutNodePosition(args: {
  window: Cypress.AUTWindow;
  session: E2eWorkspaceSession;
  nodeId: string;
}): DraftNodePosition | null {
  const stored = args.window.localStorage.getItem(CANVAS_INTERACTION_STORAGE_KEY);
  if (stored == null) {
    return null;
  }

  const parsed = JSON.parse(stored) as CanvasLayoutStorageBody;
  const layout = readCanvasLayoutsFromStorage(parsed)[readWorkspaceLayoutKey(args.session)];
  if (layout === null || typeof layout !== 'object') {
    return null;
  }

  const nodePositions = (layout as { nodePositions?: unknown }).nodePositions;
  if (nodePositions === null || typeof nodePositions !== 'object') {
    return null;
  }

  const position = (nodePositions as Record<string, unknown>)[args.nodeId];
  if (position === null || typeof position !== 'object') {
    return null;
  }

  const { x, y } = position as { x?: unknown; y?: unknown };
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
}

function summarizeCanvasLayoutStorage(args: {
  window: Cypress.AUTWindow;
  session: E2eWorkspaceSession;
}): string {
  const stored = args.window.localStorage.getItem(CANVAS_INTERACTION_STORAGE_KEY);
  if (stored == null) {
    return JSON.stringify({ storage: 'missing' });
  }

  const parsed = JSON.parse(stored) as CanvasLayoutStorageBody;
  const workspaceLayoutKey = readWorkspaceLayoutKey(args.session);
  const canvasLayouts = readCanvasLayoutsFromStorage(parsed);
  const layout = canvasLayouts[workspaceLayoutKey] ?? null;
  const state =
    parsed.state !== null && typeof parsed.state === 'object'
      ? (parsed.state as Record<string, unknown>)
      : null;

  return JSON.stringify({
    storage: 'present',
    topLevelKeys: Object.keys(parsed),
    stateKeys: state == null ? [] : Object.keys(state),
    canvasLayoutKeys: Object.keys(canvasLayouts),
    workspaceLayoutKey,
    layout,
    rawPrefix: stored.slice(0, 320),
  });
}

function pollLiveDraftNodePosition(args: {
  variant: FirstAuthoringVariant;
  nodeId: string;
  previousPosition?: DraftNodePosition;
  attemptsRemaining: number;
}): Cypress.Chainable<DraftNodePosition> {
  const session = resolveLiveFirstAuthoringWorkspaceSession(args.variant);

  return cy.request(buildDraftReadRequest(session)).then((response) => {
    const position = resolveDraftNodePosition(
      response.body as WorkspaceGraphDraftReadBody,
      args.nodeId
    );
    const statusCode = Number(response.status);
    const positionMatches =
      position != null &&
      (args.previousPosition == null || positionsDiffer(position, args.previousPosition));

    if (statusCode === 200 && positionMatches) {
      return position;
    }

    if (args.attemptsRemaining <= 0) {
      throw new Error(
        `Timed out waiting for persisted first-authoring draft node ${args.nodeId} in ${
          session.projectId
        }. Last draft read: ${summarizeDraftReadResponse(response)}`
      );
    }

    return cy.wait(250).then(() =>
      pollLiveDraftNodePosition({
        ...args,
        attemptsRemaining: args.attemptsRemaining - 1,
      })
    );
  });
}

function pollLiveCanvasLayoutNodePosition(args: {
  variant: FirstAuthoringVariant;
  nodeId: string;
  previousPosition: DraftNodePosition;
  attemptsRemaining: number;
}): Cypress.Chainable<DraftNodePosition> {
  const session = resolveLiveFirstAuthoringWorkspaceSession(args.variant);

  return cy.window({ log: false }).then((window) => {
    const position = resolveCanvasLayoutNodePosition({
      window,
      session,
      nodeId: args.nodeId,
    });
    if (position != null && positionsDiffer(position, args.previousPosition)) {
      return position;
    }

    if (args.attemptsRemaining <= 0) {
      throw new Error(
        `Timed out waiting for route-local first-authoring layout position for ${
          args.nodeId
        } in ${session.projectId}. Last layout read: ${summarizeCanvasLayoutStorage({
          window,
          session,
        })}`
      );
    }

    return cy.wait(250).then(() =>
      pollLiveCanvasLayoutNodePosition({
        ...args,
        attemptsRemaining: args.attemptsRemaining - 1,
      })
    );
  });
}

export function waitForLiveFirstAuthoringDraftNode(
  variant: FirstAuthoringVariant,
  nodeId: string
): Cypress.Chainable<DraftNodePosition> {
  return pollLiveDraftNodePosition({
    variant,
    nodeId,
    attemptsRemaining: 80,
  });
}

export function waitForLiveFirstAuthoringLayoutPositionChange(
  variant: FirstAuthoringVariant,
  nodeId: string,
  previousPosition: DraftNodePosition
): Cypress.Chainable<DraftNodePosition> {
  return pollLiveCanvasLayoutNodePosition({
    variant,
    nodeId,
    previousPosition,
    attemptsRemaining: 80,
  });
}

export function assertLiveFirstAuthoringDraftScopeIsClean(
  variant: FirstAuthoringVariant = 'transformation'
): Cypress.Chainable<void> {
  const session = resolveLiveFirstAuthoringWorkspaceSession(variant);

  return cy.request(buildDraftReadRequest(session)).then((response) => {
    if (response.status === 404) {
      expect((response.body as { error?: { reason?: string } }).error?.reason).to.equal(
        'workspace_graph_draft_not_found'
      );
      return;
    }

    if (response.status === 200) {
      throw new Error(
        `First-authoring live scope is dirty for ${session.tenantId}/${session.projectId}/${session.environmentId}`
      );
    }

    throw new Error(`Unexpected first-authoring draft preflight status ${response.status}`);
  });
}
