import type React from 'react';
import { vi } from 'vitest';

import { CANVAS_NODE_KINDS } from '../../plugins/nodeTypeCatalog';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { buildCanonicalNode } from './useCanvasGraphHandlers.test.support';

export function requireAuthoringNodeKind(kind: string): NodeKindRegistration {
  const registration = CANVAS_NODE_KINDS.find((candidate) => candidate.kind === kind);
  if (registration == null) {
    throw new Error(`Missing authoring node kind fixture: ${kind}`);
  }
  return registration;
}

export function buildCanonicalDropEvent(
  canonicalNode: ReturnType<typeof buildCanonicalNode>,
  screenPosition = { x: 120, y: 80 },
  target: HTMLElement = document.createElement('div')
): React.DragEvent<HTMLDivElement> {
  return {
    preventDefault: vi.fn(),
    target,
    clientX: screenPosition.x,
    clientY: screenPosition.y,
    dataTransfer: {
      getData: vi.fn(() => JSON.stringify(canonicalNode)),
    },
  } as unknown as React.DragEvent<HTMLDivElement>;
}
