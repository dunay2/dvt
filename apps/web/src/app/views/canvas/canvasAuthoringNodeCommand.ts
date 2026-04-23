/** Owned concern: build canonical authoring-node commands from governed node-kind registrations. */
import type { Node } from '@xyflow/react';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../../types/canonical';

type CanvasAuthoringNodeCommand = Readonly<{
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
}>;

function slugifyNodeKind(kind: string): string {
  const lastSegment = kind.slice(kind.lastIndexOf(':') + 1);

  return lastSegment
    .replaceAll(/[^a-zA-Z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .toLowerCase();
}

function resolveNextAuthoringNodeIndex(baseId: string, existingNodes: readonly Node[]): number {
  const existingIds = new Set(existingNodes.map((node) => node.id));
  let nextIndex = 1;

  while (existingIds.has(`${baseId}-${nextIndex}`)) {
    nextIndex += 1;
  }

  return nextIndex;
}

export function buildAuthoringNodeCommand(
  registration: NodeKindRegistration,
  existingNodes: readonly Node[]
): CanvasAuthoringNodeCommand {
  const baseId = `${registration.pluginId}-${slugifyNodeKind(registration.kind)}`;
  const nextIndex = resolveNextAuthoringNodeIndex(baseId, existingNodes);
  const id = `${baseId}-${nextIndex}`;

  return {
    canonicalNode: {
      id,
      name: `${registration.label} ${nextIndex}`,
      pluginId: registration.pluginId,
      kind: registration.kind,
      role: registration.role,
      status: 'idle',
      tags: ['authoring'],
      metadata: {
        typeLabel: registration.label,
      },
    },
    position: {
      x: (nextIndex - 1) * 220,
      y: 0,
    },
  };
}
