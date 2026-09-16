/** Owned concern: prove the pending relational-operation chooser through the real Canvas route. */
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

describe('Canvas relational-operation chooser', () => {
  beforeEach(() => {
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
      substraitPendingComposition: true,
      substraitCompositionColumnType:
        Cypress.currentTest.title === 'authors the first JOIN from matching bigint fields'
          ? 'bigint'
          : 'string',
      title: 'Relational operation chooser',
    });
  });

  it('opens with the keyboard and cancels JOIN authoring without saving', () => {
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('[data-slot="canvas-relational-composition-badge"][role="button"]')
      .should('contain.text', 'RELATE / COMPOSE')
      .focus()
      .should('have.focus')
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));

    cy.get('[data-slot="dvt-relational-operation-chooser"]').should('be.visible');
    cy.get('[data-slot="dvt-select-operation-inner-join"]')
      .should('contain.text', 'Needs predicate')
      .and('not.be.disabled')
      .click();
    cy.get('[data-slot="dvt-composition-left-input"]').should('be.visible');
    cy.get('[data-slot="dvt-composition-right-input"]').should('be.visible');
    cy.get('[data-slot="semantic-workbench-join-condition-list"]').should('be.visible');
    cy.get('[data-slot="dvt-cancel-relational-operation"]').click();

    cy.get('[data-slot="dvt-relational-operation-chooser"]').should('be.visible');
    cy.wrap(null).should(() => {
      const savedTransforms = getE2eApiCalls('/workspace/graph/draft', 'PUT').map((call) => {
        const body = call.body as {
          draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
        };
        return body.draft.nodes.find((node) => node.id === 'join-transform');
      });
      expect(
        savedTransforms.every((node) => node?.metadata?.transformAuthoring == null),
        'no canonical JOIN authority saved after Cancel'
      ).to.equal(true);
    });
  });

  it('authors the first canonical JOIN predicate before explicit Apply', () => {
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('[data-slot="canvas-relational-composition-badge"]')
      .focus()
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[aria-label="Editar condición"]').click();
    cy.get('[aria-label="Tipo del operando derecho"]').select('literal');
    cy.get('[aria-label="Valor literal del operando derecho"]').type('1');
    cy.get(
      '[data-slot="semantic-workbench-join-izquierdo-operand"] [aria-label="Añadir función exterior al operando"]'
    )
      .find('option')
      .eq(1)
      .invoke('val')
      .then((capabilityId) => {
        cy.get(
          '[data-slot="semantic-workbench-join-izquierdo-operand"] [aria-label="Añadir función exterior al operando"]'
        ).select(String(capabilityId));
      });
    cy.get('[aria-label="Comparador de la condición"]').select('not_equal');
    cy.contains('button', 'Guardar condición').click();
    cy.get('[data-slot="semantic-workbench-join-condition-row"]')
      .should('contain.text', '!=')
      .and('contain.text', "'1'");
    cy.get('[data-slot="dvt-start-configured-inner-join"]').click();
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^(Apply|Aplicar)$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map(
          (call) =>
            call.body as {
              draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
            }
        )
        .map((body) => body.draft.nodes.find((node) => node.id === 'join-transform'))
        .filter((node) => node != null)
        .at(-1);
      const authority = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(authority?.semanticDocument)
      );
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      const condition = inspection.projection.joins[0]?.conditions[0];
      expect(condition).to.deep.include({
        operator: 'not_equal',
        right: { kind: 'literal', literal: { dataType: 'string', value: '1' } },
      });
      if (condition == null || condition.kind === 'group') return;
      expect(condition.left.kind).to.equal('function');
    });
  });

  it('authors the first JOIN from matching bigint fields', () => {
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    cy.get('[data-slot="canvas-relational-composition-badge"]')
      .focus()
      .then(() => cy.press(Cypress.Keyboard.Keys.ENTER));
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[aria-label="Editar condición"]').click();
    cy.get('[aria-label="Tipo de dato de la condición"]').should('have.value', 'i64');
    cy.contains('button', 'Guardar condición').click();
    cy.get('[data-slot="dvt-start-configured-inner-join"]').click();
    cy.contains('[data-slot="canvas-node-workbench-panel"] button', /^(Apply|Aplicar)$/).click();

    cy.wrap(null).should(() => {
      const savedTransform = getE2eApiCalls('/workspace/graph/draft', 'PUT')
        .map(
          (call) =>
            call.body as {
              draft: { nodes: Array<{ id: string; metadata?: Record<string, unknown> }> };
            }
        )
        .map((body) => body.draft.nodes.find((node) => node.id === 'join-transform'))
        .filter((node) => node != null)
        .at(-1);
      const authority = savedTransform?.metadata?.transformAuthoring as
        { semanticDocument?: unknown } | undefined;
      const inspection = inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(authority?.semanticDocument)
      );
      expect(inspection.ok).to.equal(true);
      if (!inspection.ok) return;
      const condition = inspection.projection.joins[0]?.conditions[0];
      expect(condition).not.to.equal(undefined);
      if (condition == null || condition.kind === 'group') return;
      const fieldTypeById = new Map(
        inspection.projection.inputs.flatMap((input) =>
          input.fields.map((field) => [field.fieldId, field.dataType] as const)
        )
      );
      expect(condition.left.kind).to.equal('field');
      expect(condition.right.kind).to.equal('field');
      if (condition.left.kind !== 'field' || condition.right.kind !== 'field') return;
      expect(fieldTypeById.get(condition.left.sourceFieldId)).to.equal('i64');
      expect(fieldTypeById.get(condition.right.sourceFieldId)).to.equal('i64');
    });
  });
});
