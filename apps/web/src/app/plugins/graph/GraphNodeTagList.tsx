/** Owned concern: render graph-node tags from already-selected display tags. */
import type { ReactElement } from 'react';

import { graphNodeTagListClasses } from './graphVisualTokens';

export type GraphNodeTagListProps = Readonly<{
  tags: readonly string[];
  limit?: number;
}>;

export function GraphNodeTagList({ tags, limit = 3 }: GraphNodeTagListProps): ReactElement | null {
  const visibleTags = tags.slice(0, limit);
  if (visibleTags.length === 0) {
    return null;
  }

  return (
    <div data-slot="graph-node-tag-list" className={graphNodeTagListClasses.root}>
      {visibleTags.map((tag) => (
        <span key={tag} className={graphNodeTagListClasses.tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}
