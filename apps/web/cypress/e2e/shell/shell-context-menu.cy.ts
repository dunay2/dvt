/**
 * Owned concern: preserve selected-text and native fallback ownership in the real Shell.
 * @decision Reuse the production header and Canvas menus with existing scoped transport helpers.
 * @consequence Clipboard spying proves delegation, not operating-system clipboard acceptance.
 */
import { resolveCanvasViewCopy } from '../../../src/app/views/canvas/copy';
import { stubStatefulCanvasDraftAuthoring } from '../../support/canvasDraftAuthoring';
import { openCanvasContextMenuAt } from '../../support/canvasExecutionSelection';
import { getE2eApiCalls, stubE2eJsonApi, waitForE2eApiCall } from '../../support/e2eApiStub';
import { visitWorkbenchCanvas } from '../../support/relationalWorkbench/navigation';
import { E2E_PROJECT_WORKSPACE, stubShellBootstrapApis } from '../../support/workspaceSession';

const TRIGGER = '[data-slot="shell-menu-trigger"]';
const SELECTION_MENU = '[data-slot="shell-text-selection-menu"]';

describe('scoped Shell context menus', () => {
  let graphWrites = 0;
  beforeEach(() => {
    stubShellBootstrapApis({
      scopes: ['workspace:files:view', 'workspace:graph-draft:view', 'workspace:graph-draft:save'],
    });
    stubE2eJsonApi('GET', '/capabilities', {
      apiVersion: '1.0.0',
      minFrontendVersion: '0.0.1',
      plugins: { dvt: { available: true } },
    });
    stubE2eJsonApi('GET', '/workspace/context', {
      defaultWorkspace: E2E_PROJECT_WORKSPACE,
      availableWorkspaces: [E2E_PROJECT_WORKSPACE],
    });
    stubE2eJsonApi('GET', '/workspace/files', []);
    stubE2eJsonApi('GET', '/workspace/warehouse/connections', []);
    stubStatefulCanvasDraftAuthoring({ emptyCanvas: true, canvasKind: 'transformation' });
    visitWorkbenchCanvas('en');
    waitForE2eApiCall('/workspace/graph/draft', 'PUT');
    cy.get('[data-slot="canvas-draft-save-status"]')
      .should('be.visible')
      .and(($status) => {
        const copy = resolveCanvasViewCopy('en');
        expect([copy.draftSavedLabel, copy.draftSyncedLabel]).to.include($status.text());
      });
    cy.then(() => {
      graphWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    });
  });

  it('copies actual header selection and exposes valid dictionary links without navigating', () => {
    let term = '';
    cy.window().then((window) => {
      cy.stub(window.navigator.clipboard, 'writeText').resolves().as('copySelectedText');
    });
    cy.get(TRIGGER)
      .should('be.visible')
      .focus()
      .then(($button) => {
        const button = $button[0];
        if (button == null) throw new Error('The production Shell menu trigger must exist.');
        const document = button.ownerDocument;
        const view = document.defaultView;
        if (view == null)
          throw new Error('The Shell trigger must belong to the application window.');
        const walker = document.createTreeWalker(button, view.NodeFilter.SHOW_TEXT);
        let text = walker.nextNode();
        while (text != null && !text.textContent?.trim()) text = walker.nextNode();
        const word = /[\p{L}\p{M}]+/u.exec(text?.textContent ?? '');
        const selection = document.getSelection();
        if (text == null || word == null || selection == null)
          throw new Error('The real Shell trigger must contain selectable text.');
        term = word[0];
        const range = document.createRange();
        range.setStart(text, word.index);
        range.setEnd(text, word.index + term.length);
        selection.removeAllRanges();
        selection.addRange(range);
        expect(selection.toString()).to.equal(term);
      });
    cy.get(SELECTION_MENU).should('not.exist');
    cy.get(TRIGGER).rightclick();
    cy.get(SELECTION_MENU)
      .should('be.visible')
      .within(() => {
        cy.contains('[role="menuitem"]', /^Copy$/)
          .should('be.focused')
          .click();
        cy.get('[role="status"]').should('contain.text', 'Copied');
        cy.get('a').should(($links) => {
          expect($links).to.have.length(2);
          expect($links.eq(0).attr('href')).to.equal(
            `https://dle.rae.es/${encodeURIComponent(term)}`
          );
          expect($links.eq(1).attr('href')).to.equal(
            `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(term)}`
          );
          for (const link of $links.toArray())
            expect(link.getAttribute('rel')).to.equal('noopener noreferrer');
        });
      });
    cy.get('@copySelectedText').should((clipboard) => {
      expect(clipboard).to.have.been.calledOnceWithExactly(term);
    });
    cy.get(SELECTION_MENU).screenshot('shell-context-menu--selected-text');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(graphWrites)
    );
  });

  it('cancels the native fallback after selection is cleared and retains the local Canvas menu', () => {
    let nativeCancelled: boolean | undefined;
    cy.document().then((document) => {
      document.getSelection()?.removeAllRanges();
      // Observe after React bubble handling; this listener never cancels the event.
      document.addEventListener(
        'contextmenu',
        (event) => {
          nativeCancelled = event.defaultPrevented;
        },
        { once: true }
      );
    });
    cy.get(TRIGGER).rightclick();
    cy.then(() =>
      expect(nativeCancelled, 'the production boundary cancels native fallback').to.equal(true)
    );
    cy.get(SELECTION_MENU).should('not.exist');
    openCanvasContextMenuAt(180, 160);
    cy.get('[data-slot="canvas-context-menu"]').should('have.length', 1).and('be.visible');
    cy.contains('[data-slot="canvas-context-menu"] [role="menuitem"]', /^Add\.\.\.$/).should(
      'be.visible'
    );
    cy.get(SELECTION_MENU).should('not.exist');
    cy.then(() =>
      expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(graphWrites)
    );
  });
});
