/** Owned concern: drive public Canvas graph authoring through visible node controls. */
type DragPoint = Readonly<{ x: number; y: number }>;

function buildMouseDragEvent(
  point: DragPoint,
  buttons: number,
  view: Cypress.AUTWindow
): MouseEventInit {
  return {
    bubbles: true,
    button: 0,
    buttons,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    screenX: point.x,
    screenY: point.y,
    view,
  };
}

function dispatchMouseDragEvent(
  target: EventTarget,
  view: Cypress.AUTWindow,
  type: 'mousedown' | 'mousemove' | 'mouseup',
  point: DragPoint,
  buttons: number
): void {
  target.dispatchEvent(new view.MouseEvent(type, buildMouseDragEvent(point, buttons, view)));
}

function readHandleCenter(handle: HTMLElement): DragPoint {
  const rect = handle.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function getVisibleCanvasNodeByCardTitle(
  nodeName: string
): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy
    .get('[data-slot="graph-node-card-title"]', { timeout: 20_000 })
    .filter((_, element) => {
      const text = element.textContent ?? '';
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return (
        text.includes(nodeName) &&
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    })
    .should('have.length.greaterThan', 0)
    .first()
    .closest('.react-flow__node')
    .should('be.visible');
}

function findNodePort(
  nodeName: string,
  port: 'source' | 'target'
): Cypress.Chainable<JQuery<HTMLElement>> {
  return getVisibleCanvasNodeByCardTitle(nodeName)
    .find(`[data-slot="canvas-node-port-handle"][data-port="${port}"]`)
    .should('be.visible');
}

export function connectCanvasNodes(sourceName: string, targetName: string): void {
  findNodePort(sourceName, 'source').then(($sourceHandle) => {
    findNodePort(targetName, 'target').then(($targetHandle) => {
      const sourcePoint = readHandleCenter($sourceHandle[0]!);
      const targetPoint = readHandleCenter($targetHandle[0]!);
      const middlePoint = {
        x: (sourcePoint.x + targetPoint.x) / 2,
        y: (sourcePoint.y + targetPoint.y) / 2,
      };

      cy.window().then((window) => {
        dispatchMouseDragEvent($sourceHandle[0]!, window, 'mousedown', sourcePoint, 1);
        dispatchMouseDragEvent(window.document, window, 'mousemove', middlePoint, 1);
        dispatchMouseDragEvent(window.document, window, 'mousemove', targetPoint, 1);
        dispatchMouseDragEvent(window.document, window, 'mouseup', targetPoint, 0);
      });
    });
  });
}

export function openNodeWorkbenchSection(sectionId: string): void {
  cy.get('[data-slot="canvas-node-workbench-tabs-list"]').scrollIntoView().should('be.visible');
  cy.get('body').then(($body) => {
    const directTab = $body.find(`[data-slot="canvas-node-workbench-tab-${sectionId}"]:visible`);

    if (directTab.length > 0) {
      cy.wrap(directTab.first()).click();
      return;
    }

    cy.get('[data-slot="canvas-node-workbench-more-trigger"]').should('be.visible').click();
    cy.get(`[data-slot="canvas-node-workbench-more-item-${sectionId}"]`)
      .should('be.visible')
      .click();
  });
}
