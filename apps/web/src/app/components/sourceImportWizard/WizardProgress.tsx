import type { WizardStep } from './types';

interface WizardProgressProps {
  currentStep: WizardStep;
}

type SourceImportSection = Readonly<{
  id: 'connections' | 'browse' | 'metadata' | 'selected';
  label: 'Connections' | 'Browse' | 'Metadata' | 'Selected';
  steps: readonly WizardStep[];
}>;

const SOURCE_IMPORT_SECTIONS: readonly SourceImportSection[] = [
  {
    id: 'connections',
    label: 'Connections',
    steps: ['sourceType', 'connection'],
  },
  {
    id: 'browse',
    label: 'Browse',
    steps: ['selection'],
  },
  {
    id: 'metadata',
    label: 'Metadata',
    steps: ['grouping', 'options'],
  },
  {
    id: 'selected',
    label: 'Selected',
    steps: ['review', 'result'],
  },
];

function resolveActiveSectionIndex(currentStep: WizardStep): number {
  const activeIndex = SOURCE_IMPORT_SECTIONS.findIndex((section) =>
    section.steps.includes(currentStep)
  );

  return activeIndex === -1 ? 0 : activeIndex;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const activeSectionIndex = resolveActiveSectionIndex(currentStep);

  return (
    <div
      aria-label="Add source workflow sections"
      className="mb-4 grid grid-cols-4 overflow-hidden rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)]"
    >
      {SOURCE_IMPORT_SECTIONS.map((section, index) => {
        const isActive = index === activeSectionIndex;
        const isComplete = index < activeSectionIndex;

        return (
          <div
            key={section.id}
            data-source-import-section={section.id}
            aria-current={isActive ? 'step' : undefined}
            className={`border-r border-[color:var(--border-default)] px-3 py-2 text-center text-xs font-medium last:border-r-0 ${
              isActive
                ? 'bg-[var(--surface-selected)] text-[var(--text-strong)]'
                : isComplete
                  ? 'text-[var(--text-strong)]'
                  : 'text-[var(--text-muted)]'
            }`}
          >
            {section.label}
          </div>
        );
      })}
    </div>
  );
}
