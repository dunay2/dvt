/** Owned concern: render compact, accessible source-column constraint semantics. */
import { Asterisk, BadgeCheck, KeyRound, type LucideIcon } from 'lucide-react';

import type {
  SourceImportColumnConstraintMarker,
  SourceImportColumnConstraintMarkerKind,
} from './sourceImportCatalogModel';

const iconByConstraintKind: Readonly<Record<SourceImportColumnConstraintMarkerKind, LucideIcon>> = {
  'primary-key': KeyRound,
  unique: BadgeCheck,
  'not-null': Asterisk,
};

const sourceImportConstraintMarkerClassNames = {
  list: 'flex flex-wrap items-center gap-1',
  marker:
    'inline-flex items-center gap-1 rounded border border-slate-600 bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-200',
  icon: 'size-3 shrink-0',
} as const;

export function SourceImportConstraintMarkers({
  markers,
}: Readonly<{ markers: readonly SourceImportColumnConstraintMarker[] }>): JSX.Element | null {
  if (markers.length === 0) {
    return null;
  }

  return (
    <span className={sourceImportConstraintMarkerClassNames.list}>
      {markers.map((marker) => {
        const Icon = iconByConstraintKind[marker.kind];

        return (
          <span
            key={marker.kind}
            role="img"
            aria-label={marker.label}
            title={marker.label}
            data-source-import-constraint-marker={marker.kind}
            className={sourceImportConstraintMarkerClassNames.marker}
          >
            <Icon className={sourceImportConstraintMarkerClassNames.icon} aria-hidden="true" />
            <span aria-hidden="true">{marker.shortLabel}</span>
          </span>
        );
      })}
    </span>
  );
}
