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
  return inspections.at(-1)!;
}

describe('Canvas structured Transform fields', () => {
  beforeEach(() => stubCanvas());

  it('retains roots, reorders the struct, restores it, and removes the grouping', () => {
    let identityFieldId = '';
    let orderChildId = '';
    let customerChildId = '';
    let amountChildId = '';

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
        'order_id',
        'customer',
        'amount',
        'status',
        'created_at',
        'region',
        'identity',
      ]);
      if (!inspection.ok) return;
      const identity = inspection.fields.find((field) => field.name === 'identity');
      const orderRoot = inspection.fields.find((field) => field.name === 'order_id');
      const customerRoot = inspection.fields.find((field) => field.name === 'customer');
      expect(identity?.children.map((field) => field.name)).to.deep.equal(['order_id', 'customer']);
      identityFieldId = identity?.fieldId ?? '';
      orderChildId = identity?.children[0]?.fieldId ?? '';
      customerChildId = identity?.children[1]?.fieldId ?? '';
      expect(orderChildId).not.to.equal(orderRoot?.fieldId);
      expect(customerChildId).not.to.equal(customerRoot?.fieldId);
    });

    modelCard().contains('button', 'Show remaining columns').click();
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="identity"]')
      .rightclick(20, 10);
    cy.contains('[data-slot="graph-node-structured-field-append"]', 'amount').click();
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      if (!inspection.ok) return;
      const identity = inspection.fields.find((field) => field.fieldId === identityFieldId);
      expect(identity?.children.map((field) => field.name)).to.deep.equal([
        'order_id',
        'customer',
        'amount',
      ]);
      amountChildId = identity?.children[2]?.fieldId ?? '';
      expect(inspection.fields.some((field) => field.name === 'amount')).to.equal(true);
    });

    modelCard().find('[data-slot="graph-node-nested-column"]').eq(2).rightclick();
    cy.get('[data-slot="nested-column-move-up"]').click();
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      const identity = inspection.ok
        ? inspection.fields.find((field) => field.fieldId === identityFieldId)
        : undefined;
      expect(identity?.children.map((field) => field.fieldId)).to.deep.equal([
        orderChildId,
        amountChildId,
        customerChildId,
      ]);
    });

    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="identity"]')
      .focus()
      .trigger('keydown', { key: 'ArrowUp', altKey: true });
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      expect(inspection.ok ? inspection.fields.at(-2)?.fieldId : null).to.equal(identityFieldId);
    });

    visitCanvas();
    modelCard().find('[data-slot="graph-node-column-toggle"]').click();
    modelCard().contains('button', 'Show remaining columns').click();
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="identity"]')
      .rightclick(20, 10);
    cy.get('[data-slot="graph-node-structured-field-remove"]').click();
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestStructuredFields();
      expect(inspection.ok ? inspection.fields.map((field) => field.name) : null).to.deep.equal([
        'order_id',
        'customer',
        'amount',
        'status',
        'created_at',
        'region',
      ]);
    });

    visitCanvas();
    modelCard().find('[data-slot="graph-node-column-toggle"]').click();
    modelCard().should('not.contain.text', 'identity');
    modelCard().should('contain.text', 'order_id').and('contain.text', 'customer');
  });
});
