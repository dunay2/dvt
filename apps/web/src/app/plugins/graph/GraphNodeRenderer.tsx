/** Owned concern: render generic canonical graph nodes independent of plugin-specific panels. */
import type { ReactElement } from 'react';

import type { NodeRendererProps } from '../contracts/NodeRendering';
import { projectGraphNodeCardViewProps } from './graphNodeCardReadModel';
import { GraphNodeCardView } from './GraphNodeCardView';
import { resolveGraphNodeAlgebraicDrop } from './GraphNodeAlgebraicDropZone';

export function GraphNodeRenderer(props: Readonly<NodeRendererProps>): ReactElement {
  return (
    <GraphNodeCardView
      {...projectGraphNodeCardViewProps(props)}
      algebraicDrop={resolveGraphNodeAlgebraicDrop(props.data.algebraicDrop)}
    />
  );
}
