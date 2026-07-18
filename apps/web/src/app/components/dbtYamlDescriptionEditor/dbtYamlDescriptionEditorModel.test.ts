import { describe, expect, it } from 'vitest';

import {
  createDbtYamlDescriptionEditorState,
  hasDbtYamlDescriptionChanges,
  isDbtYamlDescriptionEditorBusy,
  normalizeDbtYamlDescriptionDraft,
} from './dbtYamlDescriptionEditorModel';

describe('dbtYamlDescriptionEditorModel', () => {
  it('treats an empty draft as an absent YAML description without trimming authored content', () => {
    expect(normalizeDbtYamlDescriptionDraft('')).toBeNull();
    expect(normalizeDbtYamlDescriptionDraft('  documented grain  ')).toBe('  documented grain  ');
  });

  it('detects changes against the exact analyzed baseline', () => {
    const state = createDbtYamlDescriptionEditorState(null);

    expect(hasDbtYamlDescriptionChanges(state)).toBe(false);
    expect(hasDbtYamlDescriptionChanges({ ...state, draft: 'Order grain.' })).toBe(true);
  });

  it('identifies only asynchronous command phases as busy', () => {
    const state = createDbtYamlDescriptionEditorState('Current description.');

    expect(isDbtYamlDescriptionEditorBusy({ ...state, phase: 'reviewing' })).toBe(false);
    expect(isDbtYamlDescriptionEditorBusy({ ...state, phase: 'proposing' })).toBe(true);
    expect(isDbtYamlDescriptionEditorBusy({ ...state, phase: 'applying' })).toBe(true);
    expect(isDbtYamlDescriptionEditorBusy({ ...state, phase: 'reverting' })).toBe(true);
    expect(isDbtYamlDescriptionEditorBusy({ ...state, phase: 'reloading' })).toBe(true);
  });
});
