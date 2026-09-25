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

describe('measure-pipeline', () => {
  for (const union of [false, true]) {
    it(`${union ? 'UNION ALL' : 'INNER JOIN'} → COUNT → ROW_NUMBER survives save and reopen`, () => {
      openEditor(union);
      if (union) {
        cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_north').click();
        cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
        workbenchOperation('union_all').click();
      }
      workbenchOperation('aggregate').should('have.attr', 'aria-disabled', 'false').click();
      cy.get(modalForm).find('input').clear().type('customer_count');
      cy.get(modalForm).find('button[type="submit"]').click();
      cy.get('[data-operator="aggregate"]').should('have.length', 1);
      cy.get('[data-operator="aggregate"]').click();
      workbenchOperation('window').click();
      cy.get(modalForm).contains('label', 'ORDER BY').find('select').select('customer_count');
      cy.get(modalForm).find('input').clear().type('ranked_customer');
      cy.get(modalForm).find('button[type="submit"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
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
        const { index, schemas } = deriveSubstraitSchemas(draft);
        const root = index.relations.get(index.rootId)!;
        expect(root.relation.relType.case).to.equal('project');
        expect(root.fields.at(-1)?.displayName).to.equal('ranked_customer');
        expect(schemas.get(index.rootId)?.at(-1)?.type.kind.case).to.equal('i64');
        expect(index.relations.get(root.inputs[0]!)?.relation.relType.case).to.equal('aggregate');
      });
      cy.get('[data-slot="canvas-relational-tree-fit"]').click();
      cy.screenshot(`operators-${union ? 'union' : 'join'}-count-window`);
      cy.contains('[data-operator="project"]', 'Window').rightclick();
      activateMenu('canvas-relational-edit-operation');
      cy.get(form).find('input').should('have.value', 'ranked_customer');
      cy.contains(form + ' button', 'Remove operation').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'Window');
      cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/workspace/graph/draft', 'GET');
      cy.get('.react-flow__node[data-id$="-transform"] [data-slot="canvas-node-shell"]')
        .first()
        .dblclick(40, 18);
      // The workspace-session fixture restores the default Spanish locale on reload.
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Ventana');
    });
  }
});
