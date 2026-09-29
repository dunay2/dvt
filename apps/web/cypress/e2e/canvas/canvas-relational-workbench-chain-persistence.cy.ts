/** Owned concern: a four-source chain saves once, previews only on request and survives reopening. */
import {
  DvtRelationalAuthoringDraftV1Schema,
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { getE2eApiCalls } from '../../support/e2eApiStub';
import { authorFourSourceChain } from '../../support/relationalWorkbench/joinChain';
import {
  visitWorkbenchCanvas,
  openWorkbenchModel,
  previewWorkbenchModel,
  dragWorkbenchSource,
} from '../../support/relationalWorkbench/navigation';
import {
  semanticWrites,
  semanticDocumentFromWrite,
} from '../../support/relationalWorkbench/persistence';
import { stubSavedWorkbenchSample } from '../../support/relationalWorkbench/persistence';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';

describe('Workbench chain-persistence', () => {
  beforeEach(() => {
    stubWorkbenchScenario('pending-chain');
    stubSavedWorkbenchSample();
  });
  for (const change of ['reorder', 'rename'] as const) {
    it(`preserves a saved pending Read or explicitly rejects incompatible provenance (${change})`, () => {
      cy.viewport(1440, 900);
      visitWorkbenchCanvas();
      openWorkbenchModel();
      dragWorkbenchSource('customers');
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();
      let savedOccurrence: unknown;
      let writeCount = 0;
      const pendingWrite = (): ReturnType<typeof getE2eApiCalls>[number] | undefined =>
        getE2eApiCalls('/workspace/graph/draft', 'PUT').findLast((call) => {
          const { draft } = call.body as { draft: WorkspaceGraphAuthoringDraft };
          return draft.nodes.some(
            (node) =>
              node.id === 'join-transform' && node.metadata?.relationalAuthoringDraft != null
          );
        });
      cy.wrap(null).should(() => {
        expect(pendingWrite(), 'Apply persists the incomplete authoring snapshot').not.to.equal(
          undefined
        );
      });
      cy.then(() => {
        const write = pendingWrite()!;
        writeCount = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
        const { draft } = write.body as { draft: WorkspaceGraphAuthoringDraft };
        const model = draft.nodes.find((node) => node.id === 'join-transform')!;
        const pending = DvtRelationalAuthoringDraftV1Schema.parse(
          model.metadata?.relationalAuthoringDraft
        );
        expect(pending.sources).to.have.length(1);
        savedOccurrence = structuredClone(pending.sources[0]);
        const producer = draft.nodes.find((node) => node.id === pending.sources[0]!.sourceNodeId)!;
        const columns = producer.metadata!.columns as Array<{ name: string }>;
        // The stateful transport now returns refreshed source metadata, without touching the saved Read.
        if (change === 'reorder') columns.reverse();
        else columns[0]!.name = 'renamed_customer_id';
        const workspace = draft.canvases?.find(
          (canvas) => canvas.canvas.id === draft.activeCanvasId
        );
        const scopedProducer = workspace?.nodes.find((node) => node.id === producer.id);
        if (scopedProducer?.metadata != null) scopedProducer.metadata.columns = columns;
        WorkspaceGraphAuthoringDraftSchema.parse(draft);
      });
      cy.get('[data-slot="canvas-model-tab-close"]').click();
      visitWorkbenchCanvas();
      openWorkbenchModel();
      if (change === 'rename') {
        cy.get('[data-slot="canvas-relational-tree-unavailable"]').should('be.visible');
        cy.get('[data-slot="canvas-relational-tree-apply"]').should('not.exist');
      } else {
        cy.get('[data-pending="true"][data-operator="read"]').should('contain.text', 'customers');
        cy.get('[data-slot="canvas-relational-tree-unavailable"]').should('not.exist');
      }
      cy.then(() => {
        const writes = getE2eApiCalls('/workspace/graph/draft', 'PUT');
        expect(writes, 'reopening never rewrites the draft').to.have.length(writeCount);
        const { draft } = pendingWrite()!.body as { draft: WorkspaceGraphAuthoringDraft };
        const pending = DvtRelationalAuthoringDraftV1Schema.parse(
          draft.nodes.find((node) => node.id === 'join-transform')!.metadata
            ?.relationalAuthoringDraft
        );
        expect(pending.sources[0]).to.deep.equal(savedOccurrence);
        expect(getE2eApiCalls(/\/data-sample$/, 'GET')).to.have.length(0);
      });
      cy.screenshot(`pending-source-identity-${change}`);
    });
  }
  it('saves the complete chain before an explicit model sample and reloads it', () => {
    authorFourSourceChain();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();
    cy.wrap(null).should(() => {
      const saves = semanticWrites('join-transform');
      expect(saves).to.have.length(1);
      const { index } = deriveSubstraitSchemas(
        decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(saves[0]!))
      );
      const entries = [...index.relations.values()];
      expect(entries.filter((entry) => entry.relation.relType.case === 'read')).to.have.length(4);
      expect(entries.filter((entry) => entry.relation.relType.case === 'join')).to.have.length(3);
    });
    cy.then(() => expect(getE2eApiCalls(/\/data-sample$/, 'GET')).to.have.length(0));
    previewWorkbenchModel();
    cy.get('[data-slot="bottom-operational-drawer-data"] table').should('contain.text', 'C-001');
    cy.screenshot('semantic-editor-data-preview');
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    visitWorkbenchCanvas();
    openWorkbenchModel('join-transform');
    cy.get('[data-slot="canvas-relational-tree-node"][data-operator="join"]').should(
      'have.length',
      3
    );
  });
});
