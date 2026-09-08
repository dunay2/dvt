const CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE = 'data-canvas-node-control';

export const canvasNodeEmbeddedControlProps: Readonly<
  Record<typeof CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE, ''>
> = {
  [CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE]: '',
};

const CANVAS_NODE_EMBEDDED_CONTROL_SELECTOR = `[${CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE}]`;

export function isCanvasNodeEmbeddedControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CANVAS_NODE_EMBEDDED_CONTROL_SELECTOR) != null;
}
