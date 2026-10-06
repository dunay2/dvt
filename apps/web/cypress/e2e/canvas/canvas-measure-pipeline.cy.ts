import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { dvtSubstraitExpression } from '../../../src/app/views/canvas/canvasDvtSubstraitExpression';
import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  connectWorkbenchProducer,
  dragWorkbenchSource,
  openWorkbenchModel,
  revisitWorkbenchCanvas,
  stageWorkbenchUnary,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { workbenchOperation } from '../../support/relationalWorkbench/operationMenu';
import { form, openEditor, activateMenu } from '../../support/relationalWorkbench/operatorEditor';
import {
  semanticDocumentFromWrite,
  semanticWrites,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

describe('measure-pipeline', () => {
  for (const union of [false, true]) {
    it(`${union ? 'UNION ALL' : 'INNER JOIN'} → COUNT → ROW_NUMBER survives save and reopen`, () => {
      openEditor(union);
      if (union) {
        dragWorkbenchSource('customers_north');
        dragWorkbenchSource('customers_south');
        workbenchOperation('union_all').click();
        cy.get('[data-pending-operation="true"]').as('union');
        for (const port of [0, 1]) {
          cy.get('[data-operator="read"]').eq(port).closest('li').as('input');
          connectWorkbenchProducer('@input', '@union', port);
        }
      }
      stageWorkbenchUnary('aggregate', `[data-operator="${union ? 'set' : 'join'}"]`, !union);
      cy.get(form).find('input').clear().type('customer_count');
      cy.get(form).find('button[type="submit"]').click();
      cy.get('[data-operator="aggregate"]').should('have.length', 1);
      stageWorkbenchUnary('window', '[data-operator="aggregate"]');
      cy.get(form).contains('label', 'ORDER BY').find('select').select('customer_count');
      cy.get(form).find('input').clear().type('ranked_customer');
      cy.get(form).find('button[type="submit"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
      cy.get('[data-presentation="window"]').closest('li').as('window');
      connectWorkbenchProducer(
        '@window',
        '[data-slot="canvas-relational-output-input-port"]',
        null
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
      cy.contains('[data-slot="canvas-transform-inspector"] button', 'Edit · Window').click();
      cy.get(form).find('input').should('have.value', 'ranked_customer');
      cy.contains(form + ' button', 'Remove operation').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('not.contain.text', 'Window');
      cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Window');
      revisitWorkbenchCanvas(() => visitWithE2eWorkspaceSession('/canvas'));
      openWorkbenchModel(union ? 'union-transform' : 'join-transform');
      // The workspace-session fixture restores the default Spanish locale on reload.
      cy.get('[data-slot="canvas-relational-node-title"]').should('contain.text', 'Ventana');
    });
  }

  for (const steps of [['aggregate'], ['window'], ['aggregate', 'window']] as const) {
    it(`applies and reloads ${steps.join(' then ')} with stable canonical identities`, () => {
      const model = 'transform-customers';
      stubWorkbenchScenario('projection');
      visitWorkbenchCanvas();
      openWorkbenchModel(model);
      for (const [position, step] of steps.entries()) {
        stageWorkbenchUnary(
          step,
          position === 0 ? '[data-operator="project"]' : '[data-operator="aggregate"]',
          position === 0
        );
        cy.get(form).within(() => {
          cy.contains('label', step === 'aggregate' ? 'GROUP BY' : 'ORDER BY')
            .find('select')
            .select(step === 'aggregate' ? 'country' : steps.length === 2 ? 'total' : 'name');
          if (step === 'window')
            cy.contains('label', 'PARTITION BY').find('select').select(['country']);
          cy.contains('label', 'Result name')
            .find('input')
            .clear()
            .type(step === 'aggregate' ? 'total' : 'position');
          cy.get('button[type="submit"]').click();
        });
      }
      cy.get(
        steps.at(-1) === 'window' ? '[data-presentation="window"]' : '[data-operator="aggregate"]'
      )
        .closest('li')
        .as('measure');
      connectWorkbenchProducer(
        '@measure',
        '[data-slot="canvas-relational-output-input-port"]',
        null
      );
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      let fields: readonly string[];
      let relations: readonly string[];
      let rootId = '';
      cy.wrap(null).should(() => {
        const write = semanticWrites(model).at(-1);
        expect(write, 'saved canonical document').not.to.equal(undefined);
        const document = decodeDvtSubstraitSemanticDocument(
          semanticDocumentFromWrite(write!, model)
        );
        const { index } = deriveSubstraitSchemas(document);
        const root = index.relations.get(index.rootId)!;
        rootId = index.rootId;
        fields = root.fields.map((field) => field.fieldId);
        relations = [...index.relations.keys()];
        expect(new Set(fields).size).to.equal(fields.length);
        expect(root.fields.map((field) => field.displayName)).to.deep.equal(
          steps.length === 2
            ? ['country', 'total', 'position']
            : steps[0] === 'aggregate'
              ? ['country', 'total']
              : ['name', 'email', 'country', 'position']
        );
        if (steps.some((step) => step === 'window')) {
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
          expect(
            expression.value.sorts.map(
              (sort) => input.fields[dvtSubstraitExpression.fieldOrdinal(sort.expr!)!]?.displayName
            )
          ).to.deep.equal([steps.length === 2 ? 'total' : 'name']);
        }
        if (steps.some((step) => step === 'aggregate')) {
          const grouped = [...index.relations.values()].find(
            (relation) => relation.relation.relType.case === 'aggregate'
          )!;
          if (grouped.relation.relType.case !== 'aggregate') throw new Error('Expected Aggregate');
          const input = index.relations.get(grouped.inputs[0]!)!;
          expect(
            grouped.relation.relType.value.groupingExpressions.map(
              (expression) =>
                input.fields[dvtSubstraitExpression.fieldOrdinal(expression)!]?.displayName
            )
          ).to.deep.equal(['country']);
        }
      });
      cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      revisitWorkbenchCanvas();
      openWorkbenchModel(model);
      cy.get('[data-slot="canvas-relational-tree-node"][data-relation-id]').should((nodes) => {
        expect([...nodes].map((node) => node.getAttribute('data-relation-id'))).to.have.members(
          relations
        );
      });
      cy.then(() =>
        cy.get(`[data-slot="canvas-relational-tree-node"][data-relation-id="${rootId}"]`).click()
      );
      cy.get('[data-slot="canvas-operation-output-tab"]:visible').click();
      cy.get('[data-slot="canvas-relation-outputs"] [data-field-id]').should((outputs) => {
        expect([...outputs].map((output) => output.getAttribute('data-field-id'))).to.deep.equal(
          fields
        );
      });
    });
  }
});
