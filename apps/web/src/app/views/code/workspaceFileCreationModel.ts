/**
 * Owned concern: model create-only file publication and its recoverable presentation states.
 * @decision A published file can retry observation, never repeat its accepted write.
 * @consequence Scope-safe controllers cannot turn a refresh failure into an overwrite.
 */
/** Client acquisition budget; server storage limits remain independently authoritative. */
export const MAX_FILE_CREATION_IMPORT_BYTES = 1_000_000;
export type FileCreationDraftError =
  'invalidPath' | 'conflict' | 'forbidden' | 'unavailable' | 'invalidText' | 'importTooLarge';
export type FileCreationError = FileCreationDraftError | 'refreshFailed' | 'receiptMismatch';
export type FileCreationDraft = Readonly<{ path: string; content: string }>;
export type FileCreationState =
  | { kind: 'closed' }
  | { kind: 'reading'; draft: FileCreationDraft }
  | { kind: 'editing'; draft: FileCreationDraft; error?: FileCreationDraftError }
  | { kind: 'saving'; draft: FileCreationDraft }
  | { kind: 'published'; draft: FileCreationDraft; path: string; error?: 'refreshFailed' }
  | { kind: 'unconfirmed'; draft: FileCreationDraft; error: 'receiptMismatch' };
type FileCreationEvent =
  | { type: 'begin'; draft: FileCreationDraft }
  | { type: 'read'; draft: FileCreationDraft }
  | { type: 'decoded'; content: string }
  | { type: 'edit'; field: keyof FileCreationDraft; value: string }
  | { type: 'save' }
  | { type: 'reject'; error: FileCreationDraftError }
  | { type: 'publish'; path: string }
  | { type: 'unconfirmed' }
  | { type: 'refreshFailed' }
  | { type: 'refresh' }
  | { type: 'observed' }
  | { type: 'close' };

export function transitionFileCreation(
  state: FileCreationState,
  event: FileCreationEvent
): FileCreationState {
  switch (event.type) {
    case 'begin':
      return state.kind === 'closed' ? { kind: 'editing', draft: event.draft } : state;
    case 'read':
      return state.kind === 'closed' ? { kind: 'reading', draft: event.draft } : state;
    case 'decoded':
      return state.kind === 'reading'
        ? { kind: 'editing', draft: { ...state.draft, content: event.content } }
        : state;
    case 'edit':
      return state.kind === 'editing'
        ? {
            kind: 'editing',
            draft: { ...state.draft, [event.field]: event.value },
            error:
              (state.error === 'invalidText' || state.error === 'importTooLarge') &&
              event.field !== 'content'
                ? state.error
                : undefined,
          }
        : state;
    case 'save':
      return state.kind === 'editing' ? { kind: 'saving', draft: state.draft } : state;
    case 'reject':
      return state.kind === 'closed' || state.kind === 'published' || state.kind === 'unconfirmed'
        ? state
        : { kind: 'editing', draft: state.draft, error: event.error };
    case 'publish':
      return state.kind === 'saving'
        ? { kind: 'published', draft: state.draft, path: event.path }
        : state;
    case 'unconfirmed':
      return state.kind === 'saving'
        ? { kind: 'unconfirmed', draft: state.draft, error: 'receiptMismatch' }
        : state;
    case 'refreshFailed':
      return state.kind === 'published' ? { ...state, error: 'refreshFailed' } : state;
    case 'refresh':
      return state.kind === 'published' ? { ...state, error: undefined } : state;
    case 'observed':
      return state.kind === 'published' ? { kind: 'closed' } : state;
    case 'close':
      return state.kind === 'saving' || (state.kind === 'published' && !state.error)
        ? state
        : { kind: 'closed' };
  }
}

/** Relative paths remain inside the displayed root; server policy is still authoritative. */
export function resolveFileCreationPath(rootPath: string, relativePath: string): string | null {
  const root = rootPath === '.' ? '' : rootPath.replaceAll('\\', '/').replace(/\/$/, '');
  const relative = relativePath.trim().replaceAll('\\', '/');
  const path = root ? `${root}/${relative}` : relative;
  if (
    !relative ||
    /[%:]/.test(path) ||
    Array.from(path).some((character) => character.charCodeAt(0) < 32) ||
    path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  )
    return null;
  return path;
}
