/** Focused fixtures for placing operations first and wiring producers afterwards. */
import React, { act } from 'react';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  COPY,
  container,
  dragSourceTo,
  edge,
  root,
  sourceRef,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { CanonicalNode } from '../../types/canonical';

export function projectionTarget(source: CanonicalNode): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    transformNode(),
    encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        source: {
          nodeId: source.id,
          schema: 'public',
          table: 'customers',
          sourceRef: sourceRef('customers'),
          fields: [{ name: 'customer_id', dataType: 'string' }],
        },
        targetNodeId: 'transform',
        outputs: [
          {
            fieldId: 'output:customer_id',
            name: 'customer_id',
            sourceFieldName: 'customer_id',
          },
        ],
      })
    )
  );
}

export async function renderOperationWorkbench(
  target: CanonicalNode,
  sources: readonly CanonicalNode[],
  onApplyNodeDraft: CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']
): Promise<void> {
  await act(async () =>
    root.render(
      <CanvasRelationalTreeWorkbench
        transformNode={target}
        nodes={[...sources, target]}
        edges={sources.map((source) => edge(source.id))}
        copy={COPY}
        authoring={{ canEditNode: true, onApplyNodeDraft }}
      />
    )
  );
}

export async function dragElement(source: HTMLElement, target: HTMLElement): Promise<void> {
  await act(async () => dragSourceTo(source, target));
  await act(async () => Promise.resolve());
}

export function viewport(): HTMLElement {
  return container.querySelector<HTMLElement>(
    '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
  )!;
}

export async function instantiateSource(name: string): Promise<void> {
  const source = Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-source"]')
  ).find((candidate) => candidate.textContent?.includes(name));
  if (source == null) throw new Error(`Source ${name} is not available.`);
  await dragElement(source, viewport());
}

export function canonicalOutputPort(): HTMLElement {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
  ).find(
    (port) =>
      port.parentElement?.hasAttribute('data-parent-locator') === false &&
      port.parentElement.querySelector('[data-pending="true"]') == null
  )!;
}

export function pendingSourceOutputPorts(): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
  ).filter(
    (port) =>
      port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
  );
}

export function stagedOperation(operator: string): HTMLElement {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
  ).find((card) => card.querySelector(`[data-operator="${operator}"]`) != null)!;
}
