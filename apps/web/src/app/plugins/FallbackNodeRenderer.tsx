// ---------------------------------------------------------------------------
// FallbackNodeRenderer
//
// Shell-owned renderer used when no plugin has registered a renderer for
// a given node kind. Renders a minimal dashed-border card so unknown nodes
// are visible on the canvas rather than invisible.
// ---------------------------------------------------------------------------

import type { NodeRendererProps } from './contracts/NodeRendering';

export function FallbackNodeRenderer({ node }: Readonly<NodeRendererProps>) {
  const kindLabel = node.kind.split(':')[1] ?? node.kind;

  return (
    <div className="min-w-[140px] rounded-md border-2 border-dashed border-slate-500 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
      <div className="truncate font-semibold text-slate-300">{node.name}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide">{kindLabel}</div>
    </div>
  );
}
