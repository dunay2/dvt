// ---------------------------------------------------------------------------
// FallbackNodeRenderer
//
// Shell-owned renderer used when no plugin has registered a renderer for
// a given node kind. Renders a minimal dashed-border card so unknown nodes
// are visible on the canvas rather than invisible.
// ---------------------------------------------------------------------------

import type { CSSProperties } from 'react';

import { cn } from '../components/ui/utils';
import type { NodeRendererProps } from './contracts/NodeRendering';
import { fallbackGraphNodeClasses } from './graph/graphVisualTokens';

export function FallbackNodeRenderer({ node, overlayDecoration }: Readonly<NodeRendererProps>) {
  const kindLabel = node.kind.split(':')[1] ?? node.kind;

  return (
    <div
      className={cn(fallbackGraphNodeClasses.card, overlayDecoration?.dimmed && 'opacity-30')}
      style={
        overlayDecoration?.borderColor
          ? ({ borderColor: overlayDecoration.borderColor } as CSSProperties)
          : undefined
      }
    >
      <div className={fallbackGraphNodeClasses.title}>{node.name}</div>
      <div className={fallbackGraphNodeClasses.kind}>{kindLabel}</div>
    </div>
  );
}
