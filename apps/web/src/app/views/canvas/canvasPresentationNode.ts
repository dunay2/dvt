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
import { presentCanvasFilterSummary } from './canvasPresentationFilterSummary';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { projectCanvasInputBindings } from './canvasInputBindings';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import { deriveSubstraitPublication } from '@dvt/substrait-analysis';
import { resolveUnmappedCanvasReadFields } from './canvasInputFieldEligibility';

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
  const nativeModel =
    args.node.pluginId === 'dvt' &&
    args.node.kind === 'dvt:transform' &&
    !isDbtCompatibleModel(args.node);
  const inputBindings = nativeModel
    ? projectCanvasInputBindings({
        targetNodeId: args.node.id,
        edges: args.edges,
        producers: new Map(
          inputs.map((producer) => [
            producer.id,
            presentations
              .get(producer.id)!
              .columns.visible.filter((column) => column.selected !== false)
              .map((column) => ({
                columnId:
                  producer.role === 'input'
                    ? (column.sourceFieldName ?? column.name)
                    : (column.reference ?? column.name),
                name: column.name,
                type: column.type,
              })),
          ])
        ),
      })
    : undefined;
  const truth = {
    ...base,
    ...(inputBindings == null ? {} : { inputBindings }),
    ...(composition == null ? {} : { relationalComposition: composition }),
  };
  const semanticNode =
    nativeModel ||
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
    const resolved =
      args.node.role === 'transform' && args.node.metadata?.transformAuthoring != null
        ? resolveCanvasProducerDocument(args.node, args.nodes)
        : undefined;
    const semantic = await analysis.query(args.node, signal, resolved);
    if (semantic == null)
      return {
        ...truth,
        columns:
          args.node.role === 'input'
            ? { ...base.columns, state: 'ready' }
            : canvasColumnTruth([], inherited, []),
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
      args.node.role === 'input' ? [args.node] : resolveCanvasPresentationInputs(semantic, inputs);
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
    const rawColumns =
      args.node.role === 'input'
        ? projectSourceSelection(base.columns.declared, declared)
        : await presentRelationOutputSelection(semantic, declared, fieldInputs, sources, signal);
    const denied = nativeModel
      ? resolveUnmappedCanvasReadFields({
          ...args,
          nodeId: args.node.id,
          document: semantic.document,
        })
      : new Set<string>();
    const unavailable =
      denied.size === 0
        ? new Set<string>()
        : new Set(
            deriveSubstraitPublication(semantic.document, denied).get(semantic.index.rootId)
              ?.unavailableFieldIds
          );
    const columns =
      unavailable.size === 0
        ? rawColumns
        : canvasColumnTruth(
            rawColumns.declared.filter((field) => !unavailable.has(field.reference ?? '')),
            rawColumns.inherited,
            rawColumns.visible.filter((field) => !unavailable.has(field.reference ?? ''))
          );
    const filterSummary =
      args.node.role === 'input' ? undefined : await presentCanvasFilterSummary(semantic, signal);
    return {
      ...truth,
      code,
      ...(filterSummary == null ? {} : { filterSummary }),
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
