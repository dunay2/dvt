/** Owned concern: model the state machine for one dbt YAML description transaction. */
import type {
  DbtYamlDescriptionAppliedReceipt,
  DbtYamlDescriptionEditProposal,
} from '@dvt/contracts';

export type DbtYamlDescriptionEditorPhase =
  | 'editing'
  | 'proposing'
  | 'reviewing'
  | 'applying'
  | 'applied'
  | 'reverting'
  | 'reverted'
  | 'conflict'
  | 'reloading';

export type DbtYamlDescriptionEditorState = Readonly<{
  phase: DbtYamlDescriptionEditorPhase;
  baselineDescription: string | null;
  draft: string;
  proposal: DbtYamlDescriptionEditProposal | null;
  appliedReceipt: DbtYamlDescriptionAppliedReceipt | null;
  failureMessage: string | null;
  refreshFailureMessage: string | null;
}>;

export function createDbtYamlDescriptionEditorState(
  description: string | null
): DbtYamlDescriptionEditorState {
  return {
    phase: 'editing',
    baselineDescription: description,
    draft: description ?? '',
    proposal: null,
    appliedReceipt: null,
    failureMessage: null,
    refreshFailureMessage: null,
  };
}

export function normalizeDbtYamlDescriptionDraft(value: string): string | null {
  return value.length === 0 ? null : value;
}

export function hasDbtYamlDescriptionChanges(state: DbtYamlDescriptionEditorState): boolean {
  return (
    state.draft !== state.baselineDescription &&
    normalizeDbtYamlDescriptionDraft(state.draft) !== state.baselineDescription
  );
}

export function isDbtYamlDescriptionEditorBusy(state: DbtYamlDescriptionEditorState): boolean {
  return ['proposing', 'applying', 'reverting', 'reloading'].includes(state.phase);
}
