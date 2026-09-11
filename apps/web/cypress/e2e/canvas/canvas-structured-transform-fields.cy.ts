/** Owned concern: prove structured Transform fields through the canonical Canvas command rail. */
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
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
  stubStatefulCanvasDraftAuthoring({
    canvasKind: 'transformation',
    columnMapping: true,
    columnMappingTemporal: true,
  });
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

function latestProjection(): ReturnType<typeof inspectDvtSubstraitProjectionDraft> {
  const savedModels = getE2eApiCalls('/workspace/graph/draft', 'PUT')
    .map((call) => call.body as DraftSave)
    .map((save) => save.draft.nodes.find((node) => node.id === 'model-orders'))
    .filter((node) => node != null);
  const firstSemanticSave = savedModels.findIndex((model) => {
    const authority = model.metadata?.transformAuthoring as
      { semanticDocument?: unknown } | undefined;
    return authority?.semanticDocument != null;
  });
  if (firstSemanticSave < 0) {
    throw new Error('No Draft PUT persisted Transform semantic authority.');
  }
  const inspections = savedModels.slice(firstSemanticSave).map((model, index) => {
    const authority = model.metadata?.transformAuthoring as
      { semanticDocument?: unknown } | undefined;
    if (authority?.semanticDocument == null) {
      throw new Error(
        'Draft PUT ' +
          String(firstSemanticSave + index) +
          ' lost Transform semantic authority: ' +
          JSON.stringify(model.metadata)
      );
    }
    return inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
  });
  return inspections.at(-1)!;
}

describe('Canvas structured Transform fields', () => {
  beforeEach(() => stubCanvas());

  it('creates and reloads one reusable CONCAT output without losing operands', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    expandAndAssignColumns();

    modelCard().contains('button', 'Show remaining columns').click();
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="region"]')
      .focus()
      .trigger('keydown', { key: 'ArrowUp', altKey: true });
    modelCard()
      .find('[data-slot="graph-node-column-piece"]')
      .should((pieces) => {
        const names = [...pieces].map((piece) => piece.getAttribute('data-column-name'));
        expect(names.indexOf('region')).to.equal(names.indexOf('status') + 1);
      });
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="region"]')
      .focus()
      .trigger('keydown', { key: 'ArrowLeft', altKey: true });
    cy.contains('[data-slot="graph-node-column-composition-function"]', 'CONCAT').click();
    cy.get('[data-slot="graph-node-column-function-alias-input"]').type('status_region');
    cy.get('[data-slot="graph-node-column-function-alias-submit"]').click();

    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestProjection();
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      expect(inspection.projection.outputs.map((output) => output.name)).to.include.members([
        'order_id',
        'customer',
        'status_region',
      ]);
      const derived = inspection.projection.outputs.find(
        (output) => output.name === 'status_region'
      );
      expect(derived?.scalarExpression).to.deep.equal({
        kind: 'scalar-function',
        functionName: 'concat',
        arguments: [
          { kind: 'field-reference', sourceFieldName: 'status' },
          { kind: 'field-reference', sourceFieldName: 'region' },
        ],
        nullHandling: 'ACCEPT_NULLS',
      });
    });

    modelCard().should('contain.text', 'status');
    modelCard().should('contain.text', 'region');
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="status_region"]')
      .should('be.focused');

    visitCanvas();
    modelCard().find('[data-slot="graph-node-column-toggle"]').click();
    modelCard().contains('button', 'Show remaining columns').click();
    modelCard().should('contain.text', 'order_id');
    modelCard().should('contain.text', 'customer');
    modelCard().should('contain.text', 'status_region');
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="status_region"]')
      .rightclick(20, 10);
    cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
    cy.get('[data-slot="graph-node-column-function"]').should('contain.text', 'UPPER');
    cy.get('[data-slot="graph-node-column-function"]').should('contain.text', 'CONCAT');
    cy.get('body').type('{esc}');
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="status_region"]')
      .focus()
      .trigger('keydown', { key: 'ArrowUp', altKey: true });
    modelCard()
      .find('[data-slot="graph-node-column-piece"]')
      .should((pieces) => {
        const names = [...pieces].map((piece) => piece.getAttribute('data-column-name'));
        expect(names.indexOf('status_region')).to.equal(names.indexOf('region') + 1);
      });
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="status_region"]')
      .focus()
      .trigger('keydown', { key: 'ArrowLeft', altKey: true });
    cy.contains('[data-slot="graph-node-column-composition-function"]', 'CONCAT').click();
    cy.get('[data-slot="graph-node-column-function-expression"]').should(
      'contain.text',
      'CONCAT(region, status_region)'
    );
    cy.get('[data-slot="graph-node-column-function-alias-input"]').type('region_status_region');
    cy.get('[data-slot="graph-node-column-function-alias-submit"]').click();
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="region_status_region"]')
      .should('be.focused');
    cy.wrap(null).should(() => {
      const inspection = latestProjection();
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      expect(
        inspection.projection.outputs.find((output) => output.name === 'region_status_region')
          ?.operandFieldIds
      ).to.have.length(2);
    });
  });

  it('persists and reuses an ordered three-operand COALESCE expression', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    expandAndAssignColumns();

    modelCard().contains('button', 'Show remaining columns').click();
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="status"]')
      .rightclick(20, 10);
    cy.contains('[data-slot="graph-node-column-function"]', 'COALESCE').click();
    cy.get('[data-slot="graph-node-expression-composer"]').should('be.visible');
    cy.get('[data-slot="graph-node-expression-operand"]').should('have.length', 2);
    cy.get('[data-slot="graph-node-expression-add-operand"]').click();
    cy.get('[data-slot="graph-node-expression-operand"]').should('have.length', 3);
    cy.get('[data-slot="graph-node-expression-move-up"]').eq(2).click();
    cy.get('[data-slot="graph-node-column-function-expression"]').should(
      'have.text',
      'COALESCE(status, region, customer)'
    );
    cy.get('[data-slot="graph-node-column-function-alias-input"]').type('resolved_status');
    cy.get('[data-slot="graph-node-column-function-alias-submit"]').click();

    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestProjection();
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      const resolved = inspection.projection.outputs.find(
        (output) => output.name === 'resolved_status'
      );
      expect(resolved?.operandFieldIds).to.have.length(3);
      expect(resolved?.scalarExpression).to.deep.equal({
        kind: 'scalar-function',
        functionName: 'coalesce',
        arguments: [
          { kind: 'field-reference', sourceFieldName: 'status' },
          { kind: 'field-reference', sourceFieldName: 'region' },
          { kind: 'field-reference', sourceFieldName: 'customer' },
        ],
      });
    });

    visitCanvas();
    modelCard().find('[data-slot="graph-node-column-toggle"]').click();
    modelCard().contains('button', 'Show remaining columns').click();
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="resolved_status"]')
      .should('be.visible')
      .rightclick(20, 10);
    cy.contains('[data-slot="graph-node-column-function"]', 'UPPER').click();
    cy.get('[data-slot="graph-node-column-function-alias-input"]').type('upper_resolved_status');
    cy.get('[data-slot="graph-node-column-function-alias-submit"]').click();

    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestProjection();
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      const reused = inspection.projection.outputs.find(
        (output) => output.name === 'upper_resolved_status'
      );
      expect(reused?.scalarExpression).to.deep.equal({
        kind: 'scalar-function',
        functionName: 'upper',
        arguments: [
          {
            kind: 'scalar-function',
            functionName: 'coalesce',
            arguments: [
              { kind: 'field-reference', sourceFieldName: 'status' },
              { kind: 'field-reference', sourceFieldName: 'region' },
              { kind: 'field-reference', sourceFieldName: 'customer' },
            ],
          },
        ],
      });
    });
  });

  it('shows and persists the admitted timestamp function from the column menu', () => {
    cy.viewport(1920, 1080);
    visitCanvas();
    expandAndAssignColumns();

    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="created_at"]')
      .rightclick(20, 10);
    cy.get('[data-slot="graph-node-column-function-menu"]')
      .should('be.visible')
      .and('contain.text', 'Date and time functions');
    cy.contains('[data-slot="graph-node-column-function"]', 'EXTRACT YEAR (UTC)').click();
    cy.get('[data-slot="graph-node-column-function-expression"]').should(
      'have.text',
      "EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC')"
    );
    cy.get('[data-slot="graph-node-column-function-alias-input"]').type('created_year');
    cy.get('[data-slot="graph-node-column-function-alias-submit"]').click();

    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="created_year"]')
      .should('be.focused');
    cy.wrap(null, { timeout: 10_000 }).should(() => {
      const inspection = latestProjection();
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      expect(inspection.projection.outputs.map((output) => output.name)).to.include.members([
        'created_at',
        'created_year',
      ]);
      expect(
        inspection.projection.outputs.find((output) => output.name === 'created_year')
      ).to.deep.include({
        dataType: 'bigint',
        scalarExpression: {
          kind: 'scalar-function',
          functionName: 'extract',
          arguments: [{ kind: 'field-reference', sourceFieldName: 'created_at' }],
          component: 'YEAR',
          timezone: 'UTC',
        },
      });
    });

    visitCanvas();
    modelCard().find('[data-slot="graph-node-column-toggle"]').click();
    modelCard().contains('button', 'Show remaining columns').click();
    modelCard()
      .find('[data-slot="graph-node-column-piece"][data-column-name="created_year"]')
      .should('be.visible')
      .and('contain.text', 'bigint');
  });

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
      .rightclick(20, 10);
    cy.get('[data-slot="graph-node-column-function-menu"]').should('be.visible');
    cy.get('[data-slot="canvas-node-context-menu"]').should('not.exist');
    cy.get('body').type('{esc}');

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
