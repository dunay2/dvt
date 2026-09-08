const CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE = 'data-canvas-node-control';
const CANVAS_CONTEXT_MENU_OWNER_ATTRIBUTE = 'data-canvas-context-menu-owner';

export const canvasNodeEmbeddedControlProps: Readonly<
  Record<typeof CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE, ''>
> = {
  [CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE]: '',
};

export const canvasColumnContextMenuOwnerProps: Readonly<
  Record<typeof CANVAS_CONTEXT_MENU_OWNER_ATTRIBUTE, 'column'>
> = {
  [CANVAS_CONTEXT_MENU_OWNER_ATTRIBUTE]: 'column',
};

const CANVAS_NODE_EMBEDDED_CONTROL_SELECTOR = `[${CANVAS_NODE_EMBEDDED_CONTROL_ATTRIBUTE}]`;
const CANVAS_COLUMN_CONTEXT_MENU_OWNER_SELECTOR = `[${CANVAS_CONTEXT_MENU_OWNER_ATTRIBUTE}="column"]`;

export function isCanvasNodeEmbeddedControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CANVAS_NODE_EMBEDDED_CONTROL_SELECTOR) != null;
}

export function isCanvasColumnContextMenuTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(CANVAS_COLUMN_CONTEXT_MENU_OWNER_SELECTOR) != null
  );
}
