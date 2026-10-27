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
  }>): JSX.Element | null {
  return canonicalContent == null ? null : (
    <DvtTransformOutputView
      transformNode={transformNode}
      nodes={nodes}
      edges={edges}
      canonicalContent={canonicalContent}
      copy={copy}
    />
  );
}
