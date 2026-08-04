/** Owned concern: drive and observe the public HET1 authoring vertical without seeding graph state. */
import { canvasViewCopy } from '../../src/app/views/canvas/copy';

import { getVisibleCanvasNodeByCardTitle } from './canvasGraphAuthoring';
import { readLiveGraphDraft, readLiveRunEvents, readLiveRunSnapshot } from './liveProtectedRuntime';
import type { E2eWorkspaceSession } from './workspaceSession';

export type Het1ObjectFileManifest = Readonly<{
  bucket: string;
  objectKey: string;
  storageUri: string;
  sha256: string;
  sizeBytes: number;
  sourceCredentialRef: string;
  targetCredentialRef: string;
}>;

type LiveDraftBody = Readonly<{
  record?: Readonly<{
    draft?: Readonly<{
      nodes?: readonly Readonly<{
        id: string;
        name: string;
        metadata?: Record<string, unknown>;
      }>[];
      edges?: readonly Readonly<{ sourceId: string; targetId: string }>[];
    }>;
  }>;
}>;

function replaceInput(selector: string, value: string): void {
  cy.get(selector).should('be.visible').and('be.enabled').clear().type(value, {
    parseSpecialCharSequences: false,
    delay: 0,
  });
}

function selectMappingDataType(mappingIndex: number, dataType: string): void {
  cy.get('[data-slot="object-file-postgres-column-mapping"]')
    .eq(mappingIndex)
    .find('[role="combobox"]')
    .should('be.enabled')
    .click();
  cy.contains('[role="option"]', new RegExp(`^${dataType}$`, 'u'))
    .should('be.visible')
    .click();
}

export function openNodeWorkbench(nodeName: string): void {
  getVisibleCanvasNodeByCardTitle(nodeName).find('[data-slot="graph-node-card-title"]').dblclick();
  cy.get('[data-slot="canvas-node-workbench-panel"]', { timeout: 20_000 }).should('be.visible');
}

export function closeNodeWorkbench(): void {
  cy.get('[data-slot="canvas-node-workbench-close"]').should('be.visible').click();
  cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
}

export function applyNodeWorkbench(): void {
  cy.contains('button', canvasViewCopy.inspectorApplyLabel).should('be.enabled').click();
}

export function configureObjectFileLoad(args: {
  nodeId: string;
  manifest: Het1ObjectFileManifest;
  targetRelation: string;
}): void {
  const field = (suffix: string): string => `[id="${args.nodeId}-${suffix}"]`;

  replaceInput(field('object-uri'), args.manifest.storageUri);
  replaceInput(field('object-sha256'), args.manifest.sha256);
  replaceInput(field('object-size'), String(args.manifest.sizeBytes));
  replaceInput(field('object-max-size'), String(args.manifest.sizeBytes));
  replaceInput(field('object-credential'), args.manifest.sourceCredentialRef);
  replaceInput(field('target-relation'), args.targetRelation);
  replaceInput(field('target-credential'), args.manifest.targetCredentialRef);
  replaceInput(field('source-field-0'), 'order_id');
  replaceInput(field('target-column-0'), 'order_id');
  selectMappingDataType(0, 'bigint');
  cy.get(field('nullable-0')).should('have.attr', 'data-state', 'checked').click();

  cy.contains('button', canvasViewCopy.inspectorObjectFileAddColumnLabel)
    .should('be.enabled')
    .click();
  replaceInput(field('source-field-1'), 'amount');
  replaceInput(field('target-column-1'), 'amount');
  selectMappingDataType(1, 'numeric');
  applyNodeWorkbench();
}

export function confirmCanvasDependency(): void {
  cy.get('[role="alertdialog"]', { timeout: 20_000 }).should('be.visible');
  cy.get('[role="alertdialog"] button').filter(':enabled').last().click();
  cy.get('[role="alertdialog"]').should('not.exist');
}

export function waitForPersistedDraft(args: {
  session: E2eWorkspaceSession;
  description: string;
  predicate: (body: LiveDraftBody) => boolean;
  attempt?: number;
}): Cypress.Chainable<LiveDraftBody> {
  return readLiveGraphDraft(args.session, { failOnStatusCode: false }).then((response) => {
    const body = response.body as LiveDraftBody;
    if (response.status === 200 && args.predicate(body)) {
      return body;
    }
    if ((args.attempt ?? 0) >= 60) {
      throw new Error(`Timed out waiting for persisted HET1 state: ${args.description}.`);
    }

    return cy.wait(250).then(() =>
      waitForPersistedDraft({
        ...args,
        attempt: (args.attempt ?? 0) + 1,
      })
    );
  });
}

export function assertLiveDraftScopeIsClean(session: E2eWorkspaceSession): Cypress.Chainable<void> {
  return readLiveGraphDraft(session, { failOnStatusCode: false }).then((response) => {
    if (response.status !== 404) {
      throw new Error(
        `Expected an empty HET1 draft scope, received HTTP ${response.status} for ` +
          `${session.tenantId}/${session.projectId}/${session.environmentId}.`
      );
    }

    expect((response.body as { error?: { reason?: string } }).error?.reason).to.equal(
      'workspace_graph_draft_not_found'
    );
  });
}

export function waitForTerminalRun(
  runId: string,
  attempt = 0
): Cypress.Chainable<Record<string, unknown>> {
  return readLiveRunSnapshot(runId).then((response) => {
    expect(response.status).to.equal(200);
    const snapshot = response.body as Record<string, unknown>;
    const status = String(snapshot.status ?? '').toLowerCase();

    if (status === 'completed') {
      return snapshot;
    }
    if (status === 'failed' || status === 'cancelled') {
      return readLiveRunEvents(runId).then((eventsResponse) => {
        throw new Error(
          `HET1 live run ${runId} reached ${status}: ${JSON.stringify(eventsResponse.body)}`
        );
      });
    }
    if (attempt >= 120) {
      throw new Error(`Timed out waiting for HET1 live run ${runId} to complete.`);
    }

    return cy.wait(500).then(() => waitForTerminalRun(runId, attempt + 1));
  });
}

export function readDraftNodes(body: LiveDraftBody): readonly Readonly<{
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
}>[] {
  return body.record?.draft?.nodes ?? [];
}

export function readDraftEdges(
  body: LiveDraftBody
): readonly Readonly<{ sourceId: string; targetId: string }>[] {
  return body.record?.draft?.edges ?? [];
}
