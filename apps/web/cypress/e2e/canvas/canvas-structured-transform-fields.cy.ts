/** Owned concern: prove structured Transform fields through the canonical Canvas command rail. */
import {
  decodeDvtSubstraitStructuredFieldDocument,
  inspectDvtSubstraitStructuredFieldDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitStructuredField';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

type DraftSave = {
  draft: {
    nodes: Array<{
      id: string;
      metadata?: Record<string, unknown>;
    }>;
  };
};

function stubCanvas(): void {
  stubShellBootstrapApis({
    scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'],
  });
  stubE2eJsonApi('GET', '/workspace/context', {
    defaultWorkspace: E2E_PROJECT_WORKSPACE,
    availableWorkspaces: [E2E_PROJECT_WORKSPACE],
  });
  stubE2eJsonApi('GET', '/capabilities', {
    apiVersion: '1.0.0',
    minFrontendVersion: '0.0.1',
    plugins: { dvt: { available: true } },
  });
  stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', columnMapping: true });
}

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  waitForE2eApiCall('/healthz', 'GET');
  waitForE2eApiCall('/capabilities', 'GET');
  waitForE2eApiCall('/workspace/graph/draft', 'GET');
}

function modelCard(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.get('.react-flow__node[data-id="model-orders"]');
}

function expandAndAssignColumns(): void {
  modelCard().find('[data-slot="graph-node-column-toggle"]').click();
  modelCard().contains('button', 'Map compatible columns').click();
  waitForE2eApiCall('/workspace/graph/draft', 'PUT');
  // Let the stateful save resolution promote the mapped node into the persisted baseline.
  cy.wait(600);
}

function latestStructuredFields(): ReturnType<typeof inspectDvtSubstraitStructuredFieldDraft> {
  const inspections = getE2eApiCalls('/workspace/graph/draft', 'PUT')
    .map((call) => call.body as DraftSave)
    .map((save) => save.draft.nodes.find((node) => node.id === 'model-orders'))
    .filter((node) => node != null)
    .map((model) => {
      const authority = model.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      return inspectDvtSubstraitStructuredFieldDraft(
        decodeDvtSubstraitStructuredFieldDocument(authority?.semanticDocument)
      );
    });
  return (
    inspections
      .filter(
        (inspection) =>
          inspection.ok && inspection.fields.some((field) => field.name === 'identity')
      )
      .at(-1) ?? inspections.at(-1)!
  );
}

describe('Canvas structured Transform fields', () => {
  beforeEach(() => stubCanvas());

  it('proposes, persists, displays, and restores an ordered structured field', () => {
    let identityFieldId = '';
    let orderIdFieldId = '';
    let customerFieldId = '';
    let amountFieldId = '';

    cy.viewport(1920, 1080);
    visitCanvas();
    expandAndAssignColumns();

    modelCard()
      .contains('[data-slot="graph-node-column-row"]', 'customer')
      .find('[data-slot="graph-node-column-piece"]')
      .focus()
      .trigger('keydown', { key: 'ArrowLeft', altKey: true });
    cy.get('[data-slot="graph-node-column-composition-structured-field"]').click();
    cy.get('[data-slot="graph-node-structured-field-form"]').within(() => {
      cy.get('[data-slot="graph-node-structured-field-name"]').type('identity');
      cy.get('[data-slot="graph-node-structured-field-apply"]').click();
    });

    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      expect(inspection.ok ? inspection.fields.map((field) => field.name) : null).to.deep.equal([
        'identity',
        'amount',
        'status',
        'created_at',
        'region',
      ]);
      expect(
        inspection.ok ? inspection.fields[0]?.children.map((field) => field.name) : null
      ).to.deep.equal(['order_id', 'customer']);
      if (inspection.ok) {
        identityFieldId = inspection.fields[0]?.fieldId ?? '';
        orderIdFieldId = inspection.fields[0]?.children[0]?.fieldId ?? '';
        customerFieldId = inspection.fields[0]?.children[1]?.fieldId ?? '';
        expect(identityFieldId).not.to.equal('');
        expect(orderIdFieldId).not.to.equal('');
        expect(customerFieldId).not.to.equal('');
      }
    });
    modelCard().should('contain.text', 'identity').and('contain.text', 'order_id');
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="identity"]')
      .rightclick(20, 10);
    cy.contains('[data-slot="graph-node-structured-field-append"]', 'amount').click();
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      expect(
        inspection.ok ? inspection.fields[0]?.children.map((field) => field.name) : null
      ).to.deep.equal(['order_id', 'customer', 'amount']);
      if (inspection.ok) {
        expect(inspection.fields[0]?.fieldId).to.equal(identityFieldId);
        expect(
          inspection.fields[0]?.children.slice(0, 2).map((field) => field.fieldId)
        ).to.deep.equal([orderIdFieldId, customerFieldId]);
        amountFieldId = inspection.fields[0]?.children[2]?.fieldId ?? '';
        expect(amountFieldId).not.to.equal('');
      }
    });

    modelCard().find('[data-slot="graph-node-nested-column"]').eq(2).rightclick();
    cy.get('[data-slot="nested-column-move-up"]').click();
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      expect(
        inspection.ok ? inspection.fields[0]?.children.map((field) => field.name) : null
      ).to.deep.equal(['order_id', 'amount', 'customer']);
      expect(
        inspection.ok ? inspection.fields[0]?.children.map((field) => field.fieldId) : null
      ).to.deep.equal([orderIdFieldId, amountFieldId, customerFieldId]);
    });

    visitCanvas();
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      expect(inspection.ok ? inspection.fields[0]?.fieldId : null).to.equal(identityFieldId);
      expect(
        inspection.ok ? inspection.fields[0]?.children.map((field) => field.fieldId) : null
      ).to.deep.equal([orderIdFieldId, amountFieldId, customerFieldId]);
    });
    modelCard().find('[data-slot="graph-node-column-toggle"]').click();
    modelCard()
      .find('[data-slot="graph-node-nested-column"]')
      .then(($children) => {
        expect([...$children].map((child) => child.textContent)).to.deep.equal([
          'order_idinteger',
          'amountnumeric',
          'customertext',
        ]);
      });
  });
});
