/** Owned concern: allocate opaque stable DVT authoring identities for Substrait sidecar bindings. */
import { randomUuidV7 } from '@dvt/crypto';

const RELATION_ID_PREFIX = 'dvt_rel_';
const FIELD_ID_PREFIX = 'dvt_fld_';

/** Allocate one opaque DVT RelationId. Identity is assigned, never derived from semantics. */
export function allocateDvtRelationId(): string {
  return `${RELATION_ID_PREFIX}${randomUuidV7()}`;
}

/** Allocate one opaque DVT FieldId. Identity is assigned, never derived from name or expression. */
export function allocateDvtFieldId(): string {
  return `${FIELD_ID_PREFIX}${randomUuidV7()}`;
}
