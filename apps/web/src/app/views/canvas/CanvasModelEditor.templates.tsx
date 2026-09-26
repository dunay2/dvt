/** Passive layout only; the coordinator owns navigation, authoring and output queries. */
import type { ReactNode } from 'react';

export function CanvasModelEditorTemplate({
  label,
  toolbar,
  editor,
  guards,
}: Readonly<{
  label: string;
  toolbar: ReactNode;
  editor: ReactNode;
  guards: ReactNode;
}>) {
  return (
    <section
      data-slot="canvas-model-editor"
      aria-label={label}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--surface-app) text-(--text-default)"
    >
      {toolbar}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{editor}</div>
      {guards}
    </section>
  );
}
