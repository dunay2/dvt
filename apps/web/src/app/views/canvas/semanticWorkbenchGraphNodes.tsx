/** Owned concern: render shared labels for semantic relation and expression nodes. */
import { Braces, Database, Equal, GitMerge, Hash } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export function projectSemanticWorkbenchNodes(
  semanticGraph: SemanticWorkbenchGraph,
  selectedSemanticId: string | null,
  onSelect?: (id: string) => void
) {
  return semanticGraph.nodes.map((node) => {
    if (node.data.semanticKind === 'group') {
      return {
        ...node,
        data: {
          ...node.data,
          label: <span data-slot="semantic-workbench-group-label">{node.data.label}</span>,
        },
      };
    }
    const [title, ...details] = node.data.label.split('\n');
    const Icon =
      node.data.semanticKind === 'field'
        ? Hash
        : node.data.semanticKind === 'expression'
          ? Equal
          : node.data.semanticKind === 'literal'
            ? Braces
            : title === 'SOURCE'
              ? Database
              : GitMerge;
    const tone =
      node.data.semanticKind === 'field'
        ? '#7dd3fc'
        : node.data.semanticKind === 'expression'
          ? '#34d399'
          : title === 'SOURCE'
            ? '#60a5fa'
            : '#22d3ee';
    return {
      ...node,
      selected: node.id === selectedSemanticId,
      data: {
        ...node.data,
        label: (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                data-slot="semantic-workbench-node"
                tabIndex={0}
                role={onSelect == null ? undefined : 'button'}
                aria-pressed={onSelect == null ? undefined : node.id === selectedSemanticId}
                aria-label={onSelect == null ? undefined : node.data.label.replaceAll('\n', ' ')}
                onClick={() => onSelect?.(node.id)}
                onKeyDown={(event) => {
                  if (onSelect != null && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(node.id);
                  }
                }}
                className="flex min-w-0 items-center gap-2 p-2 text-left"
              >
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-md border"
                  style={{ borderColor: tone, color: tone, background: `${tone}14` }}
                >
                  <Icon size={15} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span
                    className="block text-[9px] font-bold tracking-[0.06em]"
                    style={{ color: tone }}
                  >
                    {title}
                  </span>
                  <span className="block font-mono text-[10px] leading-snug text-slate-200">
                    {details.join(' · ')}
                  </span>
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {node.data.detail}
            </TooltipContent>
          </Tooltip>
        ),
      },
    };
  });
}
