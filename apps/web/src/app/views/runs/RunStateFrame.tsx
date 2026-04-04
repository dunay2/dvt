import type { ReactNode } from 'react';

interface RunStateFrameProps {
  title: string;
  children: ReactNode;
}

export function RunStateFrame({ title, children }: RunStateFrameProps) {
  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="flex h-12 items-center border-b border-slate-700 bg-slate-900 px-4">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
