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
      offset: layout.expansionFrame?.offsets.get(placed.node.relationId ?? placed.node.locator),
      expansionOrigin: layout.expansionFrame?.origins.get(
        placed.node.relationId ?? placed.node.locator
      ),
    })),
    ...(layout.output == null
      ? []
      : [
          {
            id: CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
            x: layout.output.x,
            y: layout.output.y,
            offset: layout.expansionFrame?.offsets.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID),
            expansionOrigin: layout.expansionFrame?.origins.get(
              CANVAS_RELATIONAL_OUTPUT_POSITION_ID
            ),
          },
        ]),
  ];
}
