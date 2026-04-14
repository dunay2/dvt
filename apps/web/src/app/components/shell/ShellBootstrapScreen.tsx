import { LoaderCircle } from 'lucide-react';

import AppBrandMark from '../AppBrandMark';
import { resolveShellBootstrapCopy } from './copy';

export default function ShellBootstrapScreen() {
  const copy = resolveShellBootstrapCopy();

  return (
    <div
      data-slot="shell-bootstrap-screen"
      className="app-shell-background flex min-h-screen w-full items-center justify-center px-6 py-10 text-[var(--text-default)]"
    >
      <div className="w-full max-w-xl rounded-2xl border border-[color:var(--border-default)] bg-[var(--surface-shell)] p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <AppBrandMark className="size-7 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-subtle)]">
              Raven
            </p>
            <h1 className="text-2xl font-semibold text-[var(--text-strong)]">{copy.title}</h1>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[color:var(--border-default)] bg-[var(--surface-app)] px-4 py-4">
          <div
            data-slot="shell-bootstrap-progress"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-strong)]"
          >
            <LoaderCircle className="size-4 animate-spin text-[var(--text-subtle)]" />
            <span>{copy.progressLabel}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-default)]">{copy.message}</p>
        </div>
      </div>
    </div>
  );
}
