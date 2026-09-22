/** Owned concern: drive real browser pointer capture, including the Cypress iframe scale. */
export function moveWorkbenchCard(selector: string, dx: number, dy: number): void {
  cy.get(selector)
    .should('be.visible')
    .then(($card) => {
      const element = $card[0];
      const bounds = element.getBoundingClientRect();
      const window = element.ownerDocument.defaultView!;
      const frame = window.parent.document
        .querySelector('iframe.aut-iframe')!
        .getBoundingClientRect();
      const scale = frame.width / window.innerWidth;
      const x = frame.left + (bounds.left + bounds.width / 2) * scale;
      const y = frame.top + (bounds.top + bounds.height / 2) * scale;
      const events = [
        { type: 'mouseMoved', x, y, buttons: 0 },
        { type: 'mousePressed', x, y, buttons: 1, button: 'left', clickCount: 1 },
        { type: 'mouseMoved', x: x + dx * scale, y: y + dy * scale, buttons: 1, button: 'left' },
        {
          type: 'mouseReleased',
          x: x + dx * scale,
          y: y + dy * scale,
          buttons: 0,
          button: 'left',
          clickCount: 1,
        },
      ];
      events.forEach((params) => {
        cy.then(
          () =>
            Cypress.automation('remote:debugger:protocol', {
              command: 'Input.dispatchMouseEvent',
              params,
            }) as Promise<unknown>
        );
      });
    });
}
