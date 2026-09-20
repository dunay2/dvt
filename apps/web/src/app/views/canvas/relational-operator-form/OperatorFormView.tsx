/** Owned concern: operator form presentation, errors and explicit actions. */
import type { CanvasRelationalOperatorTool } from '../canvasRelationalTreeOperatorModel';
import type { OperatorFormModel } from './useOperatorForm';
import { OperatorFormFields } from './OperatorFormFields';

export function OperatorFormView({
  tool,
  form,
  inline,
}: Readonly<{
  tool: CanvasRelationalOperatorTool;
  form: OperatorFormModel;
  inline: boolean;
}>): JSX.Element {
  const { copy } = form;
  return (
    <form
      data-slot={inline ? 'canvas-relational-operator-form' : undefined}
      className="space-y-4 text-sm [&_input]:mt-1 [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:border-(--border-subtle) [&_input]:bg-(--surface-panel) [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-(--text-strong) [&_select]:mt-1 [&_select]:w-full [&_select]:rounded [&_select]:border [&_select]:border-(--border-subtle) [&_select]:bg-(--surface-panel) [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-(--text-strong)"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <OperatorFormFields tool={tool} form={form} />
      {form.error ? (
        <p role="alert" className="text-amber-400">
          {copy.invalid}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {tool.active ? (
          <button
            type="button"
            className="mr-auto rounded px-3 py-2 text-rose-400 hover:bg-rose-950"
            onClick={form.remove}
          >
            {copy.remove}
          </button>
        ) : null}
        <button
          type="button"
          className="rounded border border-(--border-subtle) px-3 py-2"
          onClick={form.cancel}
        >
          {copy.cancel}
        </button>
        <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">
          {copy.done}
        </button>
      </div>
    </form>
  );
}
