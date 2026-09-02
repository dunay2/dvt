/** Owned concern: render graph-node tags from already-selected display tags. */
import { useState, type ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { cn } from '../../components/ui/utils';
import type { GraphNodeCardAccentTone } from './graphNodeCardStrategyContracts';
import { graphNodeTagListClasses } from './graphVisualTokens';

export type GraphNodeTagListProps = Readonly<{
  tags: readonly Readonly<{ value: string; label: string }>[];
  limit?: number;
  tone?: GraphNodeCardAccentTone;
  onSelectTag?: (tag: string) => void;
  getSelectTagLabel?: (tag: string) => string;
}>;

export function GraphNodeTagList({
  tags,
  limit = 3,
  tone = 'unknown',
  onSelectTag,
  getSelectTagLabel,
}: GraphNodeTagListProps): ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  const hiddenTags = tags.slice(limit);
  const renderedTags = expanded ? tags : tags.slice(0, limit);
  if (renderedTags.length === 0) {
    return null;
  }

  return (
    <div data-slot="graph-node-tag-list" data-tone={tone} className={graphNodeTagListClasses.root}>
      {renderedTags.map((tag) => {
        const className = cn(
          graphNodeTagListClasses.tag,
          graphNodeTagListClasses.tone[tone],
          onSelectTag && graphNodeTagListClasses.interactiveTag
        );
        return onSelectTag ? (
          <button
            key={tag.value}
            type="button"
            data-slot="graph-node-tag"
            data-tone={tone}
            {...canvasNodeEmbeddedControlProps}
            className={className}
            aria-label={getSelectTagLabel?.(tag.label) ?? tag.label}
            title={getSelectTagLabel?.(tag.label) ?? tag.label}
            onClick={(event) => {
              event.stopPropagation();
              onSelectTag(tag.value);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              onSelectTag(tag.value);
            }}
          >
            {tag.label}
          </button>
        ) : (
          <span
            key={tag.value}
            data-slot="graph-node-tag"
            data-tone={tone}
            className={className}
            title={tag.label}
          >
            {tag.label}
          </span>
        );
      })}
      {hiddenTags.length === 0 ? null : (
        <button
          type="button"
          data-slot="graph-node-tag-overflow"
          {...canvasNodeEmbeddedControlProps}
          className={cn(
            graphNodeTagListClasses.tag,
            graphNodeTagListClasses.tone[tone],
            graphNodeTagListClasses.interactiveTag
          )}
          title={hiddenTags.map(({ label }) => label).join(', ')}
          aria-label={hiddenTags.map(({ label }) => label).join(', ')}
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
        >
          {expanded ? '−' : '+'}
          {hiddenTags.length}
        </button>
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
