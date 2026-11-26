/**
 * Owned concern: prove a newly saved Canvas model stays editable and draggable after reopening.
 * @baseline GH-3578: blank-source creation is retired; creation and save are still required.
 * @decision Create a real model through the catalog and reuse the public Canvas drag gesture.
 * @consequence No duplicate drag engine, optional legacy path or seeded-created node hides failure.
 * @version 1.0.0
 */
import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  openCanvasContextMenuAt,
  clickCanvasContextMenuItem,
} from '../../support/canvasExecutionSelection';
import {
  seedCatalogModels,
  assertCatalogFacets,
  inspectCatalogDisclosureAndSearch,
  assertCatalogControlScale,
  inspectAndPlaceCatalogSource,
  manageCanvasConnections,
} from '../../support/canvasHappyPathCatalog';
import {
  prepareFileModelReferences,
  inspectUnplacedFileModel,
  placeFileModelReferences,
  reopenFileModelReferences,
  removeFileModelReference,
  assertRelocatedFileAuthority,
} from '../../support/canvasHappyPathFileModels';
import {
  assertCreatedModelSaved,
  reopenAndDragCreatedModel,
  inspectAndDuplicateModel,
  removeDuplicateAndKeepOriginal,
} from '../../support/canvasHappyPathPlacement';
import {
  selectCanvasTitleWord,
  copySelectedCanvasText,
  activateCanvasDictionaryLink,
  restoreCanvasContextAfterTextSelection,
} from '../../support/canvasHappyPathTextSelection';
import { getE2eApiCalls, stubE2eApi, stubE2eJsonApi } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../../support/workspaceSession';

describe('Canvas happy path remains writable after create/save', () => {
  let initialDraft: ReturnType<typeof stubStatefulCanvasDraftAuthoring>;
  let warehouseConnections: { id: string; name: string; type: 'postgres'; database: string }[];
  beforeEach(() => {
    stubShellBootstrapApis({
      scopes: ['workspace:files:view', 'workspace:graph-draft:view', 'workspace:graph-draft:save'],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    initialDraft = stubStatefulCanvasDraftAuthoring({
      emptyCanvas: true,
      canvasKind: 'transformation',
    });
    warehouseConnections = [
      { id: 'warehouse', name: 'Project warehouse', type: 'postgres', database: 'analytics' },
    ];
    stubE2eApi('GET', '/workspace/warehouse/connections', () => ({ body: warehouseConnections }));
  });
  it('keeps Source models in one searchable catalog and metadata disclosure separate from placement', () => {
    seedCatalogModels(initialDraft);
    visitWorkbenchCanvas('es');
    assertCatalogFacets();
    inspectCatalogDisclosureAndSearch();
    assertCatalogControlScale();
    inspectAndPlaceCatalogSource();
  });

  it('creates independent file-model references through Elements without navigating to Code or creating SQL files', () => {
    const fileModel = prepareFileModelReferences();
    visitWorkbenchCanvas('en');
    inspectUnplacedFileModel();
    placeFileModelReferences(fileModel.canvasId);
    reopenFileModelReferences();
    removeFileModelReference();
    cy.then(fileModel.relocate);
    assertRelocatedFileAuthority();
  });

  it('opens connection management and creates through its scoped command without importing or placing models', () => {
    // The Connections action used to inherit a source selection and hide creation in Browse.
    cy.intercept('GET', '**/workspace/warehouse/connections/*/objects?*').as(
      'managementObjectReads'
    );
    stubE2eJsonApi('GET', '/workspace/files', []);
    stubE2eApi('POST', '/workspace/warehouse/connections', () => {
      const created = {
        id: 'managed-warehouse',
        name: 'Managed warehouse',
        type: 'postgres' as const,
        database: 'analytics',
      };
      warehouseConnections.push(created);
      return { statusCode: 201, body: created };
    });
    visitWorkbenchCanvas('en');
    cy.get('[data-slot="canvas-explorer-connection-count"]').should('have.text', '1');
    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    manageCanvasConnections();
  });

  it('keeps selected text separate from Canvas context and copies through one shell menu', () => {
    // Selecting shell text used to expose only browser chrome; it must never reach Add or mutate a graph.
    stubE2eJsonApi('GET', '/workspace/files', []);
    visitWorkbenchCanvas('en');
    cy.get('[data-testid="canvas-viewport"]').should('be.visible');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.get('[data-slot="canvas-draft-save-indicator"]').should('not.exist');
    selectCanvasTitleWord().then((selectedTerm) => {
      copySelectedCanvasText(selectedTerm);
      for (const key of [Cypress.Keyboard.Keys.SPACE, Cypress.Keyboard.Keys.ENTER])
        activateCanvasDictionaryLink(selectedTerm, key);
      restoreCanvasContextAfterTextSelection(selectedTerm);
    });
  });

  it('opens the existing Add search on background double click without zooming or placing before a choice', () => {
    // Background Add has one command owner; it cannot inherit node Properties or double-click zoom.
    stubE2eJsonApi('GET', '/workspace/files', []);
    visitWorkbenchCanvas('en');
    const pane = '[data-testid="canvas-viewport"] .react-flow__pane';
    let transform = '';
    let writesBeforeMenu = 0;
    cy.get('.react-flow__viewport').then(($viewport) => {
      transform = $viewport.attr('style') ?? '';
    });
    cy.then(() => {
      writesBeforeMenu = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get(pane).click(220, 160);
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"]').should('not.exist');
    cy.get(pane).dblclick(220, 160);
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"] input[type="search"]').should(
      'be.focused'
    );
    cy.get('.react-flow__viewport').should(($viewport) => {
      expect($viewport.attr('style')).to.equal(transform);
    });
    cy.get('.react-flow__node').should('have.length', 0);
    cy.get('[data-slot="canvas-node-workbench-panel"]').should('not.exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeMenu)
    );
    cy.get('[data-testid="canvas-viewport"]').screenshot('canvas-background-add-search');
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"] input[type="search"]').type(
      '{esc}'
    );
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"]').should('not.exist');
    cy.get('[data-slot="canvas-viewport-context-surface"]').should('be.focused');
    cy.get(pane).dblclick(220, 160);
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"] input[type="search"]').type(
      'Model'
    );
    cy.get(
      '[data-slot="canvas-context-menu-add-catalog-item"][data-registration-kind="dvt:transform"]'
    ).click();
    cy.get('.react-flow__node').should('have.length', 1);
    cy.get('[data-slot="canvas-context-menu-add-catalog-layout"]').should('not.exist');
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
  });

  it('creates and saves a model, reopens without a projection gap, and allows drag', () => {
    const copy = resolveCanvasViewCopy('en');
    cy.viewport(1280, 720);
    visitWorkbenchCanvas('en');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.get('.react-flow__node').should('not.exist');
    openCanvasContextMenuAt(320, 240);
    clickCanvasContextMenuItem('Add...');
    cy.get(
      '[data-slot="canvas-context-menu-add-catalog-item"][data-registration-kind="dvt:transform"]'
    )
      .should('be.visible')
      .click();
    cy.get('.react-flow__node')
      .should('have.length', 1)
      .invoke('attr', 'data-id')
      .then((nodeId) => {
        expect(nodeId, 'created model identity').to.be.a('string').and.not.be.empty;
        assertCreatedModelSaved(nodeId!);
        reopenAndDragCreatedModel(nodeId!, copy.draftProjectionGapTitle);
        inspectAndDuplicateModel(nodeId!);
        removeDuplicateAndKeepOriginal(nodeId!);
      });
  });
});
