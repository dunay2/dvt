/** Experimental field binding adapter. Does not own or mutate canonical state. */
export type FieldBinding<T> = Readonly<{
  value: T;
  onChange: (value: T) => void;
}>;

/** Bind a controlled input to an existing validated draft-update command. */
export function bindDraftField<T, K extends keyof T>(args: {
  draft: Readonly<T>;
  field: K;
  updateDraft: (patch: Pick<T, K>) => void;
}): FieldBinding<T[K]> {
  return {
    value: args.draft[args.field],
    onChange: (value) => args.updateDraft({ [args.field]: value } as Pick<T, K>),
  };
}
