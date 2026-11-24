/** Owned concern: independent Model entry, retained relational authoring and workspace navigation. */
import {
  DvtTransformAuthoringAuthorityV1Schema,
  WorkspaceGraphAuthoringDraftSchema,
} from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import { projectCanvasCanonicalGraphEditing } from '../../../src/app/views/canvas/canvasCanonicalGraphEditing';
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { createCanvasRelationalAuthoringDraft } from '../../../src/app/views/canvas/canvasRelationalAuthoringDraft';
import { revealOperationalDrawer } from '../../support/canvasExecutionSelection';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  openWorkbenchProperties,
  visitWorkbenchCanvas,
  setWorkbenchInputsOpen,
} from '../../support/relationalWorkbench/navigation';
import { hoverWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const SQL_ENDPOINT = '/workspace/graph/canvases/main-canvas/transforms/join-transform/sql';

function restoreUnpublishedRelationalDraft(
  initialDraft: ReturnType<typeof stubWorkbenchScenario>
): {
  model: ReturnType<typeof stubWorkbenchScenario>['nodes'][number];
  savedAuthoringDraft: ReturnType<typeof createCanvasRelationalAuthoringDraft>;
} {
  const model = initialDraft.nodes.find((node) => node.id === 'join-transform');
  if (model == null) throw new Error('The existing saved-join scenario must contain its Model.');
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    model.metadata?.transformAuthoring
  );
  const document = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const editable = projectCanvasCanonicalGraphEditing(document, [
    'source-customers',
    'source-orders',
  ]);
  if (editable == null)
    throw new Error('The existing JOIN fixture must have a lossless authoring projection.');
  const savedAuthoringDraft = createCanvasRelationalAuthoringDraft({
    ...editable,
    outputRelationId: indexed.index.rootId,
    positions: new Map(),
  });
  const metadata: NonNullable<typeof model.metadata> = {
    ...model.metadata,
    relationalAuthoringDraft: savedAuthoringDraft,
  };
  delete metadata.transformAuthoring;
  model.metadata = metadata;
  Object.assign(initialDraft, normalizeProjectCanvasDraft(initialDraft));
  WorkspaceGraphAuthoringDraftSchema.parse(initialDraft);
  expect(initialDraft.nodeIds).to.include(model.id);
  expect(initialDraft.edges.filter((edge) => edge.targetId === model.id)).to.have.length(2);
  expect(savedAuthoringDraft.sources).to.have.length(2);
  expect(savedAuthoringDraft.outputRelationId).to.equal(indexed.index.rootId);
  expect(model.metadata).not.to.have.property('transformAuthoring');

  return { model, savedAuthoringDraft };
}

describe('Workbench navigation', () => {
  let initialDraft: ReturnType<typeof stubWorkbenchScenario>;
  beforeEach(() => {
    initialDraft = stubWorkbenchScenario('saved-join');
  });

  it('keeps the resize cursor on the separator and accepts an occurrence afterwards', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
      .focus()
      .type('{enter}');
    revealOperationalDrawer();

    const separator = '[data-panel-resize-handle-id="app-shell-bottom-drawer-resize-handle"]';
    hoverWorkbenchCard(separator);
    cy.get(separator).should('have.css', 'cursor', 'ns-resize');
    cy.get('body').should('not.have.css', 'cursor', 'ns-resize');

    setWorkbenchInputsOpen(true);
    cy.get('[data-slot="source-occurrence-add"]').first().click();
    setWorkbenchInputsOpen(false);
    cy.get(
      '[data-slot="canvas-relational-tree-node"][data-operator="read"][data-pending="true"]'
    ).should('have.length', 1);
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  });

  it('opens the Model by keyboard and transfers focus to its controls', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();

    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]')
      .should('have.attr', 'aria-keyshortcuts', 'Enter')
      .should('be.visible')
      .focus()
      .should('be.focused')
      .type('{enter}');

    cy.get('[data-slot="canvas-model-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-model-editor"]').should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Collapse explorer"]:visible'
    ).should('be.focused');
    cy.get('[data-slot="canvas-model-view-tab"]').should('not.exist');
    cy.get('[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
    setWorkbenchInputsOpen(true);
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .should('have.length', 2)
      .each(($source) => {
        cy.wrap($source).should('contain.text', 'Participating');
      });
    setWorkbenchInputsOpen(false);
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-layout"]')
      .should('have.attr', 'data-layout', 'graph')
      .and('have.attr', 'data-direction', 'left-to-right');
    cy.get('[data-slot="canvas-relational-tree-viewport"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="read"]')
      .should('have.length', 2)
      .each(($card) => {
        cy.wrap($card).should('not.contain.text', 'READ');
        cy.wrap($card).find('[data-slot="canvas-relational-node-title"]').should('not.be.empty');
      });
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="left"] text')
      .should('be.visible')
      .and('have.text', 'L');
    cy.get('[data-slot="canvas-relational-tree-input-label"][data-role="right"] text')
      .should('be.visible')
      .and('have.text', 'R');
    cy.get('[data-slot="canvas-model-toolbar"]').should(($toolbar) => {
      expect($toolbar[0]!.getBoundingClientRect().height).to.be.at.most(48);
      expect($toolbar.find('[role="tab"]')).to.have.length(0);
    });
    cy.get('[data-slot="canvas-model-toolbar"] button[aria-label="Open Model SQL"]').should(
      'have.attr',
      'aria-expanded',
      'false'
    );
    cy.get('[data-slot="canvas-model-editor"]').should(($editor) => {
      const footer = $editor.find('[data-slot="canvas-model-toolbar"]')[0]!;
      const viewport = $editor.find('[data-slot="canvas-relational-tree-viewport"]')[0]!;
      expect(footer.tagName).to.equal('FOOTER');
      expect(footer.getBoundingClientRect().top).to.be.at.least(
        viewport.getBoundingClientRect().bottom
      );
    });
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.screenshot('semantic-editor-wide');
  });

  it('returns to Properties and reopens the Model from the Inspector header', () => {
    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    openWorkbenchModel();

    setWorkbenchInputsOpen(true);
    cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
    setWorkbenchInputsOpen(false);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-workbench"] button[aria-label="Zoom out"]').click();
    cy.get(
      '[data-slot="canvas-relational-tree-workbench"] button[aria-label="Fit graph to view"]'
    ).click();
    cy.get('[data-slot="canvas-relational-tree-zoom"]')
      .invoke('text')
      .should('match', /^\d+%$/);
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.viewport(1024, 720);
    cy.get('[data-slot="canvas-relational-tree-detail"]').should('not.exist');
    cy.get('[data-slot="canvas-model-view-tab"]').should('not.exist');
    cy.screenshot('semantic-editor-compact');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('.react-flow__node[data-id="join-transform"]').should('exist');
    openWorkbenchProperties('join-transform');
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get(
      '[data-slot="canvas-node-workbench-header-actions"] [data-slot="canvas-open-semantic-editor"]'
    )
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Open semantic editor');
    cy.get('[data-slot="canvas-node-workbench-general-content"]')
      .should('be.visible')
      .find('[data-slot="canvas-open-semantic-editor"]')
      .should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
    cy.get('[data-slot="canvas-node-workbench-columns-section"]').should(
      'contain.text',
      'customer'
    );
    cy.get(
      '[data-slot="dvt-relation-authoring"], [data-slot="dvt-relational-operation-chooser"]'
    ).should('not.exist');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    // Bring the card back into view after deliberately resizing the viewport.
    cy.get('.react-flow__controls-fitview').should('be.visible').click();
    openWorkbenchProperties('join-transform');
    cy.get('[data-slot="canvas-node-workbench-tab-general"]').should(
      'have.attr',
      'aria-selected',
      'true'
    );
    cy.get(
      '[data-slot="canvas-node-workbench-header-actions"] [data-slot="canvas-open-semantic-editor"]'
    )
      .focus()
      .should('be.focused');
    cy.get('[role="tooltip"]').should('contain.text', 'Open semantic editor');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get('[data-slot="canvas-node-workbench-help"]').should('be.focused');
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get('[data-slot="canvas-node-workbench-close"]').should('be.focused');
    cy.get('[data-slot="canvas-open-semantic-editor"]').focus().should('be.focused').click();
    cy.get('[data-slot="canvas-model-main-tab"]')
      .should('have.length', 1)
      .and('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-relational-tree"]').should('contain.text', 'JOIN');
  });

  it('opens the saved relational draft directly without a published tree or prior Properties selection', () => {
    // Model editing must resolve its own target; a previous Properties gesture must not be required to hydrate it.
    const { model, savedAuthoringDraft } = restoreUnpublishedRelationalDraft(initialDraft);

    cy.viewport(1280, 720);
    visitWorkbenchCanvas();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get('.react-flow__node[data-id="join-transform"] [data-slot="graph-node-card-title"]')
      .should('be.visible')
      .dblclick();
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-unavailable"]').should('not.exist');
    cy.get('[data-slot="canvas-model-editor"] [data-operator="read"]').should('have.length', 2);
    cy.get('[data-slot="canvas-model-editor"] [data-operator="join"]')
      .should('have.length', 1)
      .and('contain.text', 'JOIN');
    cy.get('[data-slot="canvas-relational-tree-output"]').should('contain.text', 'Customer orders');
    cy.get('[data-slot="canvas-relational-output-input-port"]').should(
      'have.attr',
      'data-connected',
      'true'
    );
    cy.get('[data-slot="canvas-relational-output-edge"]')
      .should('have.attr', 'd')
      .and('not.be.empty');

    cy.get('[data-slot="canvas-operation-menu-trigger"]').should('be.enabled').click();
    cy.get('[role="listbox"]').should('be.visible');
    cy.get('[data-operation="filter"]')
      .should('have.attr', 'aria-disabled', 'false')
      .scrollIntoView()
      .click();
    cy.get('[data-pending-operation="true"] [data-operator="filter"]').should('exist');
    cy.get('[data-slot="canvas-relational-tree-cancel"]').should('be.visible').click();
    cy.get('[data-operator="filter"]').should('not.exist');
    cy.get('[data-operator="join"]').should('have.length', 1);
    cy.get('[data-slot="canvas-relational-output-input-port"]').should(
      'have.attr',
      'data-connected',
      'true'
    );
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    // A restored unpublished draft retains the existing unsaved-authoring guard.
    cy.contains('[role="alertdialog"] button', 'Discard changes').click();
    cy.get('[data-slot="canvas-model-editor"]').should('not.exist');
    cy.get('[role="alertdialog"]').should('not.exist');
    cy.then(() => {
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0);
      expect(getE2eApiCalls(SQL_ENDPOINT, 'GET')).to.have.length(0);
      expect(model.metadata?.relationalAuthoringDraft).to.deep.equal(savedAuthoringDraft);
      expect(model.metadata).not.to.have.property('transformAuthoring');
    });
  });
});
