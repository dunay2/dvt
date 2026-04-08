import type { CoreNodeRole, PluginNodeKind } from '../types/canonical';

import type { LucideIcon } from 'lucide-react';

export type NodeKindRegistration = {
  kind: PluginNodeKind;
  pluginId: string;
  label: string;
  role: CoreNodeRole;
  previewStepKind?: string;
  icon: LucideIcon;
  borderClass: string;
  minimapColor: string;
  allowsIncoming: boolean;
  allowsOutgoing: boolean;
  supportsColumns: boolean;
};

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
