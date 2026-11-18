/** Prove independent producer composition, cancellation and durable reload through the real UI. */
import {
  DvtTransformAuthoringAuthorityV1Schema,
  WorkspaceGraphDraftReadResponseSchema,
  WorkspaceGraphDraftSaveRequestSchema,
} from '@dvt/contracts';

import { buildProtectedDraftRecord } from '../../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../../src/app/services/workspace/workspaceGraphDraftProjection';
import { buildDraftReadOkResponse } from '../../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { projectCanonicalNodeToAuthoringNode } from '../../../src/app/views/canvas/canvasDraftAuthoring';
import { normalizeProjectCanvasDraft } from '../../../src/app/views/canvas/canvasProjectCanvasLifecycle';
import { stubCanvasDraftSave } from '../../support/canvasDraftAuthoring';
import { buildCanvasAuthoringDraft } from '../../support/canvasDrafts/buildCanvasAuthoringDraft';
import { getE2eApiCalls, stubE2eJsonApi } from '../../support/e2eApiStub';
import { pressNativeKey } from '../../support/nativeKeyboard';
import {
  revisitWorkbenchCanvas,
  visitWorkbenchCanvas,
} from '../../support/relationalWorkbench/navigation';
import { stubWorkbenchScenario } from '../../support/relationalWorkbench/scenario';
import {
  E2E_PROJECT_WORKSPACE,
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

const receiver = 'join-transform';
const row = (id: string): string =>
  `[data-slot="canvas-explorer-panel"]:visible [data-element-id="${id}"]`;
const pending = '[data-slot="canvas-model-editor"]:visible [data-pending="true"]';

function openModel(id = receiver): void {
  cy.get('[data-slot="shell-model-semantic-command"]').click();
  cy.get(row(id)).click();
  cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
}

function dragModel(id: string): void {
  cy.window().then((window) => {
    const transfer = new window.DataTransfer();
    cy.get(row(id))
      .should('have.attr', 'draggable', 'true')
      .trigger('dragstart', { dataTransfer: transfer });
    cy.get(
      '[data-slot="canvas-model-composition-target"]:visible [data-slot="canvas-relational-tree-surface"]'
    )
      .trigger('dragover', { dataTransfer: transfer })
      .trigger('drop', { dataTransfer: transfer });
    cy.get(row(id)).trigger('dragend', { dataTransfer: transfer });
  });
}

describe('Model composition inside the selected Model', () => {
  it('cancels privately, then applies an independent Model copy and reopens its own semantics', () => {
    const initial = stubWorkbenchScenario('saved-join');
    const original = initial.nodes.find((node) => node.id === receiver)!;
    const originalDocument = DvtTransformAuthoringAuthorityV1Schema.parse(
      original.metadata?.transformAuthoring
    ).semanticDocument;
    const originalIds = new Set(initial.nodes.map((node) => node.id));
    let copyId = '';
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openModel();
    dragModel(receiver);
    cy.get(pending).should('have.length', 1);
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
    cy.get('[data-slot="canvas-relational-tree-cancel"]:visible').click();
    cy.get(pending).should('not.exist');
    dragModel(receiver);
    cy.get(pending).should('have.length', 1);
    cy.screenshot('model-composition-private', { capture: 'viewport' });
    cy.get('[data-slot="canvas-relational-tree-apply"]:visible').click();
    cy.wrap(null).should(() => {
      const calls = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(calls, 'one complete composition save').to.have.length(1);
      const saved = WorkspaceGraphDraftSaveRequestSchema.parse(calls[0]!.body).draft;
      const copies = saved.nodes.filter((node) => !originalIds.has(node.id));
      expect(copies, 'the canceled copy was never published').to.have.length(1);
      const copy = copies[0]!;
      copyId = copy.id;
      expect(saved.nodeIds, 'copy is an admitted producer, not a hidden definition').to.include(
        copy.id
      );
      expect(copy.definitionId).to.equal(undefined);
      expect(copy.path).to.equal(undefined);
      expect(copy.metadata?.resultTarget).to.equal(undefined);
      const copied = DvtTransformAuthoringAuthorityV1Schema.parse(
        copy.metadata?.transformAuthoring
      ).semanticDocument;
      expect(copied.semanticPlan).to.deep.equal(originalDocument.semanticPlan);
      expect(
        copied.sidecar.relations.every(
          (binding) =>
            !originalDocument.sidecar.relations.some(
              (before) => before.relationId === binding.relationId
            )
        )
      ).to.equal(true);
      expect(
        saved.edges.some((edge) => edge.sourceId === copy.id && edge.targetId === receiver)
      ).to.equal(true);
      expect(
        saved.nodes.find((node) => node.id === receiver)?.metadata?.relationalAuthoringDraft
      ).to.have.property('sources');
    });
    cy.get('[data-slot="canvas-model-editor"]:visible').should('contain.text', original.name);
    // A fresh page must reinstall the controlled transport, rather than falling through to the live API.
    revisitWorkbenchCanvas(() =>
      visitWithE2eWorkspaceSession('/canvas', {
        onBeforeLoad(window) {
          window.localStorage.setItem(
            'dvt-web-application-language',
            JSON.stringify({ state: { language: 'en' }, version: 0 })
          );
        },
      })
    );
    cy.get('#app-loading-screen', { timeout: 20_000 }).should('not.exist');
    cy.then(() => openModel(copyId));
    cy.get('[data-slot="canvas-model-editor"]:visible [data-operator="join"]').should('exist');
    cy.get('[data-slot="canvas-model-editor"]:visible [data-operator="read"]').should(
      'have.length',
      2
    );
  });

  it('offers the same command by keyboard for a Source Model without selecting another Model', () => {
    const initial = buildCanvasAuthoringDraft({ substraitNInputJoin: true });
    const source = initial.nodes.find((node) => node.id === 'source-shipments')!;
    const context = {
      ...initial,
      edges: initial.edges.filter(
        (edge) => edge.sourceId !== source.id || edge.targetId !== receiver
      ),
    };
    const { canonicalNodes } = projectWorkspaceGraphAuthoringDraftSemanticGraph(context);
    const draft = normalizeProjectCanvasDraft({
      ...context,
      nodes: canonicalNodes.map(projectCanonicalNodeToAuthoringNode),
    });
    const response = WorkspaceGraphDraftReadResponseSchema.parse(
      buildDraftReadOkResponse(E2E_WORKSPACE_SESSION, {
        record: buildProtectedDraftRecord(E2E_WORKSPACE_SESSION, {
          draft,
          revision: 'rev-e2e-graph-ready',
        }),
      })
    );
    stubShellBootstrapApis({
      capabilities: {
        body: {
          apiVersion: '1.0.0',
          minFrontendVersion: '0.0.1',
          plugins: { dvt: { available: true } },
        },
      },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/workspace/graph/draft', response);
    stubCanvasDraftSave();
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openModel();
    cy.get(
      `[data-slot="canvas-explorer-model-row"][data-model-id="${source.id}"] button[aria-label="Add working copy: ${source.name}"]`
    )
      .filter(':visible')
      .focus();
    pressNativeKey('Enter');
    cy.get(pending).should('have.length', 1);
    cy.get('[data-slot="canvas-model-editor"]').should('be.visible');
    cy.get('[data-slot="canvas-relational-tree-cancel"]:visible').click();
    cy.get(pending).should('not.exist');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  });

  it('does not advertise or stage an already incoming physical Source', () => {
    const initial = stubWorkbenchScenario('saved-join');
    const source = initial.nodes.find((node) => node.role === 'input')!;
    cy.viewport(1280, 800);
    visitWorkbenchCanvas();
    openModel();
    cy.get(row(source.id)).should('have.attr', 'draggable', 'false');
    cy.get(
      `[data-slot="canvas-explorer-model-row"][data-model-id="${source.id}"] button[aria-label="Add working copy: ${source.name}"]`
    ).should('not.exist');
    cy.get(pending).should('not.exist');
    cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
  });
});
