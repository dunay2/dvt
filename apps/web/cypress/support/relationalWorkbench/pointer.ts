/** Native pointer gestures for Workbench cards and its viewport background. */
import {
  browserPoint,
  moveBrowserPointer,
  pressBrowserPointer,
  releaseBrowserPointer,
  type BrowserPoint,
  type Point,
} from './browserPointer';
import { dragWorkbenchField } from './nativeWorkbenchFieldDrag';

export { dragWorkbenchField };

type ViewportFraction = Readonly<Partial<Point>>;
type ObserveCardMovement = (element: HTMLElement, dx: number, dy: number) => void;
type WorkbenchDragHooks = [
  observe?: ObserveCardMovement,
  beforeRelease?: () => void,
  at?: ViewportFraction,
];

export function hoverWorkbenchCard(selector: string, verticalFraction = 0.5): void {
  cy.get(selector).then(($card) =>
    moveBrowserPointer(browserPoint($card[0], { y: verticalFraction }))
  );
}

function observeCardMovement(selector: string, observe: ObserveCardMovement, delta: Point): void {
  cy.get(selector).should(($held) => {
    const held = $held[0];
    if (held === undefined) throw new Error('Expected the held workbench card.');
    observe(held, delta.x, delta.y);
  });
}

function queueHeldMovement(
  selector: string,
  start: BrowserPoint,
  distance: Point,
  observe: ObserveCardMovement | undefined
): void {
  const { scale } = start;
  for (let step = 1; step <= 10; step += 1) {
    const fraction = step / 10;
    const position = {
      x: start.x + distance.x * fraction * scale,
      y: start.y + distance.y * fraction * scale,
    };
    cy.then(() => moveBrowserPointer(position, 1));
    if (observe != null) {
      observeCardMovement(selector, observe, {
        x: (position.x - start.x) / scale,
        y: (position.y - start.y) / scale,
      });
    }
  }
}

export function moveWorkbenchCard(
  selector: string,
  dx: number,
  dy: number,
  ...[observe, beforeRelease, at]: WorkbenchDragHooks
): void {
  cy.get(selector)
    .should('be.visible')
    .then(($card) => {
      const start = browserPoint($card[0], at);
      const { scale } = start;
      cy.then(() => moveBrowserPointer(start));
      cy.then(() => pressBrowserPointer(start));
      queueHeldMovement(selector, start, { x: dx, y: dy }, observe);
      beforeRelease?.();
      cy.then(() => releaseBrowserPointer({ x: start.x + dx * scale, y: start.y + dy * scale }));
    });
}

function findBackgroundX(
  doc: Document,
  bounds: DOMRect,
  background: ReadonlySet<Element | null>,
  y: number
): number | undefined {
  for (let x = 8; x < bounds.width; x += 24) {
    const hit = doc.elementFromPoint(bounds.left + x, bounds.top + y);
    if (hit !== null && background.has(hit)) return x;
  }
  return undefined;
}

function findBackgroundPoint(surface: HTMLElement): Point {
  const bounds = surface.getBoundingClientRect();
  const background = new Set([
    surface,
    surface.firstElementChild,
    surface.querySelector('[data-slot="canvas-relational-tree-layout"]'),
  ]);
  for (let y = 8; y < bounds.height; y += 24) {
    const x = findBackgroundX(surface.ownerDocument, bounds, background, y);
    if (x !== undefined) return { x: x / bounds.width, y: y / bounds.height };
  }
  throw new Error('Expected visible Canvas background for a native pan.');
}

/** Locate visible background before using the same native drag driver as cards. */
export function panWorkbenchViewport(
  selector: string,
  dx: number,
  dy: number,
  beforeRelease?: () => void
): void {
  cy.get(selector).then(($surface) => {
    const at = findBackgroundPoint($surface[0]!);
    moveWorkbenchCard(selector, dx, dy, undefined, beforeRelease, at);
  });
}
