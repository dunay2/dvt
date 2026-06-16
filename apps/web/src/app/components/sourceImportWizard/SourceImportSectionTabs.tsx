import { SOURCE_IMPORT_SECTIONS } from './sourceImportWizardModel';
import type { SourceImportSection } from './types';

type SourceImportSectionTabsProps = Readonly<{
  activeSection: SourceImportSection;
  canEnterSection: (section: SourceImportSection) => boolean;
  onSectionChange: (section: SourceImportSection) => void;
}>;

export function SourceImportSectionTabs({
  activeSection,
  canEnterSection,
  onSectionChange,
}: SourceImportSectionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Add source sections"
      className="mb-4 grid grid-cols-4 overflow-hidden rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)]"
    >
      {SOURCE_IMPORT_SECTIONS.map((section) => {
        const isActive = section.id === activeSection;
        const disabled = !canEnterSection(section.id);

        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`source-import-section-${section.id}`}
            disabled={disabled}
            className={`border-r border-[color:var(--border-default)] px-3 py-2 text-center text-xs font-medium transition-colors last:border-r-0 ${
              isActive
                ? 'bg-[var(--surface-selected)] text-[var(--text-strong)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]'
            } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]`}
            onClick={() => onSectionChange(section.id)}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
