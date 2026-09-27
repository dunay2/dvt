/** Shared presentation tokens for typed relational connection ports. */
const portBase =
  'absolute z-20 size-5 -translate-y-1/2 rounded-full border-2 shadow-sm focus-visible:outline-2 focus-visible:outline-(--focus-ring)';

export const relationalInputPortClass = `${portBase} -left-2.5 border-(--border-strong) bg-(--surface-raised) hover:bg-(--status-info) data-[connected=true]:border-(--status-success) data-[connected=true]:bg-(--status-success)`;

export const relationalOutputPortClass = `${portBase} -right-2.5 top-1/2 border-(--surface-panel) bg-(--status-info) aria-pressed:ring-2 aria-pressed:ring-(--focus-ring)`;
