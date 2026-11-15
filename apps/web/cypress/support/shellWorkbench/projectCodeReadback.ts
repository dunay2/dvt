/**
 * Owned concern: read the focused Monaco editor through its real copy interaction.
 * @baseline GH-3920: Extract unchanged proof from the existing Shell composition spec.
 * @consequence Scenario order, fixtures and browser obligations remain owned by the spec.
 */
/** Copy through the focused editor; rendered lines contain visual wrapping indentation. */
export function readProjectCode(): Cypress.Chainable<string> {
  const editor =
    '[data-slot="canvas-code-workspace-surface"] [data-testid="monaco-code-viewer"] .monaco-editor';
  const selectAll = {
    key: 'a',
    code: 'KeyA',
    keyCode: 65,
    ctrlKey: Cypress.platform !== 'darwin',
    metaKey: Cypress.platform === 'darwin',
    bubbles: true,
    cancelable: true,
  };
  cy.get(editor).find('.view-line').first().click();
  return cy.window().then((window) => {
    const clipboardData = new window.DataTransfer();
    return cy
      .get(editor)
      .find('textarea.inputarea')
      .should('have.prop', 'readOnly', true)
      .should('be.focused')
      .then(($input) => {
        $input[0]!.dispatchEvent(new window.KeyboardEvent('keydown', selectAll));
        $input[0]!.dispatchEvent(new window.KeyboardEvent('keyup', selectAll));
        expect(window.document.activeElement).to.equal($input[0]);
        $input[0]!.dispatchEvent(
          new window.ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true })
        );
        const collapseSelection = {
          key: 'ArrowLeft',
          code: 'ArrowLeft',
          keyCode: 37,
          bubbles: true,
          cancelable: true,
        };
        $input[0]!.dispatchEvent(new window.KeyboardEvent('keydown', collapseSelection));
        $input[0]!.dispatchEvent(new window.KeyboardEvent('keyup', collapseSelection));
        return cy
          .get(editor)
          .find('.selected-text')
          .should('not.exist')
          .get(`${editor} .wordHighlightText`)
          .should('be.visible')
          .and('have.css', 'background-color', 'rgba(0, 0, 0, 0.25)')
          .and('have.css', 'border-color', 'rgb(112, 112, 112)')
          .and('have.css', 'border-top-width', '1px')
          .then(() => clipboardData.getData('text/plain'));
      });
  });
}
