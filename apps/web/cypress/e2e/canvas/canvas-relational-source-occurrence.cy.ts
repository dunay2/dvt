/** Repeat a Read, preserve field identity, then query its physical source explicitly. */
import { SourceDataSampleResponseSchema } from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls, stubE2eJsonApi } from '../../support/e2eApiStub';
import {
  openWorkbenchModel,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticDocumentFromWrite,
  semanticWrites,
} from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

const sourcePath = '/workspace/warehouse/connections/warehouse-a/source-data-sample';

describe('Explicit source occurrences (controlled API boundary)', () => {
  it('persists an independently named Read without duplicating the physical source or querying implicitly', () => {
    stubWorkbenchScenario('saved-join');
    stubE2eJsonApi(
      'GET',
      sourcePath,
      SourceDataSampleResponseSchema.parse({
        contractVersion: 1,
        connectionId: 'warehouse-a',
        objectId: 'relation/dvt/public/customers',
        columns: [{ name: 'customer_id', type: 'string', nullable: false }],
        rows: [{ values: ['C-001'] }],
        limit: 20,
        truncated: false,
        sampledAt: '2026-09-24T00:00:00.000Z',
      })
    );
    cy.viewport(1440, 1000);
    visitWorkbenchCanvas();
    openWorkbenchModel();
    let originalReads: string[] = [];
    let selectedFields: string[] = [];
    cy.get('[data-operator="read"]')
      .should('have.length', 2)
      .then(($reads) => {
        originalReads = Array.from($reads, (read) => read.getAttribute('data-relation-id')!);
      });
    cy.get('[data-slot="source-occurrence-add"]').first().click();
    cy.get('[data-slot="canvas-relational-tree-append-input"]').should('be.visible').click();
    cy.get('[data-operator="read"]').should('have.length', 3).last().click();
    cy.get('[data-slot="source-occurrence-alias"]').clear().type('Regional customers');
    cy.get('[data-slot="source-occurrence-update"]').click();
    cy.get('[data-operator="read"]').last().should('contain.text', 'Regional customers');
    cy.get('[data-slot="canvas-relation-fields"] [data-field-id]')
      .should('have.length.greaterThan', 0)
      .then(($fields) => {
        selectedFields = Array.from($fields, (field) => field.getAttribute('data-field-id')!);
        expect(new Set(selectedFields).size).to.equal(selectedFields.length);
      });
    cy.get('[data-slot="canvas-relational-tree-source"]').should('have.length', 2);
    cy.then(() => expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    let appendedId = '';
    cy.wrap(null).should(() => {
      const write = semanticWrites('join-transform').at(-1);
      expect(write).not.to.equal(undefined);
      const draft = decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write!));
      const { index } = deriveSubstraitSchemas(draft);
      const inputs = [...index.relations.values()]
        .filter((entry) => entry.relation.relType.case === 'read')
        .map((entry) => entry.binding)
        .sort((left, right) => left.relAnchor - right.relAnchor);
      expect(inputs).to.have.length(3);
      expect(inputs.slice(0, 2).map((input) => input.relationId)).to.deep.equal(originalReads);
      expect(new Set(inputs.map((input) => input.relationId)).size).to.equal(3);
      expect(inputs[2]!.sourceRef).to.deep.equal(inputs[0]!.sourceRef);
      appendedId = inputs[2]!.relationId;
      expect(
        draft.sidecar.fields
          .filter((field) => field.relationId === appendedId && field.parentFieldId == null)
          .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
          .map((field) => field.fieldId)
      ).to.deep.equal(selectedFields);
      expect(
        draft.sidecar.relations.find((binding) => binding.relationId === appendedId)?.displayName
      ).to.equal('Regional customers');
      const { draft: savedGraph } = write!.body as { draft: { edges: { targetId: string }[] } };
      expect(savedGraph.edges.filter((edge) => edge.targetId === 'join-transform')).to.have.length(
        2
      );
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel();
    cy.get('[data-operator="read"]').should('have.length', 3).last().click();
    cy.get('[data-slot="source-occurrence-alias"]').should('have.value', 'Regional customers');
    cy.get('[data-slot="canvas-relation-fields"] [data-field-id]').should(($fields) => {
      expect(Array.from($fields, (field) => field.getAttribute('data-field-id'))).to.deep.equal(
        selectedFields
      );
    });
    cy.get(
      '[data-slot="canvas-relational-tree-inline-editor"]:visible [data-slot="canvas-relational-collapse"]'
    ).click();
    cy.get('[data-operator="read"]')
      .last()
      .parent()
      .find('[data-slot="canvas-node-execute"]')
      .focus()
      .should('be.visible')
      .click();
    cy.wrap(null).should(() => {
      const samples = getE2eApiCalls(sourcePath, 'GET');
      expect(samples).to.have.length(1);
      expect(samples[0]!.url.searchParams.get('objectId')).to.equal(
        'relation/dvt/public/customers'
      );
      expect(samples[0]!.url.searchParams.get('limit')).to.equal('20');
      expect(getE2eApiCalls(/\/transforms\/.*\/data-sample/, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
    cy.get('[data-slot="bottom-operational-drawer-data"] table').should('contain.text', 'C-001');
  });
});
