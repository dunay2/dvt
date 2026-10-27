/** Owned concern: compose passive canonical Transform output inspection. */

import { DvtTransformOutputView, type DvtTransformOutputViewProps } from './DvtTransformOutputView';

export function DvtTransformCodeWorkbenchContent({
  transformNode,
  nodes,
  edges,
  canonicalContent,
  copy,
}: Omit<DvtTransformOutputViewProps, 'canonicalContent'> &
  Readonly<{
    canonicalContent?: string;
  }>): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {canonicalContent == null ? null : (
        <DvtTransformOutputView
          transformNode={transformNode}
          nodes={nodes}
          edges={edges}
          canonicalContent={canonicalContent}
          copy={copy}
        />
      )}
    </div>
  );
}
