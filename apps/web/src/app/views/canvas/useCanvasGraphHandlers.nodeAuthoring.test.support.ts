import type React from 'react';
import { vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../../plugins/dvt/dvtNodeTypeCatalog';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { buildCanonicalNode } from './useCanvasGraphHandlers.test.support';

export function requireAuthoringNodeKind(kind: string): NodeKindRegistration {
  const registration = DVT_AUTHORING_NODE_KINDS.find((candidate) => candidate.kind === kind);
  if (registration == null) {
    throw new Error(`Missing authoring node kind fixture: ${kind}`);
  }
  return registration;
}

export function buildCanonicalDropEvent(
  canonicalNode: ReturnType<typeof buildCanonicalNode>
): React.DragEvent<HTMLDivElement> {
  return {
    preventDefault: vi.fn(),
    target: {
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
    },
    clientX: 120,
    clientY: 80,
    dataTransfer: {
      getData: vi.fn(() => JSON.stringify(canonicalNode)),
    },
  } as unknown as React.DragEvent<HTMLDivElement>;
}
