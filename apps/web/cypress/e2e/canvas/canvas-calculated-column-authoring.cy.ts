/**
 * Owned concern: prove direct aliases and downstream selection through current Model authoring.
 * @baseline GH-3578: retained browser obligations use canonical Substrait, not legacy profiles.
 * @decision Use Output for direct aliases and the Transform form for real expressions.
 * @consequence Opaque identities, hidden-input access and reload remain observable acceptance.
 * @version 1.0.0
 */
import { deriveSubstraitSchemas, type IndexedRelation } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { readCanvasTransformDependencyModel } from '../../../src/app/views/canvas/canvasTransformDependencyModel';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { connectCanvasNodes } from '../../support/canvasGraphAuthoring';
import {
  getE2eApiCalls,
  resetE2eApiStubs,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  openWorkbenchProperties,
  revisitWorkbenchCanvas,
  dragWorkbenchSource,
  connectWorkbenchProducer,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { semanticDocumentFromWrite } from '../../support/relationalWorkbench/persistence';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const inspector = '[data-slot="canvas-transform-inspector"]';
const project = '[data-slot="canvas-relational-tree-node"][data-operator="project"]';
const form = '[data-slot="canvas-derived-output-form"]';
const formulaText = '[data-slot="formula-editor"] .view-lines';
const writes = (): ReturnType<typeof getE2eApiCalls> =>
  getE2eApiCalls('/workspace/graph/draft', 'PUT');

function stubCapabilities(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
}

function stubCanvas(secondModel = false): void {
  stubCapabilities();
  stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    sourceInspectorOrdering: secondModel,
  });
}

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
      window.localStorage.setItem(
        'dvt-web-canvas-interaction',
        JSON.stringify({
          state: {
            impactOverlayEnabled: false,
            columnLevelLineageEnabled: true,
            canvasLayouts: {},
          },
          version: 0,
        })
      );
    },
  });
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function savedModel(nodeId: string): {
  root: IndexedRelation;
  outputs: IndexedRelation['fields'];
  dependencies: ReturnType<typeof readCanvasTransformDependencyModel>;
} {
  const write = writes().at(-1);
  expect(write, 'actual saved canonical document').not.to.equal(undefined);
  const document = decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write!, nodeId));
  const { index, schemas } = deriveSubstraitSchemas(document);
  const root = index.relations.get(index.rootId)!;
  const outputs = root.fields.filter((field) => field.parentFieldId == null);
  expect(schemas.get(index.rootId)).to.have.length(outputs.length);
  return {
    root,
    outputs,
    dependencies: readCanvasTransformDependencyModel(root, (id) => index.relations.get(id)!),
  };
}

function composeProjection(nodeId: string, sourceLabel: string): void {
  openWorkbenchModel(nodeId);
  dragWorkbenchSource(sourceLabel);
  cy.get('[data-pending="true"][data-operator="read"]').closest('li').as('producer');
  workbenchOperation('field_transform').click();
  cy.get('[data-pending-operation="true"]').last().as('projection');
  connectWorkbenchProducer('@producer', '@projection');
  connectWorkbenchProducer(
    '@projection',
    '[data-slot="canvas-relational-output-input-port"]',
    null
  );
  let before = 0;
  cy.then(() => {
    before = writes().length;
  });
  cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
  cy.wrap(null).should(() => expect(writes()).to.have.length(before + 1));
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
  cy.get(project).should('have.length', 1).click();
  cy.get(inspector).should('be.visible');
}

function addFormula(alias: string, formula: string): void {
  let before = 0;
  cy.then(() => {
    before = writes().length;
  });
  cy.get(inspector).find('[data-slot="canvas-derived-output-trigger"]').focus().click();
  cy.get(form).find('input[name="alias"]').type(alias).should('have.value', alias);
  cy.get(formulaText).click();
  cy.focused().should('have.prop', 'tagName', 'TEXTAREA').type(formula);
  cy.get(formulaText).should('have.text', formula);
  cy.get(form).find('button[type="submit"]').should('be.enabled').click();
  cy.get(form).should('not.exist');
  cy.wrap(null).should(() => expect(writes()).to.have.length(before + 1));
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
}

function expectDirectAlias(nodeId: string, alias: string, inputName: string): string {
  const { root, outputs, dependencies } = savedModel(nodeId);
  const input = dependencies.input.fields.find((field) => field.displayName === inputName)!;
  const output = outputs.find((field) => field.displayName === alias)!;
  expect(output, 'canonical direct alias').not.to.equal(undefined);
  expect(dependencies.definitions, 'no artificial calculated definition').to.have.length(0);
  expect(output.sourceFieldId, 'direct canonical input identity').to.equal(input.fieldId);
  if (root.relation.relType.case !== 'project')
    throw new Error('Expected the authored projection.');
  expect(root.relation.relType.value.expressions).to.have.length(0);
  const emit = root.relation.relType.value.common?.emitKind;
  if (emit?.case !== 'emit') throw new Error('Expected explicit canonical output selection.');
  expect(emit.value.outputMapping[output.outputOrdinal]).to.equal(input.outputOrdinal);
  const fieldId = output.fieldId;
  expect(fieldId).to.match(
    /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
  return fieldId;
}

function renameOutput(name: string, alias: string): void {
  let before = 0;
  let fieldId = '';
  cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
  const row = `${inspector} [data-slot="relation-output-field"]:has([data-slot="relation-output-toggle"][data-field-name="${name}"])`;
  cy.get(row).then(($row) => {
    fieldId = $row[0]!.dataset.fieldId!;
  });
  cy.then(() => {
    before = writes().length;
  });
  cy.get(row).find('input').clear().type(alias).should('have.value', alias).blur();
  cy.wrap(null).should(() => expect(writes()).to.have.length(before + 1));
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
  cy.get(inspector)
    .find(`[data-slot="relation-output-toggle"][data-field-name="${alias}"]`)
    .closest('[data-slot="relation-output-field"]')
    .should(($row) =>
      expect($row[0]!.dataset.fieldId, 'rename retains output identity').to.equal(fieldId)
    );
}

describe('Canvas calculated-column authoring', () => {
  beforeEach(() => stubCanvas());

  it('creates, persists, and restores a direct alias through Model while Properties stays separate', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    const node = '.react-flow__node[data-id="model-orders"]';
    cy.get(node).find('[data-slot="graph-node-card-title"]').dblclick();
    cy.get('[data-slot="canvas-model-main-tab"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    openWorkbenchProperties('model-orders');
    cy.get('input[name="node-name"]').should('have.value', 'Orders model');
    cy.get('[data-slot="canvas-node-workbench-close"]').click();
    cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
    cy.get(node).should('be.focused');
    composeProjection('model-orders', 'Orders source');
    renameOutput('customer', 'customer_alias');
    let fieldId = '';
    cy.then(() => {
      fieldId = expectDirectAlias('model-orders', 'customer_alias', 'customer');
    });
    cy.get(inspector)
      .find('input[aria-label="customer_alias"]')
      .should('have.value', 'customer_alias');
    revisitWorkbenchCanvas(visitCanvas);
    openWorkbenchModel('model-orders');
    cy.get(project).click();
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    cy.get(inspector)
      .find('input[aria-label="customer_alias"]')
      .should('have.value', 'customer_alias')
      .closest('[data-slot="relation-output-field"]')
      .should(($row) => expect($row[0]!.dataset.fieldId).to.equal(fieldId));
  });

  it('creates an alias from an upstream field that is excluded from Transform output', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    composeProjection('model-orders', 'Orders source');
    cy.get(inspector).find('[data-slot="canvas-operation-output-tab"]').click();
    const status = `${inspector} [data-slot="relation-output-toggle"][data-field-name="status"]`;
    cy.get(status).should('have.attr', 'data-included', 'true').click();
    cy.get(status).should('have.attr', 'data-included', 'false');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() =>
      expect(savedModel('model-orders').outputs.map((field) => field.displayName)).not.to.include(
        'status'
      )
    );
    let before = 0;
    cy.then(() => {
      before = writes().length;
    });
    cy.get(status).should('be.enabled').click();
    cy.wrap(null).should(() => expect(writes()).to.have.length(before + 1));
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    renameOutput('status', 'status_alias');
    cy.then(() => {
      expectDirectAlias('model-orders', 'status_alias', 'status');
      expect(savedModel('model-orders').outputs.map((field) => field.displayName)).not.to.include(
        'status'
      );
    });
    cy.get(inspector).find('input[aria-label="status_alias"]').should('have.value', 'status_alias');
  });

  it('preserves a downstream Transform selection when its upstream adds a field and reloads', () => {
    resetE2eApiStubs();
    stubCapabilities();
    stubStatefulCanvasDraftAuthoring({ authoringGenerated: true, includeLooseNode: true });
    cy.viewport(1920, 1080);
    visitCanvas();
    const upstreamNode = '.react-flow__node[data-id="dvt-transform-1"]';
    const downstreamNode = '.react-flow__node[data-id="orphan-transform-1"]';
    connectCanvasNodes('Transform 1', 'Orphan Transform');
    cy.get('.react-flow__edge[data-id="draft_edge_dvt-transform-1_orphan-transform-1"]').should(
      'be.visible'
    );
    composeProjection('orphan-transform-1', 'Transform 1');
    let downstreamFieldIds: string[] = [];
    cy.then(() => {
      const initial = savedModel('orphan-transform-1');
      expect(initial.outputs.map((field) => field.displayName)).to.deep.equal([
        'order_id',
        'total',
      ]);
      downstreamFieldIds = initial.outputs.map((field) => field.fieldId);
    });
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    openWorkbenchModel('dvt-transform-1');
    cy.get(project).click();
    addFormula('channel', "'web'");
    cy.then(() => {
      expect(savedModel('dvt-transform-1').outputs.map((field) => field.displayName)).to.deep.equal(
        ['order_id', 'total', 'channel']
      );
      const downstream = savedModel('orphan-transform-1');
      expect(downstream.outputs.map((field) => field.displayName)).to.deep.equal([
        'order_id',
        'total',
      ]);
      expect(downstream.outputs.map((field) => field.fieldId)).to.deep.equal(downstreamFieldIds);
      expect(downstream.dependencies.input.fields.map((field) => field.displayName)).not.to.include(
        'channel'
      );
    });
    const assertDownstreamCard = (): void => {
      cy.get(downstreamNode)
        .contains('[role="tab"]', /^Output /)
        .click()
        .should('have.attr', 'aria-selected', 'true');
      cy.get(downstreamNode)
        .find('[data-slot="graph-node-column-toggle"]')
        .then(($toggle) => {
          if ($toggle.attr('aria-expanded') !== 'true') cy.wrap($toggle).click();
        });
      cy.get(downstreamNode)
        .find('[data-slot="graph-node-column-piece"]')
        .should(($pieces) => {
          expect([...$pieces].map((piece) => piece.getAttribute('data-column-name'))).to.deep.equal(
            ['order_id', 'total']
          );
          expect([...$pieces].map((piece) => piece.getAttribute('data-field-id'))).to.deep.equal(
            downstreamFieldIds
          );
        });
    };
    cy.get('[data-slot="canvas-workspace-tab"]').click();
    assertDownstreamCard();
    cy.get(upstreamNode)
      .contains('[role="tab"]', /^Output /)
      .click()
      .should('have.attr', 'aria-selected', 'true');
    cy.get(upstreamNode).find('button[aria-expanded]').contains('Columns').click();
    cy.get(`${upstreamNode} [data-column-name="channel"]`).should('be.visible');
    revisitWorkbenchCanvas(visitCanvas);
    assertDownstreamCard();
    cy.then(() =>
      expect(savedModel('orphan-transform-1').outputs.map((field) => field.fieldId)).to.deep.equal(
        downstreamFieldIds
      )
    );
  });

  it('keeps one model workspace while switching between opened cards', () => {
    resetE2eApiStubs();
    stubCanvas(true);
    cy.viewport(1920, 1080);
    visitCanvas();
    const canvasTab = '[data-slot="canvas-workspace-tab"]';
    const modelTab = '[data-slot="canvas-model-main-tab"]';
    const editorTab = '[data-slot="canvas-model-main-tab"]';
    const visibleNode = (nodeId: string): Cypress.Chainable<JQuery<HTMLElement>> =>
      cy
        .get(`.react-flow__node[data-id="${nodeId}"]`)
        .filter(':visible')
        .should('have.length', 1)
        .first();

    visibleNode('model-orders').find('[data-slot="graph-node-card-title"]').dblclick();
    cy.get(modelTab)
      .should('have.attr', 'aria-selected', 'true')
      .and('contain.text', 'Orders model');
    cy.get(editorTab).should('have.attr', 'aria-selected', 'true');
    cy.get('[data-slot="canvas-model-toolbar"] button').should('not.exist');

    cy.get(canvasTab).click();
    visibleNode('model-orders-secondary').find('[data-slot="graph-node-card-title"]').dblclick();
    cy.get(modelTab)
      .should('have.attr', 'aria-selected', 'true')
      .and('contain.text', 'Orders model secondary');
    cy.get(editorTab).should('have.attr', 'aria-selected', 'true');

    cy.get(canvasTab).click().should('have.attr', 'aria-selected', 'true');
    cy.get(modelTab).click().should('have.attr', 'aria-selected', 'true');
    cy.get(editorTab).should('have.attr', 'aria-selected', 'true');
  });
});
