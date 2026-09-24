/** Compare viewport facts without treating derived object allocation as a graph change. */
import type { Node } from '@xyflow/react';

export function viewportNodesEqual(left: Node[], right: Node[]): boolean {
  return orderedArraysEqual(left, right, viewportNodeEqual);
}

function orderedArraysEqual<T>(
  left: readonly T[],
  right: readonly T[],
  areEqual: (leftItem: T, rightItem: T) => boolean
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => areEqual(item, getOrderedArrayItem(right, index)));
}

function getOrderedArrayItem<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Expected ordered array item at index ${index}`);
  }
  return item;
}

function viewportNodeEqual(left: Node, right: Node): boolean {
  return (
    left.id === right.id &&
    left.draggable === right.draggable &&
    left.ariaLabel === right.ariaLabel &&
    viewportNodePositionEqual(left, right) &&
    viewportNodeDataEqual(left.data, right.data)
  );
}

function viewportNodePositionEqual(left: Node, right: Node): boolean {
  return left.position.x === right.position.x && left.position.y === right.position.y;
}

function viewportNodeDataEqual(left: Node['data'], right: Node['data']): boolean {
  let metadataEqual = left.metadata === right.metadata;
  if (!metadataEqual) {
    try {
      metadataEqual =
        JSON.stringify(left.metadata ?? null) === JSON.stringify(right.metadata ?? null);
    } catch {
      metadataEqual = false;
    }
  }
  const leftTags = Array.isArray(left.tags) ? left.tags : [];
  const rightTags = Array.isArray(right.tags) ? right.tags : [];
  const tagsEqual =
    leftTags.length === rightTags.length &&
    leftTags.every((tag, index) => tag === rightTags[index]);
  let portCompatibilityEqual = left.portCompatibility === right.portCompatibility;
  if (!portCompatibilityEqual) {
    try {
      portCompatibilityEqual =
        JSON.stringify(left.portCompatibility ?? null) ===
        JSON.stringify(right.portCompatibility ?? null);
    } catch {
      portCompatibilityEqual = false;
    }
  }
  let presentationTruthEqual = left.presentationTruth === right.presentationTruth;
  if (!presentationTruthEqual) {
    try {
      presentationTruthEqual =
        JSON.stringify(left.presentationTruth ?? null) ===
        JSON.stringify(right.presentationTruth ?? null);
    } catch {
      presentationTruthEqual = false;
    }
  }
  const localizedPresentationEqual =
    JSON.stringify({
      contextMenuCopy: left.contextMenuCopy,
      executionSelectionCopy: left.executionSelectionCopy,
      portLabels: left.portLabels,
      presentationCopy: left.presentationCopy,
    }) ===
    JSON.stringify({
      contextMenuCopy: right.contextMenuCopy,
      executionSelectionCopy: right.executionSelectionCopy,
      portLabels: right.portLabels,
      presentationCopy: right.presentationCopy,
    });

  return (
    left.showColumns === right.showColumns &&
    left.columnDisclosureExpanded === right.columnDisclosureExpanded &&
    left.name === right.name &&
    left.description === right.description &&
    left.path === right.path &&
    left.status === right.status &&
    tagsEqual &&
    portCompatibilityEqual &&
    presentationTruthEqual &&
    localizedPresentationEqual &&
    metadataEqual
  );
}
