/** Owned concern: adapt editable control text to typed overrides and display the contract's validation. */
import {
  getRunParameterDefault,
  resolveRunParameters,
  type RunParameterDefinition,
  type RunParameterOverride,
} from '@dvt/contracts';

export type ParameterDraft = Readonly<{ enabled?: boolean; text?: string }>;
export type ParameterDrafts = Readonly<Record<string, ParameterDraft>>;

export function initialParameterDrafts(overrides: RunParameterOverride[]): ParameterDrafts {
  return Object.fromEntries(
    overrides.map(({ name, enabled, value }) => [
      name,
      { enabled, text: value === undefined ? undefined : String(value) },
    ])
  );
}

function parseInput(type: RunParameterDefinition['type'], text: string) {
  if (!text.length) return undefined;
  if (type === 'boolean') return text === 'true';
  if (type === 'integer') return /^-?\d+$/u.test(text) ? Number(text) : NaN;
  return text;
}

export function readParameterInput(
  def: RunParameterDefinition,
  env: string,
  draft: ParameterDraft = {}
) {
  const baseline = getRunParameterDefault(def, env);
  const initialEnabled = def.enabledBy ? Boolean(def.enabledByDefault) : true;
  const enabled = draft.enabled ?? initialEnabled;
  const text = draft.text ?? String(baseline.value ?? '');
  const value = parseInput(def.type, text);
  const changedValue = enabled && draft.text !== undefined && value !== baseline.value;
  const override: RunParameterOverride = {
    name: def.name,
    ...(enabled !== initialEnabled ? { enabled } : {}),
    ...(changedValue && value !== undefined ? { value } : {}),
  };
  const overrides = Object.keys(override).length > 1 ? [override] : [];
  try {
    if (enabled && !text.length && baseline.value !== undefined && draft.text !== undefined)
      return { text, enabled, overrides, valid: false, source: 'run' as const };
    const [resolved] = resolveRunParameters([def], overrides, env);
    return { text, enabled, overrides, valid: true, source: resolved!.source };
  } catch {
    return {
      text,
      enabled,
      overrides,
      valid: false,
      source: draft.text === undefined ? baseline.source : ('run' as const),
    };
  }
}
