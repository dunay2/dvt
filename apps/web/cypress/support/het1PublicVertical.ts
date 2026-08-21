/** Owned concern: drive and observe the public HET1 authoring vertical without seeding graph state. */
import { canvasViewCopy } from '../../src/app/views/canvas/copy';

import { getVisibleCanvasNodeByCardTitle, openNodeWorkbenchSection } from './canvasGraphAuthoring';
import { readLiveGraphDraft, resolveLiveWorkspaceSession } from './liveProtectedRuntime';
import { seedE2eWorkspaceSession, type E2eWorkspaceSession } from './workspaceSession';

export type Het1ObjectFileManifest = Readonly<{
  bucket: string;
  objectKey: string;
  storageUri: string;
  sha256: string;
  integrityMismatchObject: Readonly<{
    objectKey: string;
    storageUri: string;
    sha256: string;
  }>;
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

export function visitHet1DbtCanvas(options?: Readonly<{ resetBrowserState?: boolean }>): void {
  const session = resolveLiveWorkspaceSession();
  cy.visit('/canvas', {
    onBeforeLoad(window) {
      if (options?.resetBrowserState === true) {
        window.localStorage.clear();
      }
      seedE2eWorkspaceSession(window, session);
    },
  });
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

export function updateObjectFileSourceIdentity(args: {
  nodeId: string;
  nodeName: string;
  storageUri: string;
  sha256: string;
}): void {
  openNodeWorkbench(args.nodeName);
  replaceInput(`[id="${args.nodeId}-object-uri"]`, args.storageUri);
  replaceInput(`[id="${args.nodeId}-object-sha256"]`, args.sha256);
  applyNodeWorkbench();
  closeNodeWorkbench();
}

export function updateDbtTestType(args: {
  nodeName: string;
  testType: 'not_null' | 'unique';
}): void {
  openNodeWorkbench(args.nodeName);
  cy.get('select[name="dbt-test-type"]').should('be.enabled').select(args.testType);
  applyNodeWorkbench();
  closeNodeWorkbench();
}

export function updateDbtModelSql(args: { nodeName: string; sql: string }): void {
  if (args.sql.length === 0) throw new Error('HET1 cancellation SQL must not be empty.');

  openNodeWorkbench(args.nodeName);
  openNodeWorkbenchSection('code');
  cy.get('[data-testid="monaco-code-editor"] .monaco-editor textarea')
    .first()
    .should('be.visible')
    .and('be.enabled')
    .focus()
    .type('{ctrl+a}', { force: true, delay: 0 })
    .type(args.sql, { parseSpecialCharSequences: false, delay: 0 })
    .should('have.value', args.sql);
  applyNodeWorkbench();
  closeNodeWorkbench();
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
      throw new Error(
        `Timed out waiting for persisted HET1 state: ${args.description}. Observed nodes: ` +
          JSON.stringify(readDraftNodes(body))
      );
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

    expect((response.body as { kind?: string }).kind).to.equal('not_found');
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
