/** Owned concern: build canonical authoring-node commands from governed node-kind registrations. */
import type { Node } from '@xyflow/react';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../../types/canonical';

type CanvasAuthoringNodeCommand = Readonly<{
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
}>;

const CATALOG_NODE_VERTICAL_OFFSET = 220;
const FIRST_AUTHORING_NODE_POSITION = { x: 160, y: 120 } as const;

function slugifyNodeKind(kind: string): string {
  const lastSegment = kind.slice(kind.lastIndexOf(':') + 1);

  return buildSlugFromAsciiWords(lastSegment);
}

function buildSlugFromAsciiWords(value: string): string {
  const words: string[] = [];
  let currentWord = '';

  for (const character of value) {
    if (isAsciiAlphaNumeric(character)) {
      currentWord += character.toLowerCase();
      continue;
    }

    if (currentWord.length > 0) {
      words.push(currentWord);
      currentWord = '';
    }
  }

  if (currentWord.length > 0) {
    words.push(currentWord);
  }

  return words.join('-');
}

function isAsciiAlphaNumeric(character: string): boolean {
  const codePoint = character.codePointAt(0);
  if (codePoint == null) {
    return false;
  }

  return (
    (codePoint >= 48 && codePoint <= 57) ||
    (codePoint >= 65 && codePoint <= 90) ||
    (codePoint >= 97 && codePoint <= 122)
  );
}

function resolveNextAuthoringNodeIndex(baseId: string, existingNodes: readonly Node[]): number {
  const existingIds = new Set(existingNodes.map((node) => node.id));
  let nextIndex = 1;

  while (existingIds.has(`${baseId}-${nextIndex}`)) {
    nextIndex += 1;
  }

  return nextIndex;
}

function normalizeNodeKind(kind: string): string {
  return kind.slice(kind.lastIndexOf(':') + 1);
}

function readNodePluginKind(node: Node): string | null {
  const data = node.data;
  if (data == null || typeof data !== 'object' || !('pluginKind' in data)) {
    return null;
  }

  const pluginKind = data.pluginKind;
  return typeof pluginKind === 'string' ? pluginKind : null;
}

function resolveBottommostNode(nodes: readonly Node[]): Node | null {
  return nodes.reduce<Node | null>((bottommost, node) => {
    if (bottommost == null) {
      return node;
    }

    return node.position.y > bottommost.position.y ? node : bottommost;
  }, null);
}

function resolveCatalogAuthoringNodePosition(args: {
  registration: NodeKindRegistration;
  existingNodes: readonly Node[];
}): {
  x: number;
  y: number;
} {
  const { registration, existingNodes } = args;
  const normalizedRegistrationKind = normalizeNodeKind(registration.kind);
  const sameKindNodes = existingNodes.filter((node) => {
    const pluginKind = readNodePluginKind(node);
    return pluginKind != null && normalizeNodeKind(pluginKind) === normalizedRegistrationKind;
  });
  const anchorNode = resolveBottommostNode(sameKindNodes) ?? resolveBottommostNode(existingNodes);

  if (anchorNode == null) {
    return FIRST_AUTHORING_NODE_POSITION;
  }

  return {
    x: anchorNode.position.x,
    y: anchorNode.position.y + CATALOG_NODE_VERTICAL_OFFSET,
  };
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
    position: resolveCatalogAuthoringNodePosition({ registration, existingNodes }),
  };
}
