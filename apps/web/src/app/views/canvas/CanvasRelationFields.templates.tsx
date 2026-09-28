/** Render an already projected output schema without querying or interpreting relations. */
export function CanvasRelationFieldsTemplate({
  fields,
  loading,
  error,
  label,
}: Readonly<{
  fields: readonly Readonly<{ id: string; name: string; type: string | undefined }>[];
  loading: boolean;
  error: string | null;
  label: string;
}>): JSX.Element {
  return (
    <section
      data-slot="canvas-relation-fields"
      className="space-y-2"
      aria-busy={loading}
      aria-label={label}
    >
      {error == null ? (
        <dl className="text-xs">
          {fields.map((field) => (
            <div
              key={field.id}
              data-field-id={field.id}
              className="flex justify-between gap-3 border-b border-(--border-subtle) py-2"
            >
              <dt className="truncate">{field.name}</dt>
              <dd className="text-(--text-muted)">{field.type}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="alert" className="text-xs text-amber-300">
          {error}
        </p>
      )}
    </section>
  );
}
