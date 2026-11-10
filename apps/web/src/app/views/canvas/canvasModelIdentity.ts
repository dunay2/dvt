/**
 * Owned concern: admit and resolve a model's visual identity from its real capabilities.
 * @baseline ConfigureCanvasDvtNode owns definition metadata, shared by referenced instances.
 * @decision Store only an optional icon preference; Automatic derives from existing authorities.
 * @consequence A presentation choice cannot grant dbt, SQL, provider or execution capabilities.
 */
import { ConnectedSourceRefSchema, WorkspaceDbtModelReferenceSchema } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';

export type CanvasModelIcon = 'model' | 'dbt' | 'sql' | 'substrait' | 'api' | 'postgres';
export type CanvasModelIconPreference = 'auto' | CanvasModelIcon;
type IdentityNode = Pick<CanonicalNode, 'kind' | 'metadata'>;
type ModelIdentity = Readonly<{ icon: CanvasModelIcon; choices: readonly CanvasModelIcon[] }>;

function compatibleIcons(node: IdentityNode): readonly CanvasModelIcon[] | null {
  if (node.kind === 'dvt:http_json_acquisition') return ['model', 'api'];
  if (node.kind !== 'dvt:source' && node.kind !== 'dvt:transform') return null;
  if (node.metadata?.dbtModelReference !== undefined) {
    return node.kind === 'dvt:transform' &&
      WorkspaceDbtModelReferenceSchema.safeParse(node.metadata.dbtModelReference).success
      ? ['model', 'dbt', 'sql']
      : ['model'];
  }
  if (hasDbtCompatibilityMetadata(node)) return ['model', 'dbt', 'sql'];
  if (node.kind === 'dvt:transform') return ['model', 'substrait'];
  const source = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  return source.success && source.data.connectionRef.provider === 'postgres'
    ? ['model', 'postgres', 'sql']
    : ['model'];
}

export function isCanvasModelIconAllowed(
  node: IdentityNode,
  value: unknown
): value is CanvasModelIconPreference {
  const choices = compatibleIcons(node);
  return value === 'auto' || (choices != null && choices.some((choice) => choice === value));
}

export function readCanvasModelIconPreference(node: IdentityNode): CanvasModelIconPreference {
  const value = node.metadata?.modelIcon;
  return isCanvasModelIconAllowed(node, value) ? value : 'auto';
}

export function resolveCanvasModelIdentity(node: IdentityNode): ModelIdentity | null {
  const choices = compatibleIcons(node);
  if (choices == null) return null;
  const preference = readCanvasModelIconPreference(node);
  return { icon: preference === 'auto' ? (choices[1] ?? 'model') : preference, choices };
}

/** Preserve all unrelated metadata and remove the override when restoring Automatic. */
export function applyCanvasModelIconPreference(
  node: CanonicalNode,
  preference: CanvasModelIconPreference
): CanonicalNode {
  if (
    preference === 'auto'
      ? node.metadata?.modelIcon === undefined
      : node.metadata?.modelIcon === preference
  )
    return node;
  const metadata = { ...node.metadata };
  if (preference === 'auto') delete metadata.modelIcon;
  else metadata.modelIcon = preference;
  return { ...node, metadata };
}
