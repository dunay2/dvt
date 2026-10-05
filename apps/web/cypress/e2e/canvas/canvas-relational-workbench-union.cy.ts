/**
 * Owned concern: preserve ordered UNION occurrences through Apply, edit, Cancel and reopen.
 * @baseline GH-3271-UNION-INPUTS: UNION owns N inputs; physical sources remain reusable.
 * @decision Exercise both modes through existing gestures and parse the actual save contract.
 * @consequence Aliases never substitute for identity, and Cancel permits no draft writes.
 * @version 1.0.0
 */
import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY,
  DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
  DvtRelationalAuthoringDraftV1Schema,
  DvtTransformAuthoringAuthorityV1Schema,
  WorkspaceGraphDraftSaveRequestSchema,
} from '@dvt/contracts';
import { indexSubstraitRelations, type IndexedRelation } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  connectWorkbenchProducer,
  revisitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const modelId = 'union-transform';
const card = '[data-slot="canvas-relational-tree-node"]';
const relationCard = (id: string): string => `${card}[data-relation-id="${id}"]`;
const writes = (): ReturnType<typeof getE2eApiCalls> =>
  getE2eApiCalls('/workspace/graph/draft', 'PUT');
const synced = (): Cypress.Chainable<JQuery<HTMLElement>> =>
  cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');

type SavedUnion = Readonly<{
  draft: ReturnType<typeof WorkspaceGraphDraftSaveRequestSchema.parse>['draft'];
  root: IndexedRelation;
  reads: readonly IndexedRelation[];
  relationCount: number;
  pending: unknown;
}>;

function savedUnion(): SavedUnion {
  const { draft } = WorkspaceGraphDraftSaveRequestSchema.parse(writes().at(-1)?.body);
  const metadata = draft.nodes.find((node) => node.id === modelId)?.metadata;
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    metadata?.[DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]
  );
  const indexed = indexSubstraitRelations(
    decodeDvtSubstraitSemanticDocument(authority.semanticDocument)
  );
  if (!indexed.ok) throw indexed.error;
  const root = indexed.index.relations.get(indexed.index.rootId)!;
  return {
    draft,
    root,
    reads: root.inputs.map((id) => indexed.index.relations.get(id)!),
    relationCount: indexed.index.relations.size,
    pending: metadata?.[DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY],
  };
}

function addOccurrence(side: 'north' | 'south'): Cypress.Chainable<string> {
  cy.get(`[data-slot="canvas-relational-tree-source"][data-node-id="source-customers-${side}"]`)
    .should('have.length', 1)
    .closest('li')
    .find('[data-slot="source-occurrence-add"]')
    .should('have.attr', 'aria-disabled', 'false')
    .click();
  return cy
    .get(`${card}[data-operator="read"][data-pending="true"][aria-selected="true"]`)
    .should('have.length', 1)
    .invoke('attr', 'data-relation-id')
    .then((id) => {
      expect(id, 'new occurrence identity').to.be.a('string').and.not.equal('');
      return id!;
    });
}

function applyUnion(): void {
  cy.then(() => {
    const before = writes().length;
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.be.disabled').click();
    cy.wrap(null).should(() => expect(writes().length).to.be.greaterThan(before));
    synced();
  });
}

function removeMiddleInput(): void {
  cy.get(
    '[data-slot="canvas-relational-edge-action"][data-port="1"], [data-slot="canvas-relational-pending-edge-action"][data-port="1"]'
  )
    .should('have.length', 1)
    .focus()
    .trigger('keydown', { key: 'Delete' });
}

describe('Workbench UNION', () => {
  beforeEach(() => stubWorkbenchScenario('pending-set'));
  for (const [mode, setOp] of [
    ['all', SetRel_SetOp.UNION_ALL],
    ['distinct', SetRel_SetOp.UNION_DISTINCT],
  ] as const) {
    it(`preserves UNION ${mode} identities through 3 → 4 → 3 inputs and Cancel`, () => {
      const ids: string[] = [];
      const names = [
        'customers_north',
        'customers_south',
        'customers_north 2',
        'customers_south 2',
      ];
      let first: SavedUnion;
      const assertSaved = (ordinals: readonly number[]): SavedUnion => {
        const current = savedUnion();
        expect(current.root.relation.relType.case).to.equal('set');
        if (current.root.relation.relType.case === 'set')
          expect(current.root.relation.relType.value.op).to.equal(setOp);
        expect(current.relationCount).to.equal(ordinals.length + 1);
        expect(current.reads.map((read) => read.relation.relType.case)).to.deep.equal(
          ordinals.map(() => 'read')
        );
        expect(current.root.inputs).to.deep.equal(ordinals.map((ordinal) => ids[ordinal]));
        expect(new Set(current.root.inputs).size).to.equal(ordinals.length);
        expect(current.reads.map((read) => read.binding.displayName)).to.deep.equal(
          ordinals.map((ordinal) => names[ordinal])
        );
        expect(current.reads.map((read) => read.binding.sourceRef)).to.deep.equal(
          ordinals.map((ordinal) => first.reads[ordinal % 2]!.binding.sourceRef)
        );
        expect(current.root.binding.relationId).to.equal(first.root.binding.relationId);
        expect(
          current.root.fields.map(({ fieldId, displayName }) => ({ fieldId, displayName }))
        ).to.deep.equal(
          first.root.fields.map(({ fieldId, displayName }) => ({ fieldId, displayName }))
        );
        return current;
      };
      cy.viewport(1400, 900);
      visitWorkbenchCanvas();
      openWorkbenchModel(modelId);
      for (const side of ['north', 'south', 'north'] as const)
        addOccurrence(side).then((id) => {
          ids.push(id);
        });
      cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
      cy.get(`[data-slot="dvt-select-operation-union-${mode}"]`).click();
      cy.get('[data-pending-operation="true"]').should('have.length', 1).as('union');
      cy.then(() => {
        ids.forEach((id, port) => {
          cy.get(relationCard(id)).closest('li').as('producer');
          connectWorkbenchProducer('@producer', '@union', port);
        });
      });
      connectWorkbenchProducer('@union', '[data-slot="canvas-relational-output-input-port"]', null);
      applyUnion();
      cy.then(() => {
        first = savedUnion();
        assertSaved([0, 1, 2]);
        expect(first.draft.nodes.map((node) => node.id)).to.have.members([
          'source-customers-north',
          'source-customers-south',
          modelId,
        ]);
        for (const [ordinal, side] of ['north', 'south'].entries()) {
          expect(first.reads[ordinal]!.binding.sourceRef?.sourceObjectId).to.equal(
            `public.customers_${side}`
          );
          expect(first.reads[ordinal]!.binding.sourceRef).to.deep.equal(
            first.draft.nodes.find((node) => node.id === `source-customers-${side}`)!.metadata
              ?.connectedSourceRef
          );
        }
        expect(first.root.fields.map((field) => field.displayName)).to.deep.equal([
          'customer_id',
          'name',
          'country',
        ]);
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      revisitWorkbenchCanvas();
      openWorkbenchModel(modelId);
      cy.then(() => cy.get(relationCard(first.root.binding.relationId)).closest('li').as('union'));
      addOccurrence('south').then((id) => {
        ids.push(id);
        cy.get('@union')
          .find('[data-slot="canvas-relational-input-port"]')
          .should('have.length', 4);
        cy.get(relationCard(id)).closest('li').as('producer');
        connectWorkbenchProducer('@producer', '@union', 3);
      });
      applyUnion();
      cy.then(() => {
        assertSaved([0, 1, 2, 3]);
      });
      cy.get(`${card}[data-operator="set"]`).click();
      cy.get('[data-slot="canvas-relational-edit"]').click();
      removeMiddleInput();
      applyUnion();
      cy.then(() => {
        const current = assertSaved([0, 2, 3]);
        const pending = DvtRelationalAuthoringDraftV1Schema.parse(current.pending);
        expect(pending.operations).to.have.length(0);
        expect(pending.sources).to.have.length(1);
        expect(pending.sources[0]).to.include({
          relationId: ids[1],
          sourceNodeId: 'source-customers-south',
          displayName: names[1],
        });
        expect(pending.sources[0]!.semanticDocument.sidecar.relations[0]!.sourceRef).to.deep.equal(
          first.reads[1]!.binding.sourceRef
        );
      });
      synced();
      cy.then(() => {
        const beforeCancel = writes().length;
        cy.get(`${card}[data-operator="set"]`).click();
        cy.get('[data-slot="canvas-relational-tree-cancel"]').should('be.visible');
        removeMiddleInput();
        cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
        synced();
        cy.then(() => {
          expect(writes().length, 'Cancel creates no draft PUT').to.equal(beforeCancel);
          assertSaved([0, 2, 3]);
        });
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      revisitWorkbenchCanvas();
      openWorkbenchModel(modelId);
      cy.get(`${card}[data-operator="set"]`).should('have.length', 1);
      cy.get(`${card}[data-operator="read"]`).should('have.length', 4);
      cy.then(() => {
        cy.get(relationCard(first.root.binding.relationId)).should(
          'have.attr',
          'data-operator',
          'set'
        );
        ids.forEach((id, ordinal) => {
          cy.get(relationCard(id))
            .find('[data-slot="canvas-relational-node-title"]')
            .should('have.text', names[ordinal]);
        });
        cy.get(relationCard(ids[1]!)).should('have.attr', 'data-pending', 'true');
        for (const [port, ordinal] of [0, 2, 3].entries())
          cy.get(relationCard(ids[ordinal]!)).should((node) => {
            expect(node).not.to.have.attr('data-pending');
            expect(node).to.have.attr('aria-posinset', String(port + 1));
          });
      });
    });
  }
});
