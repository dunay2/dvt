/**
 * Owned concern: project relational input ports for cards and edge geometry.
 * @baseline GH-3271-UNION-INPUTS: one composition signature owns cardinality.
 * @decision Share port count, position and localized labels across presentation consumers.
 * @consequence Repeated inputs need no UNION-specific card or duplicated layout rule.
 * @version 1.0.0
 */
import {
  canvasStagedOperationCanAppend,
  isCanvasStagedOperationKind,
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

type InputOwner = Pick<CanvasStagedOperation, 'operation' | 'inputs'>;

export function canvasRelationalInputOwner(
  node: CanvasRelationalTreeNode,
  staged?: CanvasStagedOperation
): InputOwner | null {
  if (staged != null) return staged;
  if (node.operation == null || !isCanvasStagedOperationKind(node.operation)) return null;
  return { operation: node.operation, inputs: node.children.map((child) => child.node.relationId) };
}

export function canvasRelationalInputPortCount(owner: InputOwner): number {
  return owner.inputs.length + (canvasStagedOperationCanAppend(owner) ? 1 : 0);
}

export function canvasRelationalInputPortOffset(port: number, count: number): number {
  return (port + 0.5) / count;
}

export function canvasRelationalInputPortLabel(
  owner: InputOwner,
  port: number,
  copy: CanvasRelationalTreeWorkbenchCopy
): string {
  if (readCanvasStagedCompositionSignature(owner.operation).repeatedInput != null)
    return `${copy.relationalTreePrimaryInputLabel} ${port + 1}`;
  if (owner.inputs.length === 1) return copy.relationalTreePrimaryInputLabel;
  return port === 0 ? copy.inspectorDvtRelationalLeftInput : copy.inspectorDvtRelationalRightInput;
}

export function canvasRelationalInputPortHeight(owner: InputOwner | null): number {
  return Math.max(76, owner == null ? 0 : canvasRelationalInputPortCount(owner) * 28);
}

export function projectCanvasRelationalInputPorts(
  owner: InputOwner | null,
  copy: CanvasRelationalTreeWorkbenchCopy
) {
  if (owner == null) return [];
  const signature = readCanvasStagedCompositionSignature(owner.operation);
  return Array.from({ length: canvasRelationalInputPortCount(owner) }, (_, port) => {
    const append = port === owner.inputs.length;
    const numbered = signature.repeatedInput != null;
    const label = canvasRelationalInputPortLabel(owner, port, copy);
    return {
      port,
      connected: owner.inputs[port] != null,
      label,
      glyph: append
        ? '+'
        : numbered
          ? String(port + 1)
          : owner.inputs.length === 1
            ? ''
            : port === 0
              ? 'L'
              : 'R',
    };
  });
}
