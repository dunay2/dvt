/**
 * Owned concern: admit and resolve a model's visual identity from its real capabilities.
 * @baseline ConfigureCanvasDvtNode owns definition metadata, shared by referenced instances.
 * @decision Store only an optional icon preference; Automatic derives from existing authorities.
 * @consequence A presentation choice cannot grant dbt, SQL, provider or execution capabilities.
 */
import { ConnectedSourceRefSchema, WorkspaceDbtModelReferenceSchema } from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

export type CanvasModelIcon = 'model' | 'dbt' | 'sql' | 'substrait' | 'api' | 'postgres' | 'join';
export type CanvasModelIconPreference = 'auto' | CanvasModelIcon;
type IdentityNode = CanonicalNode;
export type ModelIdentity = Readonly<{
  icon: CanvasModelIcon;
  automaticIcon: CanvasModelIcon;
  preference: CanvasModelIconPreference;
  choices: readonly CanvasModelIcon[];
}>;

/** Missing or invalid semantics cannot admit an operation mark. Never infer it from display text. */
function hasCanonicalJoin(node: IdentityNode): boolean {
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) return false;
    const indexed = indexSubstraitRelations(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument)
    );
    return (
      indexed.ok &&
      [...indexed.index.relations.values()].some(
        ({ relation }) => relation.relType.case === 'join' || relation.relType.case === 'cross'
      )
    );
  } catch {
    return false;
  }
}

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
  if (node.kind === 'dvt:transform')
    return hasCanonicalJoin(node) ? ['model', 'substrait', 'join'] : ['model', 'substrait'];
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
  return preferenceForChoices(node, compatibleIcons(node) ?? []);
}

function preferenceForChoices(
  node: IdentityNode,
  choices: readonly CanvasModelIcon[]
): CanvasModelIconPreference {
  return choices.find((choice) => choice === node.metadata?.modelIcon) ?? 'auto';
}

export function resolveCanvasModelIdentity(node: IdentityNode): ModelIdentity | null {
  const choices = compatibleIcons(node);
  if (choices == null) return null;
  const preference = preferenceForChoices(node, choices);
  const automaticIcon = choices[1] ?? 'model';
  return {
    icon: preference === 'auto' ? automaticIcon : preference,
    automaticIcon,
    preference,
    choices,
  };
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
