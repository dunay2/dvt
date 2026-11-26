/** Owned concern: prove selected-text keyboard actions stay separate from Canvas context. */
import { getE2eApiCalls } from './e2eApiStub';
import { pressNativeKey } from './nativeKeyboard';
function firstElementWord(
  element: HTMLElement,
  textNodes: typeof NodeFilter.SHOW_TEXT
): Readonly<{ node: Node; term: string; index: number }> {
  const document = element.ownerDocument;
  const walker = document.createTreeWalker(element, textNodes);
  let text = walker.nextNode();
  // SHOW_TEXT only returns Text nodes, whose textContent is a string.
  while (text != null && !text.textContent!.trim()) text = walker.nextNode();
  if (text == null) throw new Error('The actual element must have selectable text.');
  const word = /[\p{L}\p{M}]+/u.exec(text.textContent!);
  if (word == null) throw new Error('The actual element must have a selectable word.');
  return { node: text, term: word[0], index: word.index };
}
export function selectElementWord(element: HTMLElement): string {
  const document = element.ownerDocument;
  const view = document.defaultView;
  if (view == null) throw new Error('The selected element must belong to the application window.');
  const word = firstElementWord(element, view.NodeFilter.SHOW_TEXT);
  const selection = document.getSelection();
  if (selection == null) throw new Error('The actual element must support document selection.');
  const range = document.createRange();
  range.setStart(word.node, word.index);
  range.setEnd(word.node, word.index + word.term.length);
  selection.removeAllRanges();
  selection.addRange(range);
  return word.term;
}

export function selectCanvasTitleWord(): Cypress.Chainable<string> {
  cy.window().then((window) => {
    const clipboard = cy.stub(window.navigator.clipboard, 'writeText').as('copySelectedText');
    clipboard.resolves();
  });
  return cy
    .get('#canvas-workspace-tab')
    .focus()
    .then(($tab) => {
      const document = $tab[0]!.ownerDocument;
      const selectedTerm = selectElementWord($tab[0]!);
      expect(document.getSelection()!.toString()).to.equal(selectedTerm);
      return selectedTerm;
    });
}

export function copySelectedCanvasText(selectedTerm: string): void {
  cy.get('[data-slot="shell-text-selection-menu"]').should('not.exist');
  cy.get('#canvas-workspace-tab').rightclick();
  cy.get('[data-slot="shell-text-selection-menu"]')
    .should('be.visible')
    .within(() => {
      cy.get('[role="menuitem"]').should('have.length', 3);
      cy.contains('[role="menuitem"]', /^Copy$/).should('be.focused');
    });
  let scrollBeforeActivation = 0;
  cy.window().then((window) => {
    window.focus();
    scrollBeforeActivation = window.scrollY;
  });
  // Native defaults must neither scroll on Space nor dispatch a second Copy after keyup.
  cy.press(Cypress.Keyboard.Keys.SPACE);
  cy.get('@copySelectedText').should((clipboard) => {
    expect(clipboard).to.have.been.calledOnceWithExactly(selectedTerm);
  });
  pressNativeKey('Enter');
  cy.get('[data-slot="shell-text-selection-menu"]').within(() => {
    cy.get('[role="status"]').should('contain.text', 'Copied');
    cy.get('a')
      .first()
      .should(($link) => {
        expect($link.attr('href')).to.equal(
          `https://dle.rae.es/${encodeURIComponent(selectedTerm)}`
        );
        expect($link.attr('rel')).to.equal('noopener noreferrer');
      });
  });
  cy.get('@copySelectedText').should((clipboard) => {
    expect(clipboard).to.have.callCount(2);
    expect(clipboard).to.have.always.been.calledWithExactly(selectedTerm);
  });
  cy.window().then((window) => {
    expect(window.scrollY).to.equal(scrollBeforeActivation);
  });
  cy.get('[data-slot="shell-text-selection-menu"]').screenshot('shell-selected-text-menu');
}

export function activateCanvasDictionaryLink(
  selectedTerm: string,
  key: typeof Cypress.Keyboard.Keys.SPACE | typeof Cypress.Keyboard.Keys.ENTER
): void {
  if (key === Cypress.Keyboard.Keys.ENTER) cy.get('#canvas-workspace-tab').rightclick();
  const activations: string[] = [];
  let nativeKey: KeyboardEvent | undefined;
  cy.get<HTMLAnchorElement>('[data-slot="shell-text-selection-menu"] a')
    .first()
    .focus()
    .then(($link) => {
      const link = $link[0]!;
      link.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          activations.push(link.href);
        },
        { once: true }
      );
      link.addEventListener(
        'keydown',
        (event) => {
          nativeKey = event;
        },
        { once: true }
      );
    });
  cy.window().then((window) => {
    window.focus();
  });
  cy.press(key);
  cy.get('[data-slot="shell-text-selection-menu"]').should('not.exist');
  cy.get('#canvas-workspace-tab').should('be.focused');
  cy.then(() => {
    expect(nativeKey?.isTrusted, 'dictionary activation uses a real keyboard gesture').to.equal(
      true
    );
    expect(nativeKey?.key).to.equal(key === Cypress.Keyboard.Keys.SPACE ? ' ' : 'Enter');
    expect(activations).to.deep.equal([`https://dle.rae.es/${encodeURIComponent(selectedTerm)}`]);
  });
}

export function restoreCanvasContextAfterTextSelection(
  selectedTerm: string,
  writesBeforeSelection = 0
): void {
  cy.get('#canvas-workspace-tab').should('be.focused');
  cy.window().then((window) => {
    expect(window.getSelection()?.toString()).to.equal(selectedTerm);
    window.getSelection()?.removeAllRanges();
  });
  cy.get('[data-testid="canvas-viewport"] .react-flow__pane').rightclick(180, 160);
  cy.get('[data-slot="canvas-context-menu"]').should('have.length', 1);
  cy.get('[data-slot="shell-text-selection-menu"]').should('not.exist');
  cy.get('.react-flow__node').should('have.length', 0);
  cy.then(() =>
    expect(getE2eApiCalls('/workspace/graph/draft', 'PUT')).to.have.length(writesBeforeSelection)
  );
}
