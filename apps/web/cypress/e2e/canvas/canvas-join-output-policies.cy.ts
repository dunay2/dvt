/** JOIN preservation policies derive from native input/output schemas and survive reload. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
} from '../../support/relationalWorkbench/navigation';
import {
  openPendingRelationalOperationChooser,
  stubPendingComposition,
} from '../../support/relationalWorkbench/pendingComposition';
import { savedOutputs } from '../../support/relationalWorkbench/savedOutputs';

const policies = [
  { operation: 'left-join', type: JoinRel_JoinType.LEFT, nullable: [1] },
  { operation: 'right-join', type: JoinRel_JoinType.RIGHT, nullable: [0] },
  { operation: 'full-outer-join', type: JoinRel_JoinType.OUTER, nullable: [0, 1] },
  { operation: 'left-semi-join', type: JoinRel_JoinType.LEFT_SEMI, retained: 0 },
  { operation: 'left-anti-join', type: JoinRel_JoinType.LEFT_ANTI, retained: 0 },
  { operation: 'right-semi-join', type: JoinRel_JoinType.RIGHT_SEMI, retained: 1 },
  { operation: 'right-anti-join', type: JoinRel_JoinType.RIGHT_ANTI, retained: 1 },
] as const;

describe('JOIN output policies', () => {
  for (const policy of policies) {
    it(`persists ${policy.operation} with canonical preservation semantics`, () => {
      stubPendingComposition();
      visitWorkbenchCanvas();
      openPendingRelationalOperationChooser();
      cy.get(`[data-slot="dvt-select-operation-${policy.operation}"]`).click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      let id = '';
      cy.wrap(null, { timeout: 20_000 }).should(() => {
        const { document } = savedOutputs();
        const { index, schemas } = deriveSubstraitSchemas(document);
        const entry = index.relations.get(index.rootId)!;
        const relation = entry.relation.relType;
        if (relation.case !== 'join') throw new Error('Expected a JoinRel');
        expect(relation.value.type).to.equal(policy.type);
        id = index.rootId;
        const output = schemas.get(index.rootId)!;
        expect(output.length).to.be.greaterThan(0);
        if ('retained' in policy) {
          const input = schemas.get(entry.inputs[policy.retained]!)!;
          expect(output.map((field) => field.type)).to.deep.equal(input.map((field) => field.type));
          expect(output.flatMap((field) => field.sourceFieldIds)).to.deep.equal(
            input.flatMap((field) => field.sourceFieldIds)
          );
        } else {
          for (const inputIndex of policy.nullable) {
            const input = schemas.get(entry.inputs[inputIndex]!)!;
            const ids = new Set(input.flatMap((field) => field.sourceFieldIds));
            const extended = output.filter((field) =>
              field.sourceFieldIds.some((id) => ids.has(id))
            );
            expect(extended).to.have.length(input.length);
            for (const field of extended)
              expect(field.type.kind.value?.nullability).to.equal(Type_Nullability.NULLABLE);
          }
        }
      });
      visitWorkbenchCanvas();
      openWorkbenchModel();
      cy.then(() =>
        cy.get(`[data-operator="join"][data-relation-id="${id}"]`).should('have.length', 1)
      );
      cy.get(
        '[data-slot="canvas-relational-composition-badge"], [data-slot="canvas-relational-composition-junction"]'
      ).should('not.exist');
    });
  }
});
