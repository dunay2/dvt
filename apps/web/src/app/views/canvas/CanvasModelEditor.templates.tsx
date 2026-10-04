/** Passive layout: semantic canvas above the compact session footer. */
import type { ReactNode } from 'react';

export function CanvasModelEditorTemplate({
  label,
  footer,
  editor,
  guards,
}: Readonly<{
  label: string;
  footer: ReactNode;
  editor: ReactNode;
  guards: ReactNode;
}>) {
  return (
    <section
      data-slot="canvas-model-editor"
      aria-label={label}
      tabIndex={-1}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--surface-app) text-(--text-default)"
    >
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{editor}</div>
      {guards}
      {footer}
    </section>
  );
}
