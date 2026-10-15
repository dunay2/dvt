/**
 * Owned concern: project fields and interaction posture from the owning relational read.
 * @baseline ADR-0064: retained inspection is distinct from resolved publication.
 * @decision Reuse the document and publication already classified for this snapshot.
 * @consequence Rejected recovery cannot become ready Output or implicit Input repair.
 * @version 1.1.0
 */
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
import {
  projectCanvasRelationalComposition,
  resolveCanvasRelationalCompositionTruth,
} from './canvasRelationalCompositionTruth';
import { analyzeCanvasRelations } from './canvasRelationalAnalysis';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { projectDbtModelArtifact } from './canvasDbtModelArtifactProjection';
import { resolveCanvasPresentationInputs } from './canvasPresentationInputs';
import type { CanonicalNode } from '../../types/canonical';
import { presentRelationOutputSelection } from './canvasRelationOutputPresentation';
import { presentCanvasFilterSummary } from './canvasPresentationFilterSummary';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { projectCanvasInputBindings } from './canvasInputBindings';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';

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
  const nativeModel =
    args.node.pluginId === 'dvt' &&
    args.node.kind === 'dvt:transform' &&
    !isDbtCompatibleModel(args.node);
  const structural = nativeModel ? analyzeCanvasRelations(args) : null;
  const composition =
    structural == null
      ? resolveCanvasRelationalCompositionTruth(args)
      : projectCanvasRelationalComposition(structural);
  const inputBindings = nativeModel
    ? projectCanvasInputBindings({
        targetNodeId: args.node.id,
        retainedSidecar: structural?.semantic?.document.sidecar,
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
  const truth: CanvasNodePresentationTruth = {
    ...base,
    ...(nativeModel ? { inputBindingPosture: 'unavailable' } : {}),
    ...(inputBindings == null ? {} : { inputBindings }),
    ...(composition == null ? {} : { relationalComposition: composition }),
  };
  const retained = structural?.semantic?.state === 'retained';
  const rejected =
    structural?.failure != null && structural.failure !== 'missing-semantic-authority';
  if (retained || rejected)
    return {
      ...truth,
      inputBindingPosture: retained ? 'repair-only' : 'unavailable',
      code: { kind: 'unavailable', reason: 'invalid-canonical-substrait-document' },
      columns: {
        ...canvasColumnTruth([], retained ? inherited : [], []),
        state: 'unavailable',
        diagnostic: retained
          ? resolveCanvasViewCopy().relationalTreeProducerFieldsUnavailableMessage
          : structural?.failure === 'input-identity-unavailable'
            ? resolveCanvasViewCopy().relationalTreeInputIdentityUnavailableMessage
            : resolveCanvasViewCopy().relationalTreeInvalidMessage,
      },
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
    const resolved = nativeModel
      ? structural?.semantic?.document
      : args.node.role === 'transform' && args.node.metadata?.transformAuthoring != null
        ? resolveCanvasProducerDocument(args.node, args.nodes)
        : undefined;
    const semantic = await analysis.query(args.node, signal, resolved);
    if (semantic == null)
      return {
        ...truth,
        ...(nativeModel ? { inputBindingPosture: 'current' } : {}),
        columns:
          args.node.role === 'input'
            ? { ...base.columns, state: 'ready' }
            : { ...canvasColumnTruth([], inherited, []), state: 'unconfigured' },
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
    const unavailable = new Set(
      structural?.semantic?.publication?.get(semantic.index.rootId)?.unavailableFieldIds
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
      ...(nativeModel ? { inputBindingPosture: 'current' } : {}),
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
