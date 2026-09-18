/** Owned concern: verify admitted operator tools, draft isolation and canonical persistence. */
import { inspectDvtSubstraitInnerJoinGroupedWindowDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { inspectDvtSubstraitUnionAllGroupedWindowDraft } from '../../../src/app/views/canvas/canvasDvtSubstraitSetComposition';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const form = '[data-slot="canvas-relational-operator-form"]';
const tool = (id: string): string => `[data-operator-tool="${id}"]`;
function openEditor(union = false, readOnly = false): void {
  stubShellBootstrapApis({
    scopes: readOnly
      ? ['workspace:graph-draft:view']
      : ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
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
  stubStatefulCanvasDraftAuthoring({
    substraitUnionAll: union,
    substraitInnerJoin: !union,
    readOnly,
  });
  cy.viewport(1440, 900);
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
  cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').click();
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
}

describe('Relational operator toolbar', () => {
  it('keeps the selected JOIN editable below grouping and windows, and removes the selected wrapper', () => {
    openEditor();
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    let initialWrites = 0;
    cy.then(() => {
      initialWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-operator="join"]').dblclick();
    cy.get('[data-slot="canvas-join-expression-node"]').should('have.length.at.least', 3);
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.get(tool('aggregate')).click();
    cy.get(
      '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
    )
      .find('button[type="submit"]')
      .click();
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.get(tool('window')).click();
    cy.get(
      '[role="dialog"] ' + form + ', [role="dialog"][data-slot="canvas-relational-operator-form"]'
    )
      .find('button[type="submit"]')
      .click();
    cy.get('[data-slot="canvas-join-expression-node"][data-kind="field"]').first().click();
    cy.get('[data-slot="semantic-workbench-join-condition-editor"]').should('be.visible');
    cy.screenshot('selected-join-connected-expression-under-window');
    cy.get('[aria-label="Comparador de la condición"]').select('not_equal');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get('[data-operator="aggregate"]').rightclick();
    cy.get('[data-slot="canvas-relational-edit-operation"]').click();
    cy.get('[data-slot="context-menu-content"][data-state="open"]').should('not.exist');
    cy.get('[data-slot="canvas-join-expression-tree"]').should('contain.text', 'COUNT');
    cy.contains(
      '[data-slot="canvas-relational-tree-inline-editor"]',
      'downstream dependencies'
    ).should('be.visible');
    cy.get('[data-operator="join"]').dblclick();
    cy.get('[aria-label="Comparador de la condición"]').should('have.value', 'not_equal');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.contains('button', 'Guardar condición').click();
    cy.contains('[data-operator="project"]', 'WINDOW').rightclick();
    cy.get(
      '[data-slot="context-menu-content"][data-state="open"] [data-slot="canvas-relational-remove-source"]'
    ).click();
    cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'WINDOW');
    cy.get('[data-operator="aggregate"]').rightclick();
    cy.get(
      '[data-slot="context-menu-content"][data-state="open"] [data-slot="canvas-relational-remove-source"]'
    ).click();
    cy.get('[data-operator="aggregate"]').should('not.exist');
    cy.get('[data-operator="join"]').should('exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(initialWrites)
    );
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
  });
  for (const union of [false, true]) {
    it(`${union ? 'UNION ALL' : 'INNER JOIN'} → COUNT → ROW_NUMBER survives save and reopen`, () => {
      openEditor(union);
      if (union) {
        cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_north').click();
        cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
        cy.get('[data-slot="dvt-select-operation-union-all"]').click();
      }
      cy.get(tool('aggregate')).should('be.enabled').click();
      cy.get(form).find('input').clear().type('customer_count');
      cy.get(form).find('button[type="submit"]').click();
      cy.get('[data-operator="aggregate"]').should('have.length', 1);
      cy.get(tool('window')).click();
      cy.get(form).should('contain.text', 'customer_count DESC NULLS LAST');
      cy.get(form).should('not.contain.text', 'PARTITION BY');
      cy.get(form).find('input').clear().type('ranked_customer');
      cy.get(form).find('button[type="submit"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should(
        'contain.text',
        'WINDOW · ROW_NUMBER'
      );
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      cy.wrap(null).should(() => {
        const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT');
        const saved = saves.at(-1)?.body as
          | {
              draft: {
                nodes: {
                  id: string;
                  metadata?: { transformAuthoring?: { semanticDocument: unknown } };
                }[];
              };
            }
          | undefined;
        const document = saved?.draft.nodes.find(
          (node) => node.id === (union ? 'union-transform' : 'join-transform')
        )?.metadata?.transformAuthoring?.semanticDocument;
        expect(document).to.not.equal(undefined);
        const draft = decodeDvtSubstraitSemanticDocument(document);
        const inspection = union
          ? inspectDvtSubstraitUnionAllGroupedWindowDraft(draft)
          : inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
        expect(inspection.ok, 'saved Substrait contains the window').to.equal(true);
        if (inspection.ok) expect(inspection.projection.result.name).to.equal('ranked_customer');
      });
      cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      cy.screenshot(`operators-${union ? 'union' : 'join'}-count-window`);
      cy.get(tool('window')).click();
      cy.get(form).find('input').should('have.value', 'ranked_customer');
      cy.contains(form + ' button', 'Remove operation').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'WINDOW');
      cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should(
        'contain.text',
        'WINDOW · ROW_NUMBER'
      );
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/workspace/graph/draft', 'GET');
      cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should(
        'contain.text',
        'WINDOW · ROW_NUMBER'
      );
    });
  }
  it('edits FILTER and a source ROW_NUMBER through the same canonical projection', () => {
    openEditor();
    cy.get('[data-operator="join"]').rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').click();
    cy.get(tool('filter')).click();
    cy.get(form).find('input').type('C-001');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="filter"]').should('have.length', 1);
    cy.get(tool('filter')).click();
    cy.get(form).find('input').should('have.value', 'C-001');
    cy.contains(form + ' button', 'Remove operation').click();
    cy.get('[data-operator="filter"]').should('not.exist');
    cy.get(tool('window')).click();
    cy.get(form).find('select').should('exist');
    cy.get(form).find('input').clear().type('source_row');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-slot="canvas-relational-node-title"]').should(
      'contain.text',
      'WINDOW · ROW_NUMBER'
    );
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
  });
  it('does not enable mutations for a read-only model', () => {
    openEditor(false, true);
    cy.get(tool('aggregate')).should('be.disabled');
    cy.get(tool('window')).should('be.disabled');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
  });
});
