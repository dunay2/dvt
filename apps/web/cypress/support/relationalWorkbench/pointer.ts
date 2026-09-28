/** Owned concern: drive real browser pointer capture, including the Cypress iframe scale. */
function browserPoint(
  element: HTMLElement,
  verticalFraction = 0.5
): { x: number; y: number; scale: number } {
  const bounds = element.getBoundingClientRect();
  const window = element.ownerDocument.defaultView!;
  const frame = window.parent.document.querySelector('iframe.aut-iframe')!.getBoundingClientRect();
  const scale = frame.width / window.innerWidth;
  return {
    x: frame.left + (bounds.left + bounds.width / 2) * scale,
    y: frame.top + (bounds.top + bounds.height * verticalFraction) * scale,
    scale,
  };
}

export function hoverWorkbenchCard(selector: string, verticalFraction = 0.5): void {
  cy.get(selector).then(($card) => {
    const { x, y } = browserPoint($card[0], verticalFraction);
    return Cypress.automation('remote:debugger:protocol', {
      command: 'Input.dispatchMouseEvent',
      params: { type: 'mouseMoved', x, y, buttons: 0 },
    }) as Promise<unknown>;
  });
}

export function moveWorkbenchCard(selector: string, dx: number, dy: number): void {
  cy.get(selector)
    .should('be.visible')
    .then(($card) => {
      const { x, y, scale } = browserPoint($card[0]);
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
