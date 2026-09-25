/** Shared relation forms must persist real grouping/window semantics, not a recognized pilot shape. */
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { dvtSubstraitExpression } from '../../../src/app/views/canvas/canvasDvtSubstraitExpression';
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const model = 'transform-customers';
const section = '[data-slot="dvt-relation-authoring"]';
const form = '[role="dialog"][data-slot="canvas-relational-operator-form"]';

function openProperties(): void {
  cy.get(`.react-flow__node[data-id="${model}"] [data-slot="graph-node-card-title"]`).rightclick();
  cy.contains('[role="menuitem"]', /^Properties$/).click();
  cy.get('[data-slot="canvas-node-workbench-tab-columns"]').click();
  cy.get(section).should('be.visible');
}

function addMeasure(operation: 'aggregate' | 'window', field: string, alias: string): void {
  cy.get(section).find('select').filter(':has(option[value="aggregate"])').select(operation);
  cy.get(form).within(() => {
    cy.contains('label', operation === 'aggregate' ? 'GROUP BY' : 'ORDER BY')
      .find('select')
      .select(field);
    if (operation === 'window')
      cy.contains('label', 'PARTITION BY').find('select').select(['country']);
    cy.contains('label', 'Result name').find('input').clear().type(alias);
    cy.contains('button', 'Done').click();
  });
  cy.get(form).should('not.exist');
}

describe('selected measure forms', () => {
  beforeEach(() => {
    stubWorkbenchScenario('projection');
  });

  const scenarios: readonly (readonly ('aggregate' | 'window')[])[] = [
    ['aggregate'],
    ['window'],
    ['aggregate', 'window'],
  ];
  for (const steps of scenarios) {
    it(`applies and reloads ${steps.join(' then ')} with stable canonical identities`, () => {
      visitWorkbenchCanvas();
      openProperties();
      for (const step of steps)
        addMeasure(
          step,
          step === 'aggregate' ? 'country' : steps.length === 2 ? 'total' : 'name',
          step === 'aggregate' ? 'total' : 'position'
        );
      cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^Apply$/).click();
      let fields: readonly string[];
      let relations: readonly string[];
      cy.wrap(null).should(() => {
        const write = semanticWrites(model).at(-1);
        expect(write, 'saved canonical document').not.to.equal(undefined);
        const document = decodeDvtSubstraitSemanticDocument(
          semanticDocumentFromWrite(write!, model)
        );
        const { index } = deriveSubstraitSchemas(document);
        const root = index.relations.get(index.rootId)!;
        fields = root.fields.map((field) => field.fieldId);
        relations = [...index.relations.keys()];
        expect(root.fields.map((field) => field.displayName)).to.deep.equal(
          steps.length === 2
            ? ['country', 'total', 'position']
            : steps[0] === 'aggregate'
              ? ['country', 'total']
              : ['name', 'email', 'country', 'position']
        );
        if (steps.includes('window')) {
          expect(root.relation.relType.case).to.equal('project');
          if (root.relation.relType.case !== 'project') throw new Error('Expected window Project');
          const expression = root.relation.relType.value.expressions[0]!.rexType;
          if (expression.case !== 'windowFunction') throw new Error('Expected window function');
          const input = index.relations.get(root.inputs[0]!)!;
          expect(
            expression.value.partitions.map(
              (partition) =>
                input.fields[dvtSubstraitExpression.fieldOrdinal(partition)!]?.displayName
            )
          ).to.deep.equal(['country']);
        }
      });
      cy.get('[data-slot="canvas-node-workbench-close"]').click();
      visitWorkbenchCanvas();
      openProperties();
      cy.get(`${section} > select option`).then((options) =>
        expect([...options].map((option) => option.value)).to.have.members(relations)
      );
      cy.get(`${section} [data-slot="relation-output-field"]`).should(
        'have.length',
        steps.length === 2 ? 3 : steps[0] === 'aggregate' ? 2 : 4
      );
      cy.then(() => expect(new Set(fields).size).to.equal(fields.length));
    });
  }
});
