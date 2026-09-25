/** Every SET operation keeps its exact Substrait enum and operands after Apply and reload. */
import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const cases = [
  ['union-all', SetRel_SetOp.UNION_ALL],
  ['union-distinct', SetRel_SetOp.UNION_DISTINCT],
  ['intersect-distinct', SetRel_SetOp.INTERSECTION_MULTISET],
  ['intersect-all', SetRel_SetOp.INTERSECTION_MULTISET_ALL],
  ['except-distinct', SetRel_SetOp.MINUS_PRIMARY],
  ['except-all', SetRel_SetOp.MINUS_PRIMARY_ALL],
] as const;

function openComposition(tab: 'code' | 'columns'): void {
  cy.get(
    '.react-flow__node[data-id="union-transform"] [data-slot="canvas-node-shell"]'
  ).rightclick();
  cy.contains('[role="menuitem"]', /^Properties$/).click();
  cy.get(`[data-slot="canvas-node-workbench-tab-${tab}"]`).click();
}

describe('SET persistence', () => {
  for (const [operation, expected] of cases) {
    it(`persists ${operation} without degrading or replacing operand identities`, () => {
      stubWorkbenchScenario('pending-set');
      visitWorkbenchCanvas();
      openWorkbenchModel('union-transform');
      cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_north').click();
      cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers_south').click();
      cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
      cy.get(`[data-slot="dvt-select-operation-${operation}"]`).click();
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
        expect(schemas.get(index.rootId)?.map((field) => field.type)).to.deep.equal(
          schemas.get(root.inputs[0]!)?.map((field) => field.type)
        );
        identities = [...index.relations.keys()];
      });
      visitWorkbenchCanvas();
      openComposition('columns');
      cy.get('[data-slot="dvt-relation-authoring"] > select option').then((options) => {
        expect([...options].map((option) => option.value)).to.have.members(identities);
      });
    });
  }
});
