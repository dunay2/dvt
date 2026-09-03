import type { CoreNodeRole, PluginNodeKind } from '../types/canonical';
import type { CanvasSurfaceStrategy } from './canvasSurfaceStrategyContracts';
import type { CanvasExecutionStrategy } from './canvasExecutionStrategyContracts';
import type { CanvasGraphStrategy } from './graphStrategyContracts';

import type { LucideIcon } from 'lucide-react';

export type NodeKindRegistration = {
  kind: PluginNodeKind;
  pluginId: string;
  label: string;
  role: CoreNodeRole;
  icon: LucideIcon;
  borderClass: string;
  minimapColor: string;
  allowsIncoming: boolean;
  allowsOutgoing: boolean;
  supportsColumns: boolean;
};

export type CanvasKindRegistration = {
  kind: string;
  pluginId: string;
  label: string;
  description: string;
  createTitle: string;
  emptyState: {
    title: string;
    editableMessage: string;
  };
  localizedCopy?: Readonly<
    Record<
      string,
      Readonly<{
        label: string;
        description: string;
        createTitle: string;
        emptyState: Readonly<{
          title: string;
          editableMessage: string;
        }>;
      }>
    >
  >;
  nodeKinds: readonly NodeKindRegistration[];
};

export type CanvasRuntimeRegistration = CanvasKindRegistration & {
  executionStrategy: CanvasExecutionStrategy;
  graphStrategy: CanvasGraphStrategy;
  surfaceStrategy: CanvasSurfaceStrategy;
};

export type CanvasGraphAuthoringMode = CanvasKindRegistration['kind'];

export type CanvasEdgeType = 'ref' | 'source' | 'test' | 'exposure' | 'metric';

export type EdgeTypeStrategyContext = {
  sourceRole: CoreNodeRole;
  targetRole: CoreNodeRole;
  sourceKind: string;
  targetKind: string;
};

export type EdgeTypeStrategy = {
  id: string;
  matches: (context: EdgeTypeStrategyContext) => boolean;
  edgeType: CanvasEdgeType;
};
