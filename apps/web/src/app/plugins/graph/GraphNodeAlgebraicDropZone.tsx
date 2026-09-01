/** Owned concern: render the admitted algebraic landing spaces over a graph card. */
import type { CanvasAlgebraicCompositionOperation } from '../../views/canvas/canvasAlgebraicComposition';
import { cn } from '../../components/ui/utils';

export type GraphNodeAlgebraicDrop = {
  operations: CanvasAlgebraicCompositionOperation[];
  activeOperation: CanvasAlgebraicCompositionOperation;
};

const OPERATION_LABEL: Record<CanvasAlgebraicCompositionOperation, string> = {
  inner_join: '⋈ JOIN',
  union_all: '∪ ALL',
};

export function resolveGraphNodeAlgebraicDrop(value: unknown): GraphNodeAlgebraicDrop | undefined {
  if (typeof value !== 'object' || value == null) return undefined;
  const candidate = value as Partial<GraphNodeAlgebraicDrop>;
  if (
    !Array.isArray(candidate.operations) ||
    candidate.operations.length === 0 ||
    (candidate.activeOperation !== 'inner_join' && candidate.activeOperation !== 'union_all')
  ) {
    return undefined;
  }
  return candidate as GraphNodeAlgebraicDrop;
}

export function GraphNodeAlgebraicDropZone({
  drop,
}: Readonly<{ drop: GraphNodeAlgebraicDrop }>): JSX.Element {
  return (
    <div
      data-slot="graph-node-algebraic-drop"
      className="pointer-events-none absolute inset-2 z-20 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2 rounded-md bg-slate-950/80 p-2 backdrop-blur-sm"
    >
      {drop.operations.map((operation) => {
        const active = operation === drop.activeOperation;
        return (
          <div
            key={operation}
            data-operation={operation}
            data-active={active}
            className={cn(
              'flex min-h-20 items-center justify-center rounded-md border-2 border-dashed text-sm font-semibold transition',
              active
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                : 'border-slate-600 bg-slate-900/70 text-slate-300'
            )}
          >
            {OPERATION_LABEL[operation]}
          </div>
        );
      })}
    </div>
  );
}
