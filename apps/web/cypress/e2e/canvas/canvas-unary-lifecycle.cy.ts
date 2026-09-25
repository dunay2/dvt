import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import {
  form,
  modalForm,
  openEditor,
  activateMenu,
} from '../../support/relationalWorkbench/operatorEditor';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('unary-lifecycle', () => {
  it('edits FILTER and a source ROW_NUMBER through the same canonical projection', () => {
    openEditor();
    cy.get('[data-operator="join"]').rightclick();
    cy.get('[data-slot="canvas-relational-remove-left"]').click();
    workbenchOperation('filter').click();
    cy.get(form).find('input').type('C-001');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="filter"]').should('have.length', 1);
    cy.get('[data-operator="filter"]').rightclick();
    activateMenu('canvas-relational-edit-operation');
    cy.get(form).find('input').should('have.value', 'C-001');
    cy.contains(form + ' button', 'Remove operation').click();
    cy.get('[data-operator="filter"]').should('not.exist');
    workbenchOperation('window').click();
    cy.get(form).find('select').should('exist');
    cy.get(form).find('input').clear().type('source_row');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
  });
  it('authors, reopens, edits and contextually removes ORDER BY below LIMIT', () => {
    openEditor();
    workbenchOperation('sort').should('have.attr', 'aria-disabled', 'false').click();
    cy.get(form).find('button').contains('Add key').click();
    cy.get(form).find('select[aria-label^="Field"]').should('have.length', 2);
    cy.get(form).find('select[aria-label="Field 2"]').select(1);
    cy.get(form).find('select[aria-label="Direction and nulls 1"]').select('DESC · NULLS LAST');
    cy.get(form).find('button[type="submit"]').click();
    cy.get('[data-operator="sort"]')
      .should('have.length', 1)
      .and('contain.text', 'DESC NULLS LAST');

    cy.get('[data-operator="sort"]').click();
    workbenchOperation('fetch').should('have.attr', 'aria-disabled', 'false').click();
    cy.get(modalForm).find('input').eq(0).clear().type('2');
    cy.get(modalForm).find('input').eq(1).clear().type('3');
    cy.get(modalForm).find('button[type="submit"]').click();
    cy.get('[data-operator="fetch"]')
      .should('have.length', 1)
      .and('contain.text', 'LIMIT 3 · OFFSET 2');
    cy.get('[data-operator="sort"]')
      .invoke('attr', 'data-relation-id')
      .should('be.a', 'string')
      .as('sortRelationId', { type: 'static' });
    cy.get('[data-operator="fetch"]')
      .invoke('attr', 'data-relation-id')
      .should('be.a', 'string')
      .as('fetchRelationId', { type: 'static' });

    cy.get('[data-operator="sort"]').rightclick();
    activateMenu('canvas-relational-edit-operation');
    cy.get('[data-slot="canvas-relational-tree-inline-editor"]')
      .find('select[aria-label="Direction and nulls 1"]')
      .select('ASC · NULLS FIRST');
    cy.get('[data-slot="canvas-relational-tree-inline-editor"] button[type="submit"]').click();
    cy.get('[data-operator="sort"]').should('contain.text', 'ASC NULLS FIRST');
    cy.get('[data-operator="fetch"]').should('exist');

    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const saved = getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)?.body as
        | {
            draft: {
              nodes: {
                id: string;
                metadata?: { transformAuthoring?: { semanticDocument: unknown } };
              }[];
            };
          }
        | undefined;
      const document = saved?.draft.nodes.find((node) => node.id === 'join-transform')?.metadata
        ?.transformAuthoring?.semanticDocument;
      expect(document).to.not.equal(undefined);
      const draft = decodeDvtSubstraitSemanticDocument(document);
      const { index } = deriveSubstraitSchemas(draft);
      const fetched = index.relations.get(index.rootId)!;
      expect(fetched.relation.relType.case).to.equal('fetch');
      const sorted = index.relations.get(fetched.inputs[0]!)!.relation.relType;
      expect(sorted.case).to.equal('sort');
      if (sorted.case === 'sort') expect(sorted.value.sorts).to.have.length(2);
    });

    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get('.react-flow__node[data-id$="-transform"] [data-slot="canvas-node-shell"]')
      .first()
      .dblclick(40, 18);
    cy.get<string>('@sortRelationId').then((relationId) => {
      cy.get(`[data-operator="sort"][data-relation-id="${relationId}"]`).rightclick();
    });
    activateMenu('canvas-relational-remove-source');
    cy.get('[data-operator="sort"]').should('not.exist');
    cy.get<string>('@fetchRelationId').then((relationId) => {
      cy.get(`[data-operator="fetch"][data-relation-id="${relationId}"]`).should('exist');
    });
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="sort"], [data-operator="fetch"]').should('have.length', 2);
  });
});
