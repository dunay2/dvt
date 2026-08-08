/** Owned concern: derive Python execution scope and project it to planner-generic-v1. */
import type { ExecutionSelection, GenericGraphNodeV1, GenericGraphSourceV1 } from '@dvt/contracts';
import { parseExecutionSelection } from '@dvt/contracts';

import type { CanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  buildExecutableScopeGraph,
  buildExecutionIntentDraftSignature,
  resolveExecutableScope,
} from './canvasExecutionScopePolicy';
import {
  isPythonCodeNode,
  projectPythonCodeStepTypeConfig,
  type PythonCodeExecutionScope,
} from './pythonCodeAuthoringModel';

export type PythonExecutionProjection =
  | Readonly<{
      ok: true;
      graphSource: GenericGraphSourceV1;
      selection: ExecutionSelection;
      selectionMode: CanvasExecutionSelectionIntent['mode'];
      requestedRootNodeIds: readonly string[];
      derivedDependencyNodeIds: readonly string[];
      scopedNodeIds: readonly string[];
      draftSignature: string;
    }>
  | Readonly<{ ok: false; message: string }>;

export function buildCanvasPythonExecutionProjection(args: {
  readonly canonicalNodes: readonly CanonicalNode[];
  readonly canonicalEdges: readonly CanonicalEdge[];
  readonly selectionIntent: CanvasExecutionSelectionIntent;
  readonly workspaceNodeIds: readonly string[];
  readonly executionScope?: PythonCodeExecutionScope;
}): PythonExecutionProjection {
  const scopeGraph = buildExecutableScopeGraph({
    nodes: args.canonicalNodes,
    edges: args.canonicalEdges,
    workspaceNodeIds: args.workspaceNodeIds,
    isExecutableNode: isPythonCodeNode,
  });
  const executionScope = resolveExecutableScope({
    selectionIntent: args.selectionIntent,
    workspaceNodeIds: args.workspaceNodeIds,
    executableNodeIds: scopeGraph.executableNodeIds,
    dependencyIdsByNodeId: scopeGraph.dependencyIdsByNodeId,
  });
  if (!executionScope.ok) {
    return {
      ok: false,
      message:
        executionScope.invalidNodeIds.length === 0
          ? 'La selección explícita de Python está vacía.'
          : `La selección contiene nodos Python no ejecutables: ${executionScope.invalidNodeIds.join(', ')}.`,
    };
  }
  if (executionScope.nodeIds.length === 0) {
    return { ok: false, message: 'El plan Python requiere al menos un nodo de código.' };
  }

  const scopedNodeIdSet = new Set(executionScope.nodeIds);
  const executableNodes = args.canonicalNodes.filter(
    (node) => scopedNodeIdSet.has(node.id) && isPythonCodeNode(node)
  );
  const nodeIdSet = new Set(executableNodes.map((node) => node.id));
  const graphNodes: GenericGraphNodeV1[] = [];

  for (const node of executableNodes) {
    const config = projectPythonCodeStepTypeConfig({ node, executionScope: args.executionScope });
    if (!config.ok) return config;
    graphNodes.push({
      nodeId: node.id,
      stepKind: 'EXECUTE_PYTHON_CODE',
      dependsOn: args.canonicalEdges
        .filter(
          (edge) =>
            edge.targetId === node.id &&
            nodeIdSet.has(edge.sourceId) &&
            nodeIdSet.has(edge.targetId)
        )
        .map((edge) => edge.sourceId)
        .sort(),
      stepTypeConfig: config.stepTypeConfig,
      metadata: {
        displayName: node.name,
        tags: {
          kind: node.kind,
          pluginId: node.pluginId,
          role: node.role,
          runtimeRef: config.stepTypeConfig.runtimeRef,
        },
      },
    });
  }

  const graphSource: GenericGraphSourceV1 = {
    kind: 'generic-graph-v1',
    sourceFamily: 'python-code',
    sourceVersion: '1.0',
    nodes: graphNodes,
  };
  const selection = parseExecutionSelection({
    mode: 'explicit',
    nodeIds: graphNodes.map((node) => node.nodeId),
  });

  return {
    ok: true,
    graphSource,
    selection,
    selectionMode: executionScope.selectionMode,
    requestedRootNodeIds: executionScope.requestedRootNodeIds,
    derivedDependencyNodeIds: executionScope.derivedDependencyNodeIds,
    scopedNodeIds: executionScope.nodeIds,
    draftSignature: buildExecutionIntentDraftSignature({
      graphSource,
      selection,
      selectionMode: executionScope.selectionMode,
      requestedRootNodeIds: executionScope.requestedRootNodeIds,
    }),
  };
}
