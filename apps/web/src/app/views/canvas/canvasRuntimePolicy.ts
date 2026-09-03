/** Owned concern: resolve active Canvas runtime policy for route commands and admission. */
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanonicalNode, PluginNodeKind } from '../../types/canonical';

export type CanvasRuntimePolicyInput =
  | {
      kind: 'missing_document';
      executionStrategy: CanvasExecutionStrategy;
      nodeKinds: readonly NodeKindRegistration[];
    }
  | {
      kind: 'ready';
      canvasKind: string;
      executionStrategy: CanvasExecutionStrategy;
      nodeKinds: readonly NodeKindRegistration[];
    }
  | {
      kind: 'unsupported_kind';
      canvasKind: string;
    }
  | {
      kind: 'disabled_plugin';
      canvasKind: string;
      pluginId: string;
      reason?: string;
    };

export type CanvasRuntimeDocumentPolicy =
  | {
      kind: 'missing_document';
    }
  | {
      kind: 'ready';
      canvasKind: string;
    }
  | {
      kind: 'unsupported_kind';
      canvasKind: string;
    }
  | {
      kind: 'disabled_plugin';
      canvasKind: string;
      pluginId: string;
      reason?: string;
    };

export type CanvasRuntimeExecutionPolicy =
  | {
      kind: 'executable';
      strategy: Extract<
        CanvasExecutionStrategy,
        {
          kind: 'planner_generic_preview' | 'dbt_project_file_preview';
        }
      >;
    }
  | {
      kind: 'not_executable';
      strategy: Extract<CanvasExecutionStrategy, { kind: 'not_executable' }>;
    }
  | {
      kind: 'blocked';
    };

export type CanvasRuntimeCommandPolicy = {
  canMutateGraph: boolean;
  canEditInspectorNode: boolean;
  canOpenSourceImport: boolean;
  canPlan: boolean;
  canRun: boolean;
  canReloadLatestDraft: boolean;
};

export type CanvasRuntimeAdmissionPolicy = {
  nodeKinds: readonly NodeKindRegistration[];
  allowsNodeKind: (kind: PluginNodeKind) => boolean;
  allowsCanonicalNode: (node: CanonicalNode) => boolean;
};

export type CanvasRuntimePolicy = {
  document: CanvasRuntimeDocumentPolicy;
  execution: CanvasRuntimeExecutionPolicy;
  commands: CanvasRuntimeCommandPolicy;
  admission: CanvasRuntimeAdmissionPolicy;
};

export type ResolveCanvasRuntimePolicyArgs = {
  activeRuntime: CanvasRuntimePolicyInput;
  canMutateGraph: boolean;
  canOpenSourceImport: boolean;
  canPlan: boolean;
  canRun: boolean;
  canReloadLatestDraft: boolean;
};

function resolveRuntimeDocumentPolicy(
  activeRuntime: CanvasRuntimePolicyInput
): CanvasRuntimeDocumentPolicy {
  switch (activeRuntime.kind) {
    case 'missing_document':
      return {
        kind: 'missing_document',
      };
    case 'ready':
      return {
        kind: 'ready',
        canvasKind: activeRuntime.canvasKind,
      };
    case 'unsupported_kind':
      return {
        kind: 'unsupported_kind',
        canvasKind: activeRuntime.canvasKind,
      };
    case 'disabled_plugin':
      return {
        kind: 'disabled_plugin',
        canvasKind: activeRuntime.canvasKind,
        pluginId: activeRuntime.pluginId,
        ...(activeRuntime.reason == null ? {} : { reason: activeRuntime.reason }),
      };
  }
}

function isRuntimePolicyBlocked(
  activeRuntime: CanvasRuntimePolicyInput
): activeRuntime is Extract<
  CanvasRuntimePolicyInput,
  { kind: 'unsupported_kind' | 'disabled_plugin' }
> {
  return activeRuntime.kind === 'unsupported_kind' || activeRuntime.kind === 'disabled_plugin';
}

function resolveRuntimeExecutionPolicy(
  activeRuntime: CanvasRuntimePolicyInput
): CanvasRuntimeExecutionPolicy {
  if (isRuntimePolicyBlocked(activeRuntime)) {
    return {
      kind: 'blocked',
    };
  }

  if (
    activeRuntime.executionStrategy.kind === 'planner_generic_preview' ||
    activeRuntime.executionStrategy.kind === 'dbt_project_file_preview'
  ) {
    return {
      kind: 'executable',
      strategy: activeRuntime.executionStrategy,
    };
  }

  return {
    kind: 'not_executable',
    strategy: activeRuntime.executionStrategy,
  };
}

function resolveRuntimeNodeKinds(
  activeRuntime: CanvasRuntimePolicyInput
): readonly NodeKindRegistration[] {
  return isRuntimePolicyBlocked(activeRuntime) ? [] : activeRuntime.nodeKinds;
}

function buildRuntimeAdmissionPolicy(
  nodeKinds: readonly NodeKindRegistration[]
): CanvasRuntimeAdmissionPolicy {
  const allowedKindsById = new Map(
    nodeKinds.map((registration) => [registration.kind, registration])
  );

  function allowsNodeKind(kind: PluginNodeKind): boolean {
    return allowedKindsById.has(kind);
  }

  function allowsCanonicalNode(node: CanonicalNode): boolean {
    const registration = allowedKindsById.get(node.kind);
    if (registration == null) {
      return false;
    }

    return node.pluginId === registration.pluginId && node.role === registration.role;
  }

  return {
    nodeKinds,
    allowsNodeKind,
    allowsCanonicalNode,
  };
}

function resolveRuntimeCommandPolicy(
  args: ResolveCanvasRuntimePolicyArgs,
  execution: CanvasRuntimeExecutionPolicy
): CanvasRuntimeCommandPolicy {
  const hasReadyDocument = args.activeRuntime.kind === 'ready';
  const canMutateReadyGraph = hasReadyDocument && args.canMutateGraph;
  const canExecute = hasReadyDocument && execution.kind === 'executable';

  return {
    canMutateGraph: canMutateReadyGraph,
    canEditInspectorNode: canMutateReadyGraph,
    canOpenSourceImport: canMutateReadyGraph && args.canOpenSourceImport,
    canPlan: canExecute && args.canPlan,
    canRun: canExecute && args.canRun,
    canReloadLatestDraft: args.canReloadLatestDraft,
  };
}

export function resolveCanvasRuntimePolicy(
  args: ResolveCanvasRuntimePolicyArgs
): CanvasRuntimePolicy {
  const nodeKinds = resolveRuntimeNodeKinds(args.activeRuntime);
  const execution = resolveRuntimeExecutionPolicy(args.activeRuntime);

  return {
    document: resolveRuntimeDocumentPolicy(args.activeRuntime),
    execution,
    commands: resolveRuntimeCommandPolicy(args, execution),
    admission: buildRuntimeAdmissionPolicy(nodeKinds),
  };
}
