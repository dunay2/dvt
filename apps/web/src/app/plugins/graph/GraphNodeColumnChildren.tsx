/** Owned concern: render nested field members inside one structured column piece. */
import type { ReactElement } from 'react';

import type { GraphNodeColumn } from './graphNodeColumnContracts';

export function GraphNodeColumnChildren(props: {
  children: readonly GraphNodeColumn[];
}): ReactElement {
  return (
    <div
      data-slot="graph-node-column-children"
      className="ml-2 basis-full space-y-1 border-l border-blue-500/40 pl-2"
    >
      {props.children.map((child) => (
        <div key={child.id ?? child.name} className="flex min-w-0 items-center gap-2 text-[11px]">
          <span className="truncate font-mono text-slate-200">{child.name}</span>
          <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
            {child.type}
          </span>
          {child.children == null ? null : <GraphNodeColumnChildren children={child.children} />}
        </div>
      ))}
    </div>
  );
}
