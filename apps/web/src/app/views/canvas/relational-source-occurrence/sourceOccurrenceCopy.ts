/** Project instance copy from the single Canvas locale catalogs. */
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';

export function sourceOccurrenceCopy(language: string) {
  const copy = resolveCanvasViewCopy(language);
  return {
    fieldsUnavailable: copy.sourceOccurrenceFieldsUnavailable,
    add: copy.sourceOccurrenceAdd,
    alias: copy.sourceOccurrenceAlias,
    update: copy.sourceOccurrenceUpdate,
    connect: copy.sourceOccurrenceConnect,
    invalid_alias: copy.sourceOccurrenceInvalidAlias,
    update_failed: copy.sourceOccurrenceUpdateFailed,
    aliasUnsupported: copy.sourceOccurrenceAliasUnsupported,
    read_only: copy.sourceOccurrenceReadOnly,
    unsupported: copy.sourceOccurrenceUnsupported,
    unavailable: copy.sourceOccurrenceUnavailable,
    incompatible: copy.sourceOccurrenceIncompatible,
    duplicate_alias: copy.inspectorErrorDvtAliasDuplicate,
  };
}
