/**
 * Owned concern: project file-query and retained-buffer evidence into one editor presentation.
 * @decision Model the visible surface explicitly; only a pending buffer for this path retains an error.
 * @consequence Rendering cannot discard recoverable edits or hide their synchronization phase.
 */
import type { FileContent } from '../../ports/workspace';
import type { CodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';
import type { useCodeWorkingTreeSync } from './useCodeWorkingTreeSync';
import type { CodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';

type WorkingTreePhase = ReturnType<typeof useCodeWorkingTreeSync>['phase'];

type PresentationInput = Readonly<{
  path: string | undefined;
  file: FileContent | undefined;
  isPending: boolean;
  error: CodeWorkbenchErrorPresentation | null;
  navigationBlocked: boolean;
  posture: CodeWorkspaceFileEditPosture;
  phase: WorkingTreePhase;
}>;

export type WorkspaceFileEditorPresentation = Readonly<{
  surface:
    | Readonly<{ kind: 'loading' | 'empty' }>
    | Readonly<{ kind: 'error'; error: CodeWorkbenchErrorPresentation }>
    | Readonly<{ kind: 'file'; file: FileContent; retainedError?: CodeWorkbenchErrorPresentation }>;
  statusPhase: WorkingTreePhase | undefined;
  inlineMessagePlacement: 'status-band' | 'separate';
}>;

function resolveSurface(input: PresentationInput): WorkspaceFileEditorPresentation['surface'] {
  if (input.isPending) return { kind: 'loading' };
  const retainsPendingBuffer = input.file?.path === input.path && input.navigationBlocked;
  if (input.error && !retainsPendingBuffer) return { kind: 'error', error: input.error };
  if (!input.file) return { kind: 'empty' };
  return { kind: 'file', file: input.file, retainedError: input.error ?? undefined };
}

function resolveStatusPhase(
  { posture, phase }: PresentationInput,
  readOnlyBand: boolean
): WorkspaceFileEditorPresentation['statusPhase'] {
  if (posture.kind === 'graph_owned_read_only') return undefined;
  if (readOnlyBand) return 'read_only';
  return phase;
}

/** This read model owns no query, persistence, authoring authority or execution readiness. */
export function resolveWorkspaceFileEditorPresentation(
  input: PresentationInput
): WorkspaceFileEditorPresentation {
  const readOnlyBand =
    input.posture.kind !== 'editable' &&
    input.posture.kind !== 'graph_owned_read_only' &&
    input.phase === 'synchronized';
  return {
    surface: resolveSurface(input),
    statusPhase: resolveStatusPhase(input, readOnlyBand),
    inlineMessagePlacement: readOnlyBand ? 'status-band' : 'separate',
  };
}
