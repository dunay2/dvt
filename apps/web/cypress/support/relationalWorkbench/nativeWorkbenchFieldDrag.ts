/** Deliver the workbench field payload produced by a native HTML drag. */
import {
  browserPoint,
  browserProtocol,
  moveBrowserPointer,
  pressBrowserPointer,
  releaseBrowserPointer,
  type Point,
} from './browserPointer';

const copyDragOperationMasks: Partial<Record<DataTransfer['effectAllowed'], number>> = {
  copy: 1,
  copyLink: 3,
  copyMove: 17,
};

type DragDataWriter = ReturnType<typeof cy.spy>;
type FieldDragData = Readonly<{
  items: readonly { mimeType: string; data: string }[];
  dragOperationsMask: number | undefined;
}>;

function fieldDropPoint(target: HTMLElement, offset?: Point): Point {
  const center = browserPoint(target);
  if (offset == null) return center;
  const bounds = target.getBoundingClientRect();
  return {
    x: center.x + (offset.x - bounds.width / 2) * center.scale,
    y: center.y + (offset.y - bounds.height / 2) * center.scale,
  };
}

function capturedDragData(writer: DragDataWriter): FieldDragData {
  expect(writer.callCount, 'production dragstart writes its payload').to.be.greaterThan(0);
  const transfer = writer.firstCall.thisValue as DataTransfer;
  const dragOperationsMask = copyDragOperationMasks[transfer.effectAllowed];
  expect(dragOperationsMask, 'production drag allows copying').to.be.a('number');
  const items = writer.getCalls().map(({ args }) => ({ mimeType: args[0], data: args[1] }));
  return { items, dragOperationsMask };
}

async function dispatchFieldDrag(
  source: HTMLElement,
  from: Point,
  to: Point,
  writer: DragDataWriter
): Promise<void> {
  await browserProtocol('Input.setInterceptDrags', { enabled: true });
  try {
    await moveBrowserPointer(from);
    await pressBrowserPointer(from);
    await moveBrowserPointer({ x: from.x + 10, y: from.y + 10 }, 1);
    await moveBrowserPointer(to, 1);
    expect(source.isConnected, 'field token identity during native drag').to.equal(true);
    const data = capturedDragData(writer);
    for (const type of ['dragEnter', 'dragOver', 'drop']) {
      await browserProtocol('Input.dispatchDragEvent', { type, x: to.x, y: to.y, data });
    }
  } finally {
    writer.restore();
    await browserProtocol('Input.cancelDragging');
    await releaseBrowserPointer(to);
    await browserProtocol('Input.setInterceptDrags', { enabled: false });
  }
}

export function dragWorkbenchField(
  sourceSelector: string,
  targetSelector: string,
  targetOffset?: Point
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
          const to = fieldDropPoint($target[0]!, targetOffset);
          cy.then({ timeout: 15_000 }, () => dispatchFieldDrag(source, from, to, writer));
        });
    });
}
