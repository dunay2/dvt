/** Translate Cypress iframe coordinates and dispatch native Chromium pointer input. */
export type Point = Readonly<{ x: number; y: number }>;
export type BrowserPoint = Point & Readonly<{ scale: number }>;

export function browserPoint(
  element: HTMLElement | undefined,
  { x = 0.5, y = 0.5 }: Readonly<Partial<Point>> = {}
): BrowserPoint {
  if (element === undefined) throw new Error('Expected a browser pointer target.');
  const bounds = element.getBoundingClientRect();
  const window = element.ownerDocument.defaultView!;
  const frame = window.parent.document.querySelector('iframe.aut-iframe')!.getBoundingClientRect();
  const scale = frame.width / window.innerWidth;
  return {
    x: frame.left + (bounds.left + bounds.width * x) * scale,
    y: frame.top + (bounds.top + bounds.height * y) * scale,
    scale,
  };
}

export function browserProtocol(command: string, params = {}): Promise<unknown> {
  return Cypress.automation('remote:debugger:protocol', { command, params }) as Promise<unknown>;
}

export function moveBrowserPointer({ x, y }: Point, buttons: 0 | 1 = 0): Promise<unknown> {
  const button = buttons === 1 ? 'left' : undefined;
  return browserProtocol('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons, button });
}

function dispatchLeftClick(
  type: 'mousePressed' | 'mouseReleased',
  { x, y }: Point,
  buttons: 0 | 1
): Promise<unknown> {
  return browserProtocol('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    buttons,
    button: 'left',
    clickCount: 1,
  });
}

export function pressBrowserPointer(point: Point): Promise<unknown> {
  return dispatchLeftClick('mousePressed', point, 1);
}

export function releaseBrowserPointer(point: Point): Promise<unknown> {
  return dispatchLeftClick('mouseReleased', point, 0);
}
