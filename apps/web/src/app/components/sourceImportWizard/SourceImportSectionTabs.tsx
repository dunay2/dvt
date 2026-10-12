import type { ReactNode } from 'react';

import { SOURCE_IMPORT_SECTIONS } from './sourceImportWizardModel';
import { useSourceImportLocalization } from './copy';
import type { SourceImportSection } from './types';

import styles from './SourceImportWorkspace.module.css';
const sourceImportSectionTabClassNames = styles;

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
