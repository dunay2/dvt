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

export function moveWorkbenchCard(
  selector: string,
  dx: number,
  dy: number,
  observe?: (element: HTMLElement, dx: number, dy: number) => void,
  beforeRelease?: () => void
): void {
  cy.get(selector)
    .should('be.visible')
    .then(($card) => {
      const { x, y, scale } = browserPoint($card[0]);
      const events = [
        { type: 'mouseMoved', x, y, buttons: 0 },
        { type: 'mousePressed', x, y, buttons: 1, button: 'left', clickCount: 1 },
        ...Array.from({ length: observe == null ? 1 : 10 }, (_, index) => {
          const fraction = (index + 1) / (observe == null ? 1 : 10);
          return {
            type: 'mouseMoved',
            x: x + dx * fraction * scale,
            y: y + dy * fraction * scale,
            buttons: 1,
            button: 'left',
          };
        }),
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
        if (params.type === 'mouseReleased') beforeRelease?.();
        cy.then(
          () =>
            Cypress.automation('remote:debugger:protocol', {
              command: 'Input.dispatchMouseEvent',
              params,
            }) as Promise<unknown>
        );
        if (params.type === 'mouseMoved' && params.buttons === 1 && observe != null) {
          cy.get(selector).should(($held) =>
            observe($held[0], (params.x - x) / scale, (params.y - y) / scale)
          );
        }
      });
    });
}

/** Native HTML drag: capture the real writer, never synthesize a field reference. */
export function dragWorkbenchField(
  sourceSelector: string,
  targetSelector: string,
  targetOffset?: Readonly<{ x: number; y: number }>
): void {
  cy.get(sourceSelector)
    .should('be.visible')
    .then(($source) => {
      const source = $source[0]!;
      const window = source.ownerDocument.defaultView! as Cypress.AUTWindow;
      const writer = cy.spy(window.DataTransfer.prototype, 'setData');
      cy.get(targetSelector)
        .should('be.visible')
        .then(($target) => {
          const from = browserPoint(source);
          const to = browserPoint($target[0]!);
          const bounds = $target[0]!.getBoundingClientRect();
          const x =
            to.x + (targetOffset == null ? 0 : (targetOffset.x - bounds.width / 2) * to.scale);
          const y =
            to.y + (targetOffset == null ? 0 : (targetOffset.y - bounds.height / 2) * to.scale);
          cy.then({ timeout: 15_000 }, async () => {
            const protocol = (command: string, params = {}): Promise<unknown> =>
              Cypress.automation('remote:debugger:protocol', {
                command,
                params,
              }) as Promise<unknown>;
            await protocol('Input.setInterceptDrags', { enabled: true });
            try {
              await protocol('Input.dispatchMouseEvent', {
                type: 'mouseMoved',
                x: from.x,
                y: from.y,
                buttons: 0,
              });
              await protocol('Input.dispatchMouseEvent', {
                type: 'mousePressed',
                x: from.x,
                y: from.y,
                buttons: 1,
                button: 'left',
                clickCount: 1,
              });
              await protocol('Input.dispatchMouseEvent', {
                type: 'mouseMoved',
                x: from.x + 10,
                y: from.y + 10,
                buttons: 1,
                button: 'left',
              });
              await protocol('Input.dispatchMouseEvent', {
                type: 'mouseMoved',
                x,
                y,
                buttons: 1,
                button: 'left',
              });
              expect(source.isConnected, 'field token identity during native drag').to.equal(true);
              expect(writer.callCount, 'production dragstart writes its payload').to.be.greaterThan(
                0
              );
              const transfer = writer.firstCall.thisValue as DataTransfer;
              expect(transfer.effectAllowed, 'production field drag effect').to.be.oneOf([
                'copy',
                'copyMove',
              ]);
              const items = writer
                .getCalls()
                .map((call) => ({ mimeType: call.args[0], data: call.args[1] }));
              const dragOperationsMask = transfer.effectAllowed === 'copyMove' ? 17 : 1;
              for (const type of ['dragEnter', 'dragOver', 'drop']) {
                await protocol('Input.dispatchDragEvent', {
                  type,
                  x,
                  y,
                  data: { items, dragOperationsMask },
                });
              }
            } finally {
              writer.restore();
              await protocol('Input.cancelDragging');
              await protocol('Input.dispatchMouseEvent', {
                type: 'mouseReleased',
                x,
                y,
                buttons: 0,
                button: 'left',
                clickCount: 1,
              });
              await protocol('Input.setInterceptDrags', { enabled: false });
            }
          });
        });
    });
}
