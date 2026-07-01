/** Owned concern: render graph-node tags from already-selected display tags. */
import type { ReactElement } from 'react';

import { cn } from '../../components/ui/utils';
import type { GraphNodeCardAccentTone } from './graphNodeCardStrategyContracts';
import { graphNodeTagListClasses } from './graphVisualTokens';

export type GraphNodeTagListProps = Readonly<{
  tags: readonly string[];
  limit?: number;
  tone?: GraphNodeCardAccentTone;
}>;

export function GraphNodeTagList({
  tags,
  limit = 3,
  tone = 'unknown',
}: GraphNodeTagListProps): ReactElement | null {
  const visibleTags = tags.slice(0, limit);
  if (visibleTags.length === 0) {
    return null;
  }

  return (
    <div data-slot="graph-node-tag-list" data-tone={tone} className={graphNodeTagListClasses.root}>
      {visibleTags.map((tag) => (
        <span
          key={tag}
          data-slot="graph-node-tag"
          data-tone={tone}
          className={cn(graphNodeTagListClasses.tag, graphNodeTagListClasses.tone[tone])}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
