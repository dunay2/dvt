/** Every SET operation keeps its exact Substrait enum and operands after Apply and reload. */
import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  connectWorkbenchProducer,
  dragWorkbenchSource,
  revisitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const cases = [
  ['intersect-distinct', SetRel_SetOp.INTERSECTION_MULTISET],
  ['intersect-all', SetRel_SetOp.INTERSECTION_MULTISET_ALL],
  ['except-distinct', SetRel_SetOp.MINUS_PRIMARY],
  ['except-all', SetRel_SetOp.MINUS_PRIMARY_ALL],
] as const;

describe('SET persistence', () => {
  for (const [operation, expected] of cases) {
    it(`persists ${operation} without degrading or replacing operand identities`, () => {
      stubWorkbenchScenario('pending-set');
      visitWorkbenchCanvas();
      openWorkbenchModel('union-transform');
      dragWorkbenchSource('customers_north');
      dragWorkbenchSource('customers_south');
      cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
      cy.get(`[data-slot="dvt-select-operation-${operation}"]`).click();
      cy.get('[data-pending-operation="true"]').as('set');
      for (const port of [0, 1]) {
        cy.get('[data-operator="read"]').eq(port).closest('li').as('input');
        connectWorkbenchProducer('@input', '@set', port);
      }
      connectWorkbenchProducer('@set', '[data-slot="canvas-relational-output-input-port"]', null);
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      let identities: readonly string[];
      cy.wrap(null).should(() => {
        const write = semanticWrites('union-transform').at(-1);
        expect(write).not.to.equal(undefined);
        const document = decodeDvtSubstraitSemanticDocument(
          semanticDocumentFromWrite(write!, 'union-transform')
        );
        const { index, schemas } = deriveSubstraitSchemas(document);
        const root = index.relations.get(index.rootId)!;
        expect(root.relation.relType.case).to.equal('set');
        if (root.relation.relType.case !== 'set') throw new Error('Expected SetRel');
        expect(root.relation.relType.value.op).to.equal(expected);
        expect(root.inputs).to.have.length(2);
        expect(root.inputs.map((id) => index.relations.get(id)!.binding.displayName)).to.deep.equal(
          ['customers_north', 'customers_south']
        );
        const rootSchema = schemas.get(index.rootId);
        const inputSchema = schemas.get(root.inputs[0]!);
        expect(rootSchema, 'SET output schema').not.to.equal(undefined);
        expect(inputSchema, 'first operand schema').not.to.equal(undefined);
        expect(rootSchema!.map((field) => field.type)).to.deep.equal(
          inputSchema!.map((field) => field.type)
        );
        identities = [...index.relations.keys()];
      });
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      revisitWorkbenchCanvas();
      openWorkbenchModel('union-transform');
      cy.get('[data-slot="canvas-relational-tree-node"][data-relation-id]').should((nodes) => {
        expect([...nodes].map((node) => node.getAttribute('data-relation-id'))).to.have.members(
          identities
        );
      });
    });
  }
});
