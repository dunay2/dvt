/** Project fields from the shared asynchronous Substrait analysis, never from shape-specific readers. */
import type {
  CanvasNodePresentationColumn,
  CanvasNodePresentationTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import { CanvasPresentationAnalysis } from './canvasPresentationAnalysis';
import {
  canvasNodePresentationBase,
  type CanvasPresentationQuery,
} from './canvasNodePresentationBase';
import { canvasColumnTruth, projectSourceSelection } from './canvasPresentationColumns';
import { presentCanvasSubstraitFields } from './canvasSubstraitFieldPresentation';
import { resolveCanvasRelationalCompositionTruth } from './canvasRelationalCompositionTruth';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import { resolveCanvasPresentationInputs } from './canvasPresentationInputs';
import type { CanonicalNode } from '../../types/canonical';
import { presentRelationOutputSelection } from './canvasRelationOutputPresentation';

export async function projectCanvasPresentationNode(
  args: CanvasPresentationQuery,
  analysis: CanvasPresentationAnalysis,
  signal: AbortSignal | undefined,
  inputs: readonly CanonicalNode[],
  presentations: ReadonlyMap<string, CanvasNodePresentationTruth>
): Promise<CanvasNodePresentationTruth> {
  signal?.throwIfAborted();
  const base = canvasNodePresentationBase(args);
  const inheritedReferences = new Map(
    base.columns.inherited.map((column) => [
      JSON.stringify([column.sourceNodeId, column.name]),
      column.reference,
    ])
  );
  const inherited: CanvasNodePresentationColumn[] = inputs.flatMap((node) => {
    const upstream = presentations.get(node.id)!;
    const artifact = projectDbtModelArtifact({
      modelNode: node,
      nodes: args.nodes,
      edges: args.edges,
    });
    const selectedNames = artifact.ok ? new Set(artifact.artifact.outputColumns) : null;
    return upstream.columns.visible
      .filter(
        (column) =>
          column.selected !== false && (selectedNames == null || selectedNames.has(column.name))
      )
      .map(({ selected: _selected, ...column }) => ({
        ...column,
        provenance: 'inherited' as const,
        reference:
          column.reference ?? inheritedReferences.get(JSON.stringify([node.id, column.name])),
        sourceNodeId: node.id,
        sourceNodeName: node.name,
      }));
  });
  signal?.throwIfAborted();
  const composition = resolveCanvasRelationalCompositionTruth(args);
  const truth = { ...base, ...(composition == null ? {} : { relationalComposition: composition }) };
  const semanticNode =
    (args.node.kind === 'dvt:transform' && args.node.pluginId === 'dvt') ||
    (args.node.kind === 'dvt:source' &&
      ['dvt', 'dvt.warehouse-source'].includes(args.node.pluginId));
  if (!semanticNode)
    return {
      ...truth,
      columns:
        args.node.role === 'input'
          ? base.columns
          : canvasColumnTruth(base.columns.declared, inherited),
    };
  try {
    const semantic = await analysis.query(args.node, signal);
    if (semantic == null)
      return {
        ...truth,
        columns:
          args.node.role === 'input'
            ? base.columns
            : canvasColumnTruth(base.columns.declared, inherited),
      };
    const authority = args.node.metadata!.transformAuthoring as {
      semanticDocument: { schemaVersion: string; semanticPlan: { sha256: string } };
    };
    const code = {
      kind: 'canonical' as const,
      content: JSON.stringify(authority.semanticDocument, null, 2),
      language: 'json' as const,
      schemaVersion: authority.semanticDocument.schemaVersion,
      digest: authority.semanticDocument.semanticPlan.sha256,
    };
    const sources =
      args.node.role === 'input'
        ? [args.node]
        : resolveCanvasPresentationInputs(semantic, inputs, analysis);
    const participantIds = new Set(sources.map((source) => source.id));
    const fieldInputs =
      args.node.role === 'input'
        ? base.columns.declared.map((column) => ({
            ...column,
            sourceNodeId: args.node.id,
            sourceNodeName: args.node.name,
          }))
        : inherited.filter((column) => participantIds.has(column.sourceNodeId!));
    const declared = await presentCanvasSubstraitFields({
      entry: semantic,
      result: semantic.result,
      sources,
      inherited: fieldInputs,
      signal,
    });
    signal?.throwIfAborted();
    const columns =
      args.node.role === 'input'
        ? projectSourceSelection(base.columns.declared, declared)
        : await presentRelationOutputSelection(semantic, declared, fieldInputs, sources, signal);
    return {
      ...truth,
      code,
      columns: {
        ...columns,
        inherited: args.node.role === 'input' ? [] : inherited,
        inheritedCount: args.node.role === 'input' ? 0 : inherited.length,
        state: 'ready',
      },
    };
  } catch (error) {
    signal?.throwIfAborted();
    return {
      ...truth,
      code: { kind: 'unavailable', reason: 'invalid-canonical-substrait-document' },
      columns: {
        ...canvasColumnTruth([], []),
        state: 'unavailable',
        diagnostic: error instanceof Error ? error.message : 'Canonical field analysis failed.',
      },
    };
  }
}
