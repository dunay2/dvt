/** Prove SQL authoring through real Monaco, semantic Apply, data drawer and durable reload. */
import { WorkspaceGraphDraftSaveRequestSchema } from '@dvt/contracts';

import { getE2eApiCalls, waitForE2eApiCall } from '../../support/e2eApiStub';
import { modelSqlSource, stubModelSqlAuthoring } from '../../support/modelSqlAuthoring';
import { visitWithE2eWorkspaceSession } from '../../support/workspaceSession';

const panel = '[data-slot="canvas-model-sql"]';
const sql = modelSqlSource;

describe('Model SQL authoring', () => {
  it('explicitly validates, queries, generates and reloads a semantic Model', () => {
    const { model, prefix } = stubModelSqlAuthoring();
    cy.viewport(1200, 700);
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.get(`.react-flow__node[data-id="${model.id}"] [data-slot="canvas-node-shell"]`).dblclick(
      40,
      18
    );
    cy.get(panel).should('not.be.visible').and('have.attr', 'hidden');
    cy.get('button[aria-label="Open Model SQL"]')
      .should('have.attr', 'aria-expanded', 'false')
      .click();
    cy.get(panel).should('be.visible');
    waitForE2eApiCall(`${prefix}/sql-context`, 'GET');
    cy.get(`${panel} .monaco-editor .view-lines`).click(80, 9);
    cy.get(`${panel} .monaco-editor textarea.inputarea`).should('be.focused');
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Input.insertText',
        params: { text: sql },
      })
    );
    cy.then(() => {
      expect(getE2eApiCalls(`${prefix}/sql-compilation`, 'POST')).to.have.length(0);
      expect(getE2eApiCalls(`${prefix}/data-sample`, 'POST')).to.have.length(0);
    });
    cy.get('[data-slot="canvas-model-tab-close"]').click();
    cy.get('[role="alertdialog"]').should('be.visible');
    cy.contains('[role="alertdialog"] button', 'Keep editing').click();
    cy.get(panel)
      .should('be.visible')
      .find('.view-lines')
      .should(($lines) => {
        expect($lines.text().replaceAll('\u00a0', ' ').trim()).to.equal(sql);
      });
    cy.contains(`${panel} button`, 'Validate').should('be.enabled').click();
    waitForE2eApiCall(`${prefix}/sql-compilation`, 'POST');
    let writesBefore = 0;
    cy.then(() => {
      writesBefore = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get(`${panel} .monaco-editor .view-lines`).click(80, 9);
    cy.get(`${panel} .monaco-editor textarea.inputarea`).should('be.focused');
    for (const type of ['keyDown', 'keyUp'])
      cy.then(() =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchKeyEvent',
          params: {
            type,
            key: 'Enter',
            code: 'Enter',
            windowsVirtualKeyCode: 13,
            nativeVirtualKeyCode: 13,
            modifiers: 2,
          },
        })
      );
    waitForE2eApiCall(`${prefix}/data-sample`, 'POST');
    cy.contains('[data-slot="canvas-model-data"]', 'SQL_ROW_3944').should('be.visible');
    cy.get(panel).should('be.visible');
    cy.get('button[aria-label="Collapse SQL panel"]').last().click();
    cy.get(panel).should('not.be.visible').and('have.attr', 'hidden');
    cy.contains('[data-slot="canvas-model-data"]', 'SQL_ROW_3944').should('be.visible');
    cy.get('button[aria-label="Open Model SQL"]').click();
    cy.get(panel)
      .should('be.visible')
      .find('.view-lines')
      .should(($lines) => {
        expect($lines.text().replaceAll('\u00a0', ' ').trim()).to.equal(sql);
      });
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBefore)
    );
    cy.get('[data-slot="canvas-model-data"]').should(($panel) => {
      const toolbar = $panel.find('[data-slot="data-grid-toolbar"]')[0]!.getBoundingClientRect();
      const frame = $panel
        .find('[data-slot="bottom-operational-data-table-frame"]')[0]!
        .getBoundingClientRect();
      expect(frame.top - $panel[0]!.getBoundingClientRect().top).to.be.at.most(toolbar.height * 2);
    });
    cy.screenshot('gh3944-model-sql-data', { capture: 'fullPage' });
    cy.contains(`${panel} button`, 'Generate Model').should('be.enabled').click();
    cy.wrap(null).should(() => {
      const saves = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(saves.length).to.be.greaterThan(writesBefore);
      const saved = WorkspaceGraphDraftSaveRequestSchema.parse(saves.at(-1)!.body).draft;
      const authority = saved.nodes.find((node) => node.id === model.id)!.metadata!
        .transformAuthoring;
      expect(authority).to.have.property('semanticDocument');
    });
    cy.get('[data-slot="canvas-relational-tree-output"]').should('be.visible');
    cy.get('[data-slot="canvas-model-save-status"]').should('have.text', 'Synced');
    cy.then(() =>
      cy.writeFile(
        '../../.dvt/evidence/gh3944/saved-browser-draft.json',
        WorkspaceGraphDraftSaveRequestSchema.parse(
          getE2eApiCalls('/workspace/graph/draft', 'PUT').at(-1)!.body
        ).draft
      )
    );
    cy.get('button[aria-label="Collapse SQL panel"]').last().click();
    cy.get('button[aria-label="Open Model SQL"]').should('have.attr', 'aria-expanded', 'false');
    cy.get('[data-slot="canvas-relational-tree-output-open"]').should('be.visible').click();
    let writesOnClose = 0;
    cy.then(() => {
      writesOnClose = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get(
      '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-relational-edit"]'
    ).click();
    cy.get('[data-slot="canvas-model-output-inspector"] [data-slot="relation-output-field"] input')
      .first()
      .clear()
      .type('unapplied_country');
    cy.get(
      '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-operation-sql-tab"]'
    ).should('be.disabled');
    cy.get(
      '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-relational-collapse"]'
    ).click();
    cy.get('[data-slot="canvas-model-output-inspector"]').should('not.exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesOnClose)
    );
    cy.get('[data-slot="canvas-relational-tree-output-open"]').click();
    cy.get(
      '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-operation-sql-tab"]'
    ).should('be.enabled');
    cy.get(
      '[data-slot="canvas-model-output-inspector"] [data-slot="canvas-operation-sql-tab"]'
    ).click();
    cy.get('[data-slot="canvas-model-sql-output"]').within(() => {
      cy.get('button').should('have.length', 1);
      cy.get('[data-slot="canvas-model-sql-generate"]').should('not.exist');
      cy.get('.monaco-editor').should('not.exist');
    });
    cy.get('[data-slot="canvas-model-sql-edit"]')
      .should('be.visible')
      .and('have.attr', 'aria-expanded', 'false');
    cy.screenshot('gh3944-model-sql-single-entry', { capture: 'fullPage' });
    let compilationCount = 0,
      executionCount = 0,
      saveCount = 0;
    cy.then(() => {
      compilationCount = getE2eApiCalls(`${prefix}/sql-compilation`, 'POST').length;
      executionCount = getE2eApiCalls(`${prefix}/data-sample`, 'POST').length;
      saveCount = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
    cy.get('[data-slot="canvas-model-sql-edit"]').click();
    cy.get(panel)
      .should('be.visible')
      .find('.view-lines')
      .should(($lines) => {
        expect($lines.text().replaceAll('\u00a0', ' ').trim()).to.equal(sql);
      });
    cy.get('[data-slot="canvas-model-sql-edit"]').should('have.attr', 'aria-expanded', 'true');
    cy.then(() => {
      expect(getE2eApiCalls(`${prefix}/sql-compilation`, 'POST')).to.have.length(compilationCount);
      expect(getE2eApiCalls(`${prefix}/data-sample`, 'POST')).to.have.length(executionCount);
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(saveCount);
    });
    cy.get('button[aria-label="Collapse SQL panel"]').last().click();
    let readsBefore = 0;
    cy.then(() => {
      readsBefore = getE2eApiCalls('/workspace/graph/draft', 'GET').length;
    });
    visitWithE2eWorkspaceSession('/canvas', {
      onBeforeLoad(window) {
        window.localStorage.setItem(
          'dvt-web-application-language',
          JSON.stringify({ state: { language: 'en' }, version: 0 })
        );
      },
    });
    cy.wrap(null).should(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'GET').length).to.be.greaterThan(readsBefore)
    );
    cy.get(`.react-flow__node[data-id="${model.id}"] [data-slot="canvas-node-shell"]`).dblclick(
      40,
      18
    );
    cy.get('[data-slot="canvas-relational-tree-output-open"]').should('be.visible').click();
    cy.get('[data-slot="canvas-model-output-inspector"]')
      .should('be.visible')
      .find('[data-slot="canvas-operation-output-tab"]')
      .click();
    cy.get('[data-slot="canvas-model-output-inspector"]').should('contain.text', 'country');
  });
});
