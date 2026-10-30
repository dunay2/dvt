/**
 * Owned concern: prove read-only Code cannot disable an admitted DBT root or widen execution scope.
 * @baseline GH-3747: Code inspection does not admit file edits.
 * @decision Attempt the previous disabling gesture against the viewer and verify live bytes and scope.
 * @consequence This browser case proves read-only selection integrity, not unavailable-root recovery.
 * @version 2.0.0
 */
import { APPLICATION_LANGUAGE_STORAGE_KEY } from '../../../src/app/stores/applicationLanguageStore';
import { canvasViewExecutionCopyByKey } from '../../../src/app/views/canvas/canvasCopyCatalog.execution';
import {
  revealOperationalDrawer,
  selectCanvasClosure,
} from '../../support/canvasExecutionSelection';
import {
  adoptLiveDbtProjectFileAuthority,
  seedLiveWorkspaceFiles,
} from '../../support/dbtProjectLive';
import {
  hasLiveProtectedRuntimeEnv,
  readLiveWorkspaceFile,
  visitWithLiveWorkspaceSession,
} from '../../support/liveProtectedRuntime';

const PROJECT_ROOT = 'selection-recovery';
const CANVAS_ID = 'selection-recovery-files';
const SELECTED_MODEL_ID = 'model.selection_recovery.selected_model';
const SURVIVING_MODEL_ID = 'model.selection_recovery.surviving_model';
const SELECTED_MODEL_PATH = `${PROJECT_ROOT}/models/selected_model.sql`;
const DISABLED_MODEL_SQL = "{{ config(enabled=false, materialized='view') }}\nselect 1 as id\n";
const PROJECT_FILES = {
  [`${PROJECT_ROOT}/dbt_project.yml`]: `name: selection_recovery
version: '0.4.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
`,
  [SELECTED_MODEL_PATH]: "{{ config(materialized='view') }}\nselect 1 as id\n",
  [`${PROJECT_ROOT}/models/surviving_model.sql`]:
    "{{ config(materialized='view') }}\nselect 2 as id\n",
};

function visitCleanDbtCanvas(): void {
  cy.viewport(1500, 900);
  visitWithLiveWorkspaceSession(
    `/canvas?authority=dbt-project-files&canvasId=${CANVAS_ID}&projectRoot=${PROJECT_ROOT}`,
    {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          APPLICATION_LANGUAGE_STORAGE_KEY,
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    }
  );
  cy.get(`.react-flow__node[data-id="${SELECTED_MODEL_ID}"]`, { timeout: 60_000 }).should(
    'be.visible'
  );
  cy.get(`.react-flow__node[data-id="${SURVIVING_MODEL_ID}"]`).should('be.visible');
}

function attemptToDisableSelectedModelThroughReadOnlyCode(): void {
  cy.get('.react-flow__controls-fitview').click();
  cy.get(`.react-flow__node[data-id="${SELECTED_MODEL_ID}"]`)
    .find('[data-slot="graph-node-card-title"]')
    .dblclick();
  cy.get('[data-slot="workspace-file-code-editor"]', { timeout: 30_000 })
    .should('be.visible')
    .and('have.attr', 'data-file-path', SELECTED_MODEL_PATH);
  cy.get('[data-testid="monaco-code-editor"]').should('not.exist');
  cy.get('[data-testid="monaco-code-viewer"] .view-lines')
    .invoke('text')
    .should('match', /select\s+1\s+as\s+id/);
  cy.get('[data-testid="monaco-code-viewer"] .monaco-editor textarea')
    .first()
    .should('have.prop', 'readOnly', true)
    .focus()
    .type('{ctrl+a}', { force: true });
  cy.window().then((window) => {
    const clipboardData = new window.DataTransfer();
    clipboardData.setData('text/plain', DISABLED_MODEL_SQL);
    cy.focused().trigger('paste', { clipboardData, force: true });
  });
  cy.get('[data-testid="monaco-code-viewer"] .view-lines').should(
    'not.contain.text',
    'enabled=false'
  );
  cy.get('[data-slot="code-working-tree-status"]').should('have.attr', 'data-phase', 'read_only');
}

describe('Canvas DBT read-only Code selection integrity live protected runtime', () => {
  before(() => {
    if (!hasLiveProtectedRuntimeEnv()) {
      throw new Error('DBT read-only selection integrity requires the LIVE protected runtime.');
    }
    return seedLiveWorkspaceFiles(PROJECT_FILES).then(() =>
      adoptLiveDbtProjectFileAuthority(PROJECT_ROOT, CANVAS_ID)
    );
  });

  it('keeps the selected model enabled and execution scope explicit after attempted Code edits', () => {
    let selectedRevision: string;
    readLiveWorkspaceFile(SELECTED_MODEL_PATH).then(({ status, body }) => {
      expect(status).to.equal(200);
      selectedRevision = (body as { contentSha256: string }).contentSha256;
      expect(selectedRevision).to.match(/^[a-f0-9]{64}$/);
    });
    cy.intercept({ method: 'POST', pathname: '/workspace/files/**' }).as('readOnlyFileWrites');
    visitCleanDbtCanvas();
    selectCanvasClosure([SELECTED_MODEL_ID]);
    attemptToDisableSelectedModelThroughReadOnlyCode();
    readLiveWorkspaceFile(SELECTED_MODEL_PATH).then(({ status, body }) => {
      expect(status).to.equal(200);
      expect((body as { contentSha256: string }).contentSha256).to.equal(selectedRevision);
      expect((body as { content: string }).content).to.equal(PROJECT_FILES[SELECTED_MODEL_PATH]);
    });
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get(`.react-flow__node[data-id="${SELECTED_MODEL_ID}"]`).should('be.visible');
    cy.get(`.react-flow__node[data-id="${SURVIVING_MODEL_ID}"]`).should('be.visible');

    revealOperationalDrawer();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').click();
    cy.get('[data-slot="bottom-operational-selection-status"]')
      .invoke('text')
      .should('match', /ready|lista/i);
    for (const label of [
      canvasViewExecutionCopyByKey.selectionRecoveryRequestedRootsLabel,
      canvasViewExecutionCopyByKey.selectionRecoveryAdmittedScopeLabel,
    ]) {
      cy.contains(label)
        .parent()
        .find('[data-slot="bottom-operational-selection-scope-value"]')
        .should('have.length', 1)
        .and('have.text', SELECTED_MODEL_ID);
    }
    cy.contains(canvasViewExecutionCopyByKey.selectionRecoveryUnavailableRootsLabel)
      .parent()
      .find('[data-slot="bottom-operational-selection-scope-value"]')
      .should('not.exist');
    cy.get('[data-slot="bottom-operational-selection-recovery-receipt"]').should('not.exist');
    cy.contains(
      'button',
      canvasViewExecutionCopyByKey.selectionRecoveryUseWorkspaceScopeAction
    ).should('not.exist');
    cy.get('[data-slot="bottom-operational-preview-action"]').should('be.enabled');
    cy.get('@readOnlyFileWrites.all').should('have.length', 0);
    cy.screenshot('canvas-dbt-readonly-selected-scope-preserved');
  });
});
