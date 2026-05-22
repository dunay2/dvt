// ---------------------------------------------------------------------------
// FallbackNodeRenderer
//
// Shell-owned renderer used when no plugin has registered a renderer for
// a given node kind. Renders a minimal dashed-border card so unknown nodes
// are visible on the canvas rather than invisible.
// ---------------------------------------------------------------------------

import type { NodeRendererProps } from './contracts/NodeRendering';
import { graphVisualClasses } from './graph/graphVisualTokens';

export function FallbackNodeRenderer({ node }: Readonly<NodeRendererProps>) {
  const kindLabel = node.kind.split(':')[1] ?? node.kind;

  return (
    <div className={graphVisualClasses.fallbackNodeCard}>
      <div className={graphVisualClasses.fallbackNodeTitle}>{node.name}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide">{kindLabel}</div>
    </div>
  );
}
