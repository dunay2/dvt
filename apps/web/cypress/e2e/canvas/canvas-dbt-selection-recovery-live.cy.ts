/**
 * Owned concern: prove unavailable DBT root recovery through real file authority.
 * @baseline GH-3610: invented projects and graph-owned dbt models are not admitted authority.
 * @decision Disable an explicitly selected file-authoritative model through Monaco synchronization.
 * @consequence Analysis removes the root; only explicit recovery may admit the surviving model.
 * @version 1.0.1
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
  visitWithLiveWorkspaceSession,
  waitForLiveWorkspaceFileContent,
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

function disableSelectedModelThroughCode(): void {
  cy.get('.react-flow__controls-fitview').click();
  cy.get(`.react-flow__node[data-id="${SELECTED_MODEL_ID}"]`)
    .find('[data-slot="graph-node-card-title"]')
    .dblclick();
  cy.get('[data-slot="workspace-file-code-editor"]', { timeout: 30_000 })
    .should('be.visible')
    .and('have.attr', 'data-file-path', SELECTED_MODEL_PATH);
  cy.get('[data-testid="monaco-code-editor"]').find('.view-lines').click();
  cy.focused()
    .should(($editor) => {
      expect($editor.is('textarea, [contenteditable="true"]')).to.equal(true);
    })
    .type('{ctrl+a}');
  cy.window().then((window) => {
    const clipboardData = new window.DataTransfer();
    clipboardData.setData('text/plain', DISABLED_MODEL_SQL);
    cy.focused().trigger('paste', { clipboardData, force: true });
  });
  waitForLiveWorkspaceFileContent(SELECTED_MODEL_PATH, DISABLED_MODEL_SQL);
  cy.get(`.react-flow__node[data-id="${SELECTED_MODEL_ID}"]`, { timeout: 60_000 }).should(
    'not.exist'
  );
  cy.get(`.react-flow__node[data-id="${SURVIVING_MODEL_ID}"]`).should('be.visible');
}

describe('Canvas DBT execution-selection recovery live protected runtime', () => {
  before(() => {
    if (!hasLiveProtectedRuntimeEnv()) {
      throw new Error('DBT selection recovery requires the LIVE protected runtime.');
    }
    return seedLiveWorkspaceFiles(PROJECT_FILES).then(() =>
      adoptLiveDbtProjectFileAuthority(PROJECT_ROOT, CANVAS_ID)
    );
  });

  it('recovers an unavailable selected root without silently widening execution scope', () => {
    visitCleanDbtCanvas();
    selectCanvasClosure([SELECTED_MODEL_ID]);
    disableSelectedModelThroughCode();

    revealOperationalDrawer();
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="preview"]').click();
    cy.get('[data-slot="bottom-operational-selection-status"]')
      .invoke('text')
      .should('match', /blocked|bloqueada/i);
    cy.contains(canvasViewExecutionCopyByKey.selectionRecoveryUnavailableRootsLabel.fallback)
      .parent()
      .should('contain.text', SELECTED_MODEL_ID);
    cy.contains(canvasViewExecutionCopyByKey.selectionRecoveryAdmittedScopeLabel.fallback)
      .parent()
      .invoke('text')
      .should('match', /None|Ninguno/i);
    cy.contains(
      'button',
      canvasViewExecutionCopyByKey.selectionRecoveryUseWorkspaceScopeAction.fallback
    )
      .scrollIntoView()
      .should('be.visible')
      .should('be.enabled')
      .click();

    cy.get('[data-slot="bottom-operational-selection-status"]')
      .invoke('text')
      .should('match', /ready|lista/i);
    cy.get('[data-slot="bottom-operational-selection-recovery-receipt"]')
      .should('contain.text', SELECTED_MODEL_ID)
      .and('contain.text', 'workspace');
    cy.contains(canvasViewExecutionCopyByKey.selectionRecoveryAdmittedScopeLabel.fallback)
      .parent()
      .should('contain.text', SURVIVING_MODEL_ID);
    cy.get('[data-slot="bottom-operational-preview-action"]').should('be.enabled');
    cy.screenshot('canvas-dbt-selection-recovery-live-ready');
  });
});
