/** Owned concern: render graph-node tags from already-selected display tags. */
import type { ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { cn } from '../../components/ui/utils';
import type { GraphNodeCardAccentTone } from './graphNodeCardStrategyContracts';
import { graphNodeTagListClasses } from './graphVisualTokens';

export type GraphNodeTagListProps = Readonly<{
  tags: readonly string[];
  canonicalTags?: readonly string[];
  limit?: number;
  tone?: GraphNodeCardAccentTone;
  onSelectTag?: (tag: string) => void;
  getSelectTagLabel?: (tag: string) => string;
}>;

export function GraphNodeTagList({
  tags,
  canonicalTags = tags,
  limit = 3,
  tone = 'unknown',
  onSelectTag,
  getSelectTagLabel,
}: GraphNodeTagListProps): ReactElement | null {
  const visibleTags = tags.slice(0, limit);
  const hiddenTags = tags.slice(limit);
  if (visibleTags.length === 0) {
    return null;
  }

  return (
    <div data-slot="graph-node-tag-list" data-tone={tone} className={graphNodeTagListClasses.root}>
      {visibleTags.map((tag, index) => {
        const canonicalTag = canonicalTags[index] ?? tag;
        const className = cn(
          graphNodeTagListClasses.tag,
          graphNodeTagListClasses.tone[tone],
          onSelectTag && graphNodeTagListClasses.interactiveTag
        );
        return onSelectTag ? (
          <button
            key={canonicalTag}
            type="button"
            data-slot="graph-node-tag"
            data-tone={tone}
            {...canvasNodeEmbeddedControlProps}
            className={className}
            aria-label={getSelectTagLabel?.(tag) ?? tag}
            title={getSelectTagLabel?.(tag) ?? tag}
            onClick={(event) => {
              event.stopPropagation();
              onSelectTag(canonicalTag);
            }}
          >
            {tag}
          </button>
        ) : (
          <span
            key={canonicalTag}
            data-slot="graph-node-tag"
            data-tone={tone}
            className={className}
          >
            {tag}
          </span>
        );
      })}
      {hiddenTags.length === 0 ? null : (
        <span
          data-slot="graph-node-tag-overflow"
          className={cn(graphNodeTagListClasses.tag, graphNodeTagListClasses.tone[tone])}
          title={hiddenTags.join(', ')}
          aria-label={hiddenTags.join(', ')}
        >
          +{hiddenTags.length}
        </span>
      )}
    </div>
  );
}

export function resolveGraphNodeTagActionProps(
  data: Record<string, unknown>
): Pick<GraphNodeTagListProps, 'onSelectTag' | 'getSelectTagLabel'> {
  const filterByTag = data.onFilterByTag;
  if (typeof filterByTag !== 'function') {
    return {};
  }
  const getTagFilterLabel = data.getTagFilterLabel;

  return {
    onSelectTag: (tag) => filterByTag(tag),
    getSelectTagLabel: (tag) => {
      if (typeof getTagFilterLabel !== 'function') {
        return tag;
      }
      const label = getTagFilterLabel(tag);
      return typeof label === 'string' ? label : tag;
    },
  };
}
