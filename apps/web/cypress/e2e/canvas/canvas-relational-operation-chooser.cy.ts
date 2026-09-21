/** Owned concern: prove the pending relational-operation chooser through the real Canvas route. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import {
  decodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinDraft,
} from '../../../src/app/views/canvas/canvasDvtSubstraitJoinComposition';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function openPendingRelationalOperationChooser(): void {
  cy.get(
    '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
  ).rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', /^(Properties|Propiedades)$/).click();
  cy.get('[data-slot="canvas-node-workbench-tab-code"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]')
    .should('be.visible')
    .and('not.contain.text', 'Needs predicate');
  cy.get('[data-slot="dvt-relational-operation-chooser"]').should('not.exist');
  cy.get('[data-slot="canvas-open-semantic-editor"]')
    .invoke('text')
    .should('match', /^(Open semantic editor|Abrir editor semántico)$/);
  cy.get('[data-slot="canvas-open-semantic-editor"]').click();
  cy.get('[data-slot="canvas-node-workbench-overlay"]').should('not.exist');
  cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
  cy.get('[data-slot="canvas-relational-tree-workbench"]').should('be.visible');
  cy.contains('[data-slot="canvas-relational-tree-source"]', 'customers').click();
  cy.contains('[data-slot="canvas-relational-tree-source"]', 'orders').click();
  cy.get('[data-slot="canvas-operation-menu-trigger"]').click();
  cy.get('[role="listbox"]').should('be.visible');
}

describe('Canvas relational-operation chooser', () => {
  beforeEach(() => {
    cy.viewport(1400, 900);
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

    openPendingRelationalOperationChooser();

    cy.get('[role="listbox"]').should('be.visible');
    cy.get('[data-slot="dvt-select-operation-inner-join"]')
      .should('contain.text', 'Needs predicate')
      .and('have.attr', 'aria-disabled', 'false');
    cy.get('[role="combobox"]').type('INNER JOIN{enter}');
    cy.get('[data-slot="canvas-relational-tree-draft"] [data-operator="join"]').should(
      'have.length',
      1
    );
    cy.get('[data-slot="canvas-relational-tree-cancel"]').click();

    cy.get('[data-slot="canvas-relational-tree-block-canvas"]').should('be.visible');
    cy.get('[data-slot="dvt-relational-operation-chooser"]').should('not.exist');
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

    openPendingRelationalOperationChooser();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[data-slot="canvas-relational-node-expand"]').click();
    cy.get('[aria-label="Tipo del operando derecho"]').select('literal');
    cy.get('[aria-label="Valor literal del operando derecho"]').type('1');
    cy.get('[data-slot="semantic-workbench-join-izquierdo-operand"]')
      .contains('summary', 'Funciones')
      .click();
    cy.get(
      '[data-slot="semantic-workbench-join-izquierdo-operand"] [aria-label="Añadir función exterior al operando izquierdo"]'
    )
      .find('option')
      .eq(1)
      .invoke('val')
      .then((capabilityId) => {
        cy.get(
          '[data-slot="semantic-workbench-join-izquierdo-operand"] [aria-label="Añadir función exterior al operando izquierdo"]'
        ).select(String(capabilityId));
      });
    cy.get('[aria-label="Comparador de la condición"]').select('not_equal');
    cy.contains('button', 'Guardar condición').click();
    cy.get('[data-slot="semantic-workbench-join-condition-row"]:visible')
      .should('contain.text', '!=')
      .and('contain.text', "'1'");
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();

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
      const inspection = inspectDvtSubstraitJoinDraft(
        decodeDvtSubstraitJoinDocument(authority?.semanticDocument)
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
    cy.get('[data-slot="canvas-relational-composition-badge"]').should('not.exist');
    cy.get('[data-slot="canvas-relational-composition-junction"]').should('not.exist');
  });

  for (const scenario of [
    {
      operation: 'left-join',
      label: 'LEFT JOIN',
      joinType: JoinRel_JoinType.LEFT,
      nullExtendedInputs: [1],
    },
    {
      operation: 'right-join',
      label: 'RIGHT JOIN',
      joinType: JoinRel_JoinType.RIGHT,
      nullExtendedInputs: [0],
    },
    {
      operation: 'full-outer-join',
      label: 'FULL OUTER JOIN',
      joinType: JoinRel_JoinType.OUTER,
      nullExtendedInputs: [0, 1],
    },
  ] as const) {
    it(`authors, saves, and reloads ${scenario.label} with exact null extension`, () => {
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/workspace/graph/draft', 'GET');

      openPendingRelationalOperationChooser();
      cy.get(`[data-slot="dvt-select-operation-${scenario.operation}"]`)
        .should('contain.text', scenario.label)
        .and('have.attr', 'aria-disabled', 'false');
      cy.get('[role="combobox"]').type(`${scenario.label}{enter}`);
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();

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
        const inspection = inspectDvtSubstraitJoinDraft(
          decodeDvtSubstraitJoinDocument(authority?.semanticDocument)
        );
        expect(inspection.ok).to.equal(true);
        if (!inspection.ok) return;
        expect(inspection.projection.joinRelations[0]?.joinType).to.equal(scenario.joinType);
        for (const inputIndex of scenario.nullExtendedInputs) {
          expect(
            inspection.projection.outputs
              .filter((output) => output.source.inputIndex === inputIndex)
              .every((output) => output.nullable)
          ).to.equal(true);
        }
      });
      cy.get('[data-slot="canvas-relational-composition-badge"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-composition-junction"]').should('not.exist');

      cy.then(() => {
        const getCount = getE2eApiCalls('/workspace/graph/draft', 'GET').length;
        cy.on('window:before:load', installE2eApiFetchStub);
        cy.reload();
        cy.wrap(null, { timeout: 20_000 }).should(() => {
          expect(getE2eApiCalls('/workspace/graph/draft', 'GET')).to.have.length(getCount + 1);
        });
      });
      cy.get('[data-slot="canvas-relational-composition-badge"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-composition-junction"]').should('not.exist');
      cy.get(
        '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
      ).dblclick(40, 18);
      cy.get('[data-operator="join"]').should('contain.text', scenario.label);
    });
  }

  for (const scenario of [
    {
      operation: 'left-semi-join',
      label: 'LEFT SEMI JOIN',
      joinType: JoinRel_JoinType.LEFT_SEMI,
      retainedInputIndex: 0,
    },
    {
      operation: 'left-anti-join',
      label: 'LEFT ANTI JOIN',
      joinType: JoinRel_JoinType.LEFT_ANTI,
      retainedInputIndex: 0,
    },
    {
      operation: 'right-semi-join',
      label: 'RIGHT SEMI JOIN',
      joinType: JoinRel_JoinType.RIGHT_SEMI,
      retainedInputIndex: 1,
    },
    {
      operation: 'right-anti-join',
      label: 'RIGHT ANTI JOIN',
      joinType: JoinRel_JoinType.RIGHT_ANTI,
      retainedInputIndex: 1,
    },
  ] as const) {
    it(`authors, applies, and reloads ${scenario.label} with retained-side output`, () => {
      visitWithE2eWorkspaceSession('/canvas');
      waitForE2eApiCall('/workspace/graph/draft', 'GET');

      openPendingRelationalOperationChooser();
      cy.get(`[data-slot="dvt-select-operation-${scenario.operation}"]`)
        .should('contain.text', scenario.label)
        .and('not.be.disabled')
        .click();
      cy.get('[data-slot="canvas-relational-tree-apply"]').click();

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
        const inspection = inspectDvtSubstraitJoinDraft(
          decodeDvtSubstraitJoinDocument(authority?.semanticDocument)
        );
        expect(inspection.ok).to.equal(true);
        if (!inspection.ok) return;
        expect(inspection.projection.joinRelations[0]?.joinType).to.equal(scenario.joinType);
        expect(inspection.projection.outputs).not.to.have.length(0);
        expect(
          inspection.projection.outputs.every(
            (output) => output.source.inputIndex === scenario.retainedInputIndex
          )
        ).to.equal(true);
      });
      cy.get('[data-slot="canvas-relational-composition-badge"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-composition-junction"]').should('not.exist');

      cy.then(() => {
        const getCount = getE2eApiCalls('/workspace/graph/draft', 'GET').length;
        cy.on('window:before:load', installE2eApiFetchStub);
        cy.reload();
        cy.wrap(null, { timeout: 20_000 }).should(() => {
          expect(getE2eApiCalls('/workspace/graph/draft', 'GET')).to.have.length(getCount + 1);
        });
      });
      cy.get('[data-slot="canvas-relational-composition-badge"]').should('not.exist');
      cy.get('[data-slot="canvas-relational-composition-junction"]').should('not.exist');
      cy.get(
        '.react-flow__node[data-id="join-transform"] [data-slot="canvas-node-shell"]'
      ).dblclick(40, 18);
      cy.get('[data-operator="join"]').should('contain.text', scenario.label);
    });
  }

  it('authors the first JOIN from matching bigint fields', () => {
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');

    openPendingRelationalOperationChooser();
    cy.get('[data-slot="dvt-select-operation-inner-join"]').click();
    cy.get('[data-slot="canvas-relational-node-expand"]').click();
    cy.get('[aria-label="Tipo de dato de la condición"]').should('have.value', 'i64');
    cy.contains('button', 'Guardar condición').click();
    cy.get('[data-slot="canvas-relational-tree-apply"]').click();

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
      const inspection = inspectDvtSubstraitJoinDraft(
        decodeDvtSubstraitJoinDocument(authority?.semanticDocument)
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
