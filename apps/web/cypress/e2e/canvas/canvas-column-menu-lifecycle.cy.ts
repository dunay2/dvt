/** Proves menu-to-composer interaction and canonical saves through the stateful draft transport. */
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjection,
} from '../../../src/app/views/canvas/canvasDvtSubstraitProjection';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const composer = '[data-slot="graph-node-expression-composer"]';
const model = '.react-flow__node[data-id="model-orders"]';
const draftPath = '/workspace/graph/draft';

function visitCanvas(): void {
  visitWithE2eWorkspaceSession('/canvas', {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
  cy.get('#app-loading-screen').should('not.exist');
  cy.get(model).should('be.visible');
}

function savedOutputs(): DvtSubstraitProjection['outputs'] {
  const save = getE2eApiCalls(draftPath, 'PUT').at(-1)?.body as
    | {
        draft: {
          nodes: Array<{
            id: string;
            metadata?: {
              transformAuthoring?: { semanticDocument?: unknown };
            };
          }>;
        };
      }
    | undefined;
  const document = save?.draft.nodes.find((node) => node.id === 'model-orders')?.metadata
    ?.transformAuthoring?.semanticDocument;
  const inspection = inspectDvtSubstraitProjectionDraft(
    decodeDvtSubstraitProjectionDocument(document)
  );
  if (!inspection.ok) throw new Error('Expected a saved canonical projection');
  return inspection.projection.outputs;
}

function applyExpression(alias: string): void {
  cy.get(`${composer} [data-slot="graph-node-column-function-alias-input"]`).type(alias);
  cy.get(`${composer} button[type="submit"]`).click();
  cy.get(composer).should('not.exist');
  cy.wrap(null).should(() => expect(savedOutputs().map((output) => output.name)).to.include(alias));
}

describe('Column menu to expression composer lifecycle', () => {
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
    stubStatefulCanvasDraftAuthoring({ canvasKind: 'transformation', columnMapping: true });
    cy.viewport(1440, 1000);
    visitCanvas();
    cy.get(model).find('[data-slot="graph-node-column-toggle"]').click();
    cy.get(model).contains('button', 'Map compatible columns').click();
    waitForE2eApiCall(draftPath, 'PUT');
    cy.wrap(null).should(() =>
      expect(savedOutputs().map((output) => output.name)).to.include('customer')
    );
  });

  for (const gesture of ['pointer', 'keyboard'] as const) {
    it(`keeps TRIM, literal and CONCAT editing usable through ${gesture}, then reloads`, () => {
      let originals: ReturnType<typeof savedOutputs>;
      cy.then(() => {
        originals = savedOutputs();
      });
      const openFunction = (name: string): void => {
        const field = cy.get(`${model} [data-column-name="customer"]`);
        if (gesture === 'pointer') field.rightclick();
        else field.focus().trigger('keydown', { key: 'F10', shiftKey: true });
        cy.contains('[data-slot="graph-node-column-function"]', new RegExp(`^${name}$`)).click();
        cy.get(composer).should('be.visible');
      };

      openFunction('TRIM');
      applyExpression('customer_clean');
      cy.get(model).find('[data-slot="graph-node-calculated-column-trigger"]').click();
      cy.get('[data-slot="graph-node-calculated-column-form"]').within(() => {
        cy.get('select[name="kind"]').select('string-literal');
        cy.get('input[name="alias"]').type('suffix');
        cy.get('input[name="value"]').type('!');
        cy.get('button[type="submit"]').click();
      });
      cy.wrap(null).should(() =>
        expect(savedOutputs().map((output) => output.name)).to.include('suffix')
      );

      openFunction('CONCAT');
      // Native select/click actionability must succeed; no force or global style repair.
      cy.get(`${composer} select[aria-label="Operand 1"]`).select('customer_clean');
      cy.get(`${composer} select[aria-label="Operand 2"]`).select('suffix');
      let savesBeforeCancel = 0;
      cy.then(() => {
        savesBeforeCancel = getE2eApiCalls(draftPath, 'PUT').length;
      });
      cy.contains(`${composer} button`, 'Cancel').click();
      cy.get(composer).should('not.exist');
      cy.then(() => expect(getE2eApiCalls(draftPath, 'PUT')).to.have.length(savesBeforeCancel));

      openFunction('CONCAT');
      cy.get(`${composer} select[aria-label="Operand 1"]`).select('customer_clean');
      cy.get(`${composer} select[aria-label="Operand 2"]`).select('status');
      applyExpression('customer_display');
      cy.wrap(null).should(() => {
        const outputs = savedOutputs();
        expect(outputs.slice(0, originals.length)).to.deep.equal(originals);
        expect(outputs.filter((output) => output.name === 'customer_display')).to.have.length(1);
        expect(
          outputs.find((output) => output.name === 'customer_display')?.scalarExpression
        ).to.deep.equal({
          kind: 'scalar-function',
          functionName: 'concat',
          arguments: [
            {
              kind: 'scalar-function',
              functionName: 'trim',
              arguments: [{ kind: 'field-reference', sourceFieldName: 'customer' }],
            },
            { kind: 'field-reference', sourceFieldName: 'status' },
          ],
          nullHandling: 'ACCEPT_NULLS',
        });
      });

      cy.then(() => {
        savesBeforeCancel = getE2eApiCalls(draftPath, 'PUT').length;
      });
      openFunction('TRIM');
      cy.contains(`${composer} button`, 'Cancel').click();
      cy.get(composer).should('not.exist');
      cy.then(() => expect(getE2eApiCalls(draftPath, 'PUT')).to.have.length(savesBeforeCancel));
      visitCanvas();
      cy.get(model).find('[data-slot="graph-node-column-toggle"]').click();
      cy.get(model).contains('button', 'Show remaining columns').click();
      cy.get(`${model} [data-column-name="customer_display"]`).should('be.visible');
      cy.get(`${model} [data-column-name="customer"]`).should('be.visible');
    });
  }
});
