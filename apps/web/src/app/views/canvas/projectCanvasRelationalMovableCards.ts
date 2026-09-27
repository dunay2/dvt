/** Project graph geometry into the shared draggable-card coordinate contract. */
import {
  CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
  type CanvasRelationalTreeLayout,
} from './canvasRelationalTreeGeometry';

export function projectCanvasRelationalMovableCards(layout: CanvasRelationalTreeLayout) {
  return [
    ...layout.nodes.map((placed) => ({
      id: placed.node.relationId ?? placed.node.locator,
      x: placed.x,
      y: placed.y,
    })),
    ...(layout.output == null
      ? []
      : [
          {
            id: CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
            x: layout.output.x,
            y: layout.output.y,
          },
        ]),
  ];
}
