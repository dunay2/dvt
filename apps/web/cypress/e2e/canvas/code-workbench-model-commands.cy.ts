/** Prove accepted compilation before model execution; keep requests, permissions and native gestures observable. */
import { PlanPreviewPersistResponseSchema } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import { makePlanRef } from '../../../src/app/testing/contractTestUtils';
import { executableContextFixture } from '../../../src/app/views/code/codeWorkspaceFileContext.test-support';
import { stubContextualCodeWorkbenchApis } from '../../support/codeWorkbench/bootstrap';
import {
  getE2eApiCalls,
  stubE2eApi,
  stubE2eJsonApi,
  waitForE2eApiCall,
} from '../../support/e2eApiStub';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

function persistedModelPlan(
  planRef: ReturnType<typeof makePlanRef>,
  provenance: unknown
): ReturnType<typeof PlanPreviewPersistResponseSchema.parse> {
  return PlanPreviewPersistResponseSchema.parse({
    previewProfile: 'planner-generic-v1',
    plan: {
      metadata: {
        planVersion: '1.0',
        schemaVersion: '1.0',
        contractVersion: '1.0.0',
        inputHashSha256: 'a'.repeat(64),
        planId: planRef.planId,
        createdAtIso: '2026-11-11T00:00:00Z',
      },
      steps: [{ stepId: 'model.demo.ventas', kind: 'DBT_MODEL', dependsOn: [] }],
    },
    planRef,
    persisted: { planRecordId: planRef.planId, canonicalPlanSha256: planRef.sha256 },
    provenance,
    validation: { valid: true, warnings: [] },
  });
}

describe('Canvas Project Code accepted compilation before model execution', () => {
  // Parse/reference inspection must never unlock materialization; only the accepted Preview does.
  it('compiles the open SQL before enabling materialization through its accepted plan', () => {
    const { file, project } = executableContextFixture();
    const planRef = makePlanRef({ planId: sha256HexUtf8('code-model-plan') });
    stubContextualCodeWorkbenchApis(
      [file],
      ['workspace:graph-draft:view', 'plan:preview', 'run:start']
    );
    stubE2eJsonApi('GET', '/workspace/dbt/graph', project);
    let acceptCompilation: (() => void) | undefined;
    stubE2eApi(
      'POST',
      '/plans/preview',
      ({ body }) =>
        new Promise((resolve) => {
          const request = body as { provenance: unknown; selection: unknown };
          expect(request.selection).to.deep.equal({
            mode: 'explicit',
            nodeIds: ['model.demo.ventas'],
          });
          acceptCompilation = () =>
            resolve({
              body: persistedModelPlan(planRef, request.provenance),
            });
        })
    );
    stubE2eJsonApi('POST', '/runs/start', { runId: 'run-code-model', accepted: true });

    visitWithE2eWorkspaceSession('/canvas');
    // Code binds to the opened file, independently of the active Canvas catalog or edit permission.
    cy.get('[data-slot="shell-project-code-command"]').click();
    const editor =
      '[data-slot="canvas-code-workspace-surface"] [data-slot="workspace-file-code-editor"]';
    const compile = `${editor} [data-slot="code-compile-model"]`;
    const execute = `${editor} [data-slot="code-execute-model"]`;
    // Start the keyboard journey only after the lazy editor is visible.
    cy.get(`${editor} .view-lines`).should(($lines) => {
      expect($lines.text().replace(/\u00a0/g, ' ')).to.contain(file.content);
    });
    cy.get(execute).should('be.visible').and('be.disabled');
    cy.get(compile).should('be.enabled').focus().should('be.focused');
    // Space uses native button activation; press(Enter) omits keypress in this Chromium adapter.
    cy.press(Cypress.Keyboard.Keys.SPACE);
    waitForE2eApiCall('/plans/preview', 'POST');
    cy.get(compile).should('be.disabled');
    cy.get(execute).should('be.disabled');
    cy.then(() => {
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
      expect(acceptCompilation).to.be.a('function');
      acceptCompilation!();
    });
    cy.get(execute).should('be.enabled');
    cy.screenshot('code-model-compiled-before-run');
    cy.get(execute).click();
    waitForE2eApiCall('/runs/start', 'POST');
    cy.get(`${editor} a[href="/runs/run-code-model"]`).should('be.visible');
    cy.then(() => {
      const starts = getE2eApiCalls('/runs/start', 'POST');
      expect(starts).to.have.length(1);
      expect(starts[0]!.body).to.have.property('planRef').that.deep.equals(planRef);
      expect(getE2eApiCalls('/workspace/dbt/analysis/selected-model', 'GET')).to.have.length(0);
      expect(getE2eApiCalls(/\/workspace\/files\/.+/, 'POST')).to.have.length(0);
    });
  });
  it('reviews effective values, cancels, and starts only the confirmed parameterized plan', () => {
    const { file, project } = executableContextFixture();
    const planRef = makePlanRef({ planId: sha256HexUtf8('confirmed-parameterized-model') });
    stubContextualCodeWorkbenchApis(
      [file],
      ['workspace:graph-draft:view', 'plan:preview', 'run:start']
    );
    stubE2eJsonApi('GET', '/workspace/dbt/graph', {
      ...project,
      nodes: project.nodes.map((node) =>
        node.name === 'ventas'
          ? {
              ...node,
              runParameters: [
                { name: 'cutoff', type: 'date', defaultValue: '2026-01-01' },
                {
                  name: 'country',
                  type: 'text',
                  choices: ['ES', 'FR'],
                  defaultValue: 'ES',
                  enabledBy: 'with_country',
                },
              ],
            }
          : node
      ),
    });
    stubE2eApi('POST', '/plans/preview', ({ body }) => {
      const request = body as { provenance: unknown; parameterOverrides: unknown };
      expect(request.parameterOverrides).to.deep.equal([
        { name: 'country', enabled: true, value: 'FR' },
      ]);
      return { body: persistedModelPlan(planRef, request.provenance) };
    });
    stubE2eJsonApi('POST', '/runs/start', { runId: 'run-with-country', accepted: true });
    visitWithE2eWorkspaceSession('/canvas');
    cy.get('[data-slot="shell-project-code-command"]').click();
    const run = '[data-slot="workspace-file-code-editor"] [data-slot="code-execute-model"]';
    const parameters = '[data-slot="code-configure-model-parameters"]';
    cy.get(run).should('be.enabled').click();
    cy.get('[role="dialog"]')
      .should('be.visible')
      .within(() => {
        cy.get('[name="cutoff"]').should('have.value', '2026-01-01');
        cy.get('[name="country"]').should('be.disabled');
        cy.contains('button', 'Cancel').click();
      });
    cy.get(run).should('be.focused');
    cy.then(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
    cy.get(parameters).click();
    cy.get('[role="dialog"] [role="switch"][aria-label$=" country"]').click();
    cy.get('select[name="country"]').select('FR');
    cy.screenshot('code-parameterized-model-review');
    cy.get('[role="dialog"] button[type="submit"]').click();
    cy.get(parameters).should('be.focused');
    cy.then(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(0);
      expect(getE2eApiCalls('/runs/start', 'POST')).to.have.length(0);
    });
    cy.get(parameters).click();
    cy.get('select[name="country"]').should('have.value', 'FR').select('ES');
    cy.get('[role="dialog"]').contains('button', 'Cancel').click();
    cy.get(run).click();
    waitForE2eApiCall('/runs/start', 'POST');
    cy.get('a[href="/runs/run-with-country"]').should('be.visible');
    cy.then(() => {
      expect(getE2eApiCalls('/plans/preview', 'POST')).to.have.length(1);
      const runs = getE2eApiCalls('/runs/start', 'POST');
      expect(runs).to.have.length(1);
      expect(runs[0]!.body).to.have.property('planRef').that.deep.equals(planRef);
    });
  });
});
