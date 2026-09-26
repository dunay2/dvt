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
  it('clears the last source, guards the empty draft, restores on Cancel and accepts a replacement', () => {
    stubWorkbenchScenario('projection');
    cy.viewport(1440, 1000);
    visitWorkbenchCanvas();
    openWorkbenchModel('transform-customers');
    let originalId = '';
    cy.get('[data-operator="read"]')
      .should('have.length', 1)
      .then(($read) => {
        originalId = $read.attr('data-relation-id')!;
      });
    const remove = (): void => {
      cy.get('[data-operator="read"]').rightclick();
      cy.get('[data-slot="canvas-relational-remove-source"]').click();
      cy.get('[data-slot="canvas-relational-removal-confirm"]').click();
      cy.get('[data-operator="read"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-tree-output"]').should('be.visible');
      cy.get('[data-slot="canvas-relational-tree-layout"] > svg path').should('not.exist');
      cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    };
    remove();
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();
    cy.get('[data-operator="read"]').should(($read) =>
      expect($read.attr('data-relation-id')).to.equal(originalId)
    );
    cy.then(() => {
      // Viewport autosave may write the unchanged graph; deleting/canceling must not change semantics.
      for (const write of semanticWrites('transform-customers')) {
        const document = decodeDvtSubstraitSemanticDocument(
          semanticDocumentFromWrite(write, 'transform-customers')
        );
        expect(
          document.sidecar.relations
            .filter((binding) => binding.sourceRef != null)
            .map((binding) => binding.relationId)
        ).to.deep.equal([originalId]);
      }
    });
    remove();
    const dataTransfer = new DataTransfer();
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .first()
      .trigger('dragstart', { dataTransfer });
    cy.get('[data-slot="canvas-relational-tree-draft-viewport"]')
      .trigger('dragover', { dataTransfer })
      .trigger('drop', { dataTransfer });
    cy.get('[data-pending="true"]').should('have.length', 1);
    cy.get('[data-slot="source-occurrence-connect"]').click();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-slot="dvt-select-operation-projection"]').click();
    cy.get('[data-operator="read"]').should('have.length', 1).click();
    cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
    cy.get('[data-operation="field_transform"]')
      .should('have.attr', 'aria-disabled', 'false')
      .click();
    cy.get('[data-slot="canvas-transform-inspector"]').should('be.visible');
    cy.get('[data-operator="join"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.wrap(null).should(() => {
      const write = semanticWrites('transform-customers').at(-1);
      expect(write).not.to.equal(undefined);
      const document = decodeDvtSubstraitSemanticDocument(
        semanticDocumentFromWrite(write!, 'transform-customers')
      );
      const sources = document.sidecar.relations.filter((binding) => binding.sourceRef != null);
      expect(sources).to.have.length(1);
      expect(sources[0]!.relationId).not.to.equal(originalId);
    });
    cy.then(() => {
      expect(getE2eApiCalls(/data-sample/, 'GET')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
  });
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
    let originalAlias = '';
    let documentBeforeRename: unknown;
    let selectedFields: string[] = [];
    cy.get('[data-operator="read"]')
      .should('have.length', 2)
      .then(($reads) => {
        originalReads = Array.from($reads, (read) => read.getAttribute('data-relation-id')!);
        originalAlias =
          $reads[0]!.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent ?? '';
        expect(originalAlias).not.to.equal('');
      });
    const dataTransfer = new DataTransfer();
    let pendingId = '';
    let zoom = '';
    cy.get('[data-slot="canvas-relational-tree"]').then(($tree) => {
      zoom = $tree[0]!.style.zoom;
    });
    cy.get('[data-slot="canvas-relational-tree-source"]')
      .first()
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer });
    cy.get('[data-slot="canvas-relational-tree-viewport"]').then(($viewport) => {
      const bounds = $viewport[0]!.getBoundingClientRect();
      cy.wrap($viewport)
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer, clientX: bounds.left + 240, clientY: bounds.top + 230 });
    });
    cy.get('[data-slot="canvas-relational-tree-draft"]').should(($tree) => {
      expect($tree[0]!.style.zoom).to.equal(zoom);
    });
    cy.get('[data-pending="true"]')
      .should('have.length', 1)
      .should('be.visible')
      .then(($read) => {
        pendingId = $read.attr('data-relation-id')!;
        const bounds = $read[0]!.getBoundingClientRect();
        const card = $read[0]!.closest('li')!;
        const initial = { left: card.style.left, top: card.style.top };
        cy.wrap($read).trigger('pointerdown', {
          pointerId: 1,
          button: 0,
          clientX: bounds.left + 20,
          clientY: bounds.top + 20,
        });
        cy.get('[data-slot="canvas-relational-tree-layout"]')
          .trigger('pointermove', {
            pointerId: 1,
            clientX: bounds.left + 90,
            clientY: bounds.top + 60,
          })
          .trigger('pointerup', {
            pointerId: 1,
            clientX: bounds.left + 90,
            clientY: bounds.top + 60,
          });
        cy.get('[data-pending="true"]').should(($moved) => {
          const moved = $moved[0]!.closest('li')!;
          expect(moved.style.left).not.to.equal(initial.left);
          expect(moved.style.top).not.to.equal(initial.top);
          expect($moved.attr('data-relation-id')).to.equal(pendingId);
        });
      });
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.get('[data-pending="true"]').click();
    cy.get('[data-slot="canvas-relational-tree-append-input"]').should('not.exist');
    cy.get('[data-canvas-inspector="true"]:visible').should(($inspector) => {
      expect($inspector.attr('data-relation-id')).to.equal(pendingId);
    });
    cy.get('[data-slot="source-occurrence-alias"]').focus().should('be.focused').clear();
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.then(() => {
      for (const write of getE2eApiCalls('/workspace/graph/draft', 'PUT')) {
        const document = decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write));
        expect(
          document.sidecar.relations
            .filter((binding) => binding.sourceRef != null)
            .map((binding) => binding.relationId)
        ).to.have.members(originalReads);
      }
    });
    cy.get('[data-slot="source-occurrence-alias"]').type('Pending customers');
    cy.get('[data-slot="source-occurrence-update"]').click();
    cy.get('[data-pending="true"]').should('contain.text', 'Pending customers');
    cy.get('[data-slot="source-occurrence-connect"]').click();
    cy.get('[data-slot="canvas-relational-tree-append-input"]').should('be.visible').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.enabled').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
    cy.wrap(null).should(() => {
      const write = semanticWrites('join-transform').at(-1);
      expect(write).not.to.equal(undefined);
      const document = decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write!));
      expect(
        document.sidecar.relations.filter((binding) => binding.sourceRef != null)
      ).to.have.length(3);
      expect(
        document.sidecar.relations.some((binding) => binding.relationId === pendingId)
      ).to.equal(true);
    });
    cy.then(() => {
      documentBeforeRename = semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!);
    });
    cy.get('[data-operator="read"]').should('have.length', 3).last().click();
    cy.get('[data-slot="canvas-relational-edit"]').click();
    cy.get('[data-slot="source-occurrence-alias"]')
      .should('exist')
      .then(($input) => {
        const alias = $input.val();
        expect(alias).to.be.a('string').and.not.equal(originalAlias);
      });
    cy.then(() => {
      cy.get('[data-slot="source-occurrence-alias"]').clear().type(`  ${originalAlias}  `);
    });
    cy.get('[data-slot="source-occurrence-alias"]').should('have.attr', 'aria-invalid', 'true');
    cy.get('[data-slot="source-occurrence-update"]').should('be.disabled');
    cy.get('[data-slot="canvas-relational-tree-apply"]').should('be.disabled');
    cy.then(() => {
      expect(semanticDocumentFromWrite(semanticWrites('join-transform').at(-1)!)).to.deep.equal(
        documentBeforeRename
      );
    });
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
      expect(new Set(inputs.map((input) => input.displayName)).size).to.equal(3);
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
    cy.get('[data-slot="source-occurrence-alias"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-edit"]').click();
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
