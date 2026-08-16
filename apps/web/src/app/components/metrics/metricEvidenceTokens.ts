/** Owned concern: define reusable visual tokens for metric evidence hotspots. */
export const metricEvidenceHotspotClasses = {
  trigger:
    'cursor-help rounded-sm underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
  interactive: 'cursor-pointer',
  tone: {
    neutral: 'text-slate-200 decoration-slate-500/70',
    measured: 'text-green-300 decoration-green-500/70',
    estimated: 'text-amber-200 decoration-amber-500/70',
  },
  content:
    'max-w-80 border border-slate-700 bg-slate-950 px-3 py-2 text-left text-[11px] leading-4 text-slate-100 shadow-xl shadow-slate-950/40',
} as const;
