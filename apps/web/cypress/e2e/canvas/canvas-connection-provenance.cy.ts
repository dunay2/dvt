/** Proves common/conflicting fan-in through the actual inspector and authoring consumers. */
import { ConnectedSourceRefSchema } from '@dvt/contracts';

import { buildProtectedDraftRecord } from '../../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';
import { buildDraftReadOkResponse } from '../../../src/app/services/workspace/workspaceGraphDraftProtocol.test.fixtures';
import { buildCanvasAuthoringDraft } from '../../support/canvasDraftAuthoring';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import {
  E2E_PROJECT_WORKSPACE,
  E2E_WORKSPACE_SESSION,
  stubShellBootstrapApis,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';

function openProperties(id: string): void {
  cy.get(`.react-flow__node[data-id="${id}"] [data-slot="canvas-node-shell"]`).rightclick();
  cy.contains('[data-slot="canvas-node-context-menu-item"]', 'Properties').click();
  cy.get('[data-slot="canvas-node-workbench-panel"]').should('be.visible');
}

describe('Canvas fan-in connection provenance', () => {
  for (const conflicting of [false, true]) {
    for (const reversed of [false, true]) {
      it(`shows only proven common authority (conflict ${conflicting}, reversed ${reversed})`, () => {
        cy.viewport(1920, 1080);
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
        const base = buildCanvasAuthoringDraft({ substraitInnerJoin: true });
        const firstSource = base.nodes.find((node) => node.id === 'source-customers')!;
        const connection = ConnectedSourceRefSchema.parse(
          firstSource.metadata?.connectedSourceRef
        ).connectionRef;
        const sink = {
          id: 'sink-proof',
          name: 'Sink proof',
          pluginId: 'dvt',
          kind: 'dvt:sink',
          role: 'output' as const,
          status: 'idle' as const,
          tags: [],
          metadata: {
            config: {
              schema: 'analytics',
              table: 'result',
              materialization: 'table',
              writeMode: 'replace',
            },
          },
        };
        const nodes = base.nodes.map((node) => {
          if (!conflicting || node.id !== 'source-orders') return node;
          const sourceRef = ConnectedSourceRefSchema.parse(node.metadata?.connectedSourceRef);
          return {
            ...node,
            metadata: {
              ...node.metadata,
              connectedSourceRef: {
                ...sourceRef,
                connectionRef: { ...connection, connectionId: 'other-warehouse' },
              },
            },
          };
        });
        nodes.push(sink);
        const edges = [
          ...base.edges,
          {
            id: 'join-sink',
            sourceId: 'join-transform',
            targetId: sink.id,
            relation: 'lineage' as const,
          },
        ];
        const draft = {
          ...base,
          nodes: reversed ? [...nodes].reverse() : nodes,
          edges: reversed ? [...edges].reverse() : edges,
          nodeIds: [...base.nodeIds, sink.id],
          nodePositions: { ...base.nodePositions, [sink.id]: { x: 1000, y: 160 } },
        };
        stubE2eJsonApi(
          'GET',
          '/workspace/graph/draft',
          buildDraftReadOkResponse(E2E_WORKSPACE_SESSION, {
            record: buildProtectedDraftRecord(E2E_WORKSPACE_SESSION, { draft }),
          })
        );
        visitWithE2eWorkspaceSession('/canvas', {
          onBeforeLoad(window) {
            window.localStorage.setItem(
              'dvt-web-application-language',
              JSON.stringify({ state: { language: 'en' }, version: 0 })
            );
          },
        });
        waitForE2eApiCall('/workspace/graph/draft', 'GET');
        openProperties('join-transform');
        cy.get('select[name="dvt-transform-result-connection"]')
          .should('have.value', '')
          .and(conflicting ? 'be.disabled' : 'be.enabled');
        cy.get('select[name="dvt-transform-result-connection"] option').should(
          'have.length',
          conflicting ? 1 : 2
        );
        cy.get('[data-slot="canvas-node-workbench-tab-inputs-outputs"]').click();
        for (const name of [
          firstSource.name,
          base.nodes.find((node) => node.id === 'source-orders')!.name,
        ]) {
          cy.contains('[data-slot="node-property-relationship-record"]', name).should(
            conflicting ? 'not.contain.text' : 'contain.text',
            `postgres · ${connection.connectionId}`
          );
        }
        cy.get('[data-slot="canvas-node-workbench-close"]').click();
        openProperties(sink.id);
        cy.get('[data-slot="canvas-node-workbench-tab-sink"]').click();
        cy.contains('Inherited connection')
          .parent()
          .find('code')
          .should('have.text', conflicting ? '-' : connection.connectionId);
        cy.then(() => expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(0));
      });
    }
  }
});
