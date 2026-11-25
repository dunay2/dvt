/** Reserve anchored rectangles and place only unanchored cards without disturbing manual layout. */
type Rectangle = { width: number; height: number; x: number; y: number };

function intersects(first: Rectangle, second: Rectangle): boolean {
  return (
    first.x < second.x + second.width + 24 &&
    second.x < first.x + first.width + 24 &&
    first.y < second.y + second.height + 24 &&
    second.y < first.y + first.height + 24
  );
}

export function placeUnanchoredCanvasCards<T extends Rectangle>(
  cards: readonly T[],
  fixed: ReadonlySet<T>
): void {
  const occupied: Rectangle[] = cards.filter((card) => fixed.has(card));
  for (const card of cards) {
    if (fixed.has(card)) continue;
    let collisions = occupied.filter((other) => intersects(card, other));
    while (collisions.length > 0) {
      card.y = Math.max(...collisions.map((other) => other.y + other.height + 24));
      collisions = occupied.filter((other) => intersects(card, other));
    }
    occupied.push(card);
  }
}
