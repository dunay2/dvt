/**
 * Owned concern: project registered source definitions into catalogue rows.
 * @baseline GH-3610: sources, occurrences and operations are distinct identities.
 * @decision Exclude placed instances and retain canonical definition identities.
 * @consequence Catalogue rendering cannot clone definitions or author graph state.
 * @version 1.0.0
 */
import type { CanonicalNode } from '../../../types/canonical';
import { workspaceNodeDefinitionId } from '@dvt/contracts';

export type CanvasExplorerItem = Readonly<{
  id: string;
  label: string;
  description?: string;
  selected?: boolean;
  category?: string;
  draggable?: boolean;
  disabled?: boolean;
}>;

export type CanvasExplorerCategoryAction = Readonly<{
  label: string;
  onAdd?: (opener: HTMLButtonElement) => void;
}>;

export function projectCanvasExplorerSources(
  catalogue: readonly CanonicalNode[]
): CanvasExplorerItem[] {
  const items: CanvasExplorerItem[] = [];
  for (const node of catalogue) {
    if (node.role !== 'input' || workspaceNodeDefinitionId(node) != null) continue;
    const context = [node.metadata?.schema, node.metadata?.connectionName]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
      .join(' · ');
    items.push({ id: node.id, label: node.name, description: context || undefined });
  }
  return items;
}
