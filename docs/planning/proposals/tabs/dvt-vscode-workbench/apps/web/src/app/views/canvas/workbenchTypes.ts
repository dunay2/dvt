import type { CanonicalNode } from '../../types/canonical';

export type SidebarSection = 'explorer' | 'search' | 'artifacts' | 'outline';
export type PaletteMode = 'files' | 'commands';
export type EditorTabKind = 'graph' | 'sql' | 'json' | 'yaml' | 'diff' | 'log';

export interface EditorTab {
  id: string;
  kind: EditorTabKind;
  title: string;
  path: string;
  language?: string;
  value?: string;
  originalValue?: string;
  readOnly?: boolean;
  closable?: boolean;
  description?: string;
  nodeId?: string;
  badge?: string;
}

export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  category: 'File' | 'Command';
  perform: () => void;
}

export interface OutlineAction {
  id: string;
  label: string;
  description?: string;
  run: (node: CanonicalNode) => void;
}
