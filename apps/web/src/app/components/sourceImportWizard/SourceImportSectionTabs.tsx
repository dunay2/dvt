import type { ReactNode } from 'react';

import { SOURCE_IMPORT_SECTIONS } from './sourceImportWizardModel';
import { useSourceImportLocalization } from './copy';
import type { SourceImportSection } from './types';

const sourceImportSectionTabClassNames = {
  list: 'mb-4 grid grid-cols-4 overflow-hidden rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)]',
  tabBase:
    'border-r border-[color:var(--border-default)] px-3 py-2 text-center text-xs font-medium transition-colors last:border-r-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]',
  tabActive: 'bg-[var(--surface-selected)] text-[var(--text-strong)]',
  tabInactive:
    'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]',
} as const;

type SourceImportSectionTabsProps = Readonly<{
  activeSection: SourceImportSection;
  canEnterSection: (section: SourceImportSection) => boolean;
  onSectionChange: (section: SourceImportSection) => void;
}>;

type SourceImportSectionTabListProps = Readonly<{
  children: ReactNode;
}>;

function SourceImportSectionTabList({ children }: SourceImportSectionTabListProps): JSX.Element {
  const { copy } = useSourceImportLocalization();

  return (
    <div
      role="tablist"
      aria-label={copy.sections.ariaLabel}
      className={sourceImportSectionTabClassNames.list}
    >
      {children}
    </div>
  );
}

type SourceImportSectionTabProps = Readonly<{
  id: SourceImportSection;
  isActive: boolean;
  disabled: boolean;
  label: string;
  onSelect: (section: SourceImportSection) => void;
}>;

function SourceImportSectionTab({
  id,
  isActive,
  disabled,
  label,
  onSelect,
}: SourceImportSectionTabProps): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`source-import-section-${id}`}
      disabled={disabled}
      data-slot="source-import-section-tab"
      className={[
        sourceImportSectionTabClassNames.tabBase,
        isActive
          ? sourceImportSectionTabClassNames.tabActive
          : sourceImportSectionTabClassNames.tabInactive,
      ].join(' ')}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

export function SourceImportSectionTabs({
  activeSection,
  canEnterSection,
  onSectionChange,
}: SourceImportSectionTabsProps) {
  const { copy } = useSourceImportLocalization();

  return (
    <SourceImportSectionTabList>
      {SOURCE_IMPORT_SECTIONS.map((section) => {
        const isActive = section.id === activeSection;
        const disabled = !canEnterSection(section.id);

        return (
          <SourceImportSectionTab
            key={section.id}
            id={section.id}
            label={copy.sections[section.id]}
            isActive={isActive}
            disabled={disabled}
            onSelect={onSectionChange}
          />
        );
      })}
    </SourceImportSectionTabList>
  );
}
