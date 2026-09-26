/** Compose a property section from passive, shared body templates. */
import type { ReactNode } from 'react';
import { MonacoCodeViewer } from '../monaco/MonacoCodeViewer';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import {
  inspectorPropertyClasses as styles,
  inspectorVisualClasses,
} from './inspectorVisualTokens';
import { NodePropertyFacts } from './NodePropertyFacts';
import { NodePropertyTable, type NodePropertyTableProps } from './NodePropertyTable';

export type NodePropertySectionViewProps = NodePropertyTableProps &
  Readonly<{
    slots: Readonly<{ sectionPrefix: string; code: string }>;
    showCountBadge?: boolean;
    fillAvailableHeight?: boolean;
    beforeBody?: ReactNode;
    afterBody?: ReactNode;
  }>;

function SectionBody({
  section,
  slots,
  surface,
  renderTableCell,
  beforeBody,
  afterBody,
}: NodePropertySectionViewProps): JSX.Element | null {
  if (section.code != null) {
    return (
      <div data-slot={slots.code}>
        <MonacoCodeViewer
          ariaLabel={section.label}
          language={section.codeLanguage ?? 'text'}
          loadingLabel={section.label}
          path={section.codePath}
          value={section.code}
        />
      </div>
    );
  }
  if (section.tableRows.length > 0) {
    return (
      <NodePropertyTable section={section} surface={surface} renderTableCell={renderTableCell} />
    );
  }
  if (section.rows.length > 0) return <NodePropertyFacts rows={section.rows} layout={surface} />;
  if (beforeBody != null || afterBody != null) return null;
  return (
    <p className={inspectorVisualClasses.inspectorBody}>
      {section.emptyState ?? 'No properties are recorded for this section.'}
    </p>
  );
}

export function NodePropertySectionView({
  section,
  slots,
  surface = 'inspector',
  showCountBadge = false,
  fillAvailableHeight = false,
  beforeBody,
  afterBody,
  renderTableCell,
}: NodePropertySectionViewProps): JSX.Element {
  const contribution = (placement: 'before-body' | 'after-body', content: ReactNode) =>
    content == null ? null : (
      <div
        data-slot={`${slots.sectionPrefix}-editable-properties`}
        data-placement={placement}
        className={cn(styles.contribution, fillAvailableHeight && styles.contributionFill)}
      >
        {content}
      </div>
    );
  return (
    <section
      data-slot={`${slots.sectionPrefix}-${section.id}-section`}
      className={cn(styles.section, fillAvailableHeight && styles.sectionFill)}
    >
      {surface === 'workbench' && (section.id === 'code' || section.id === 'general') ? null : (
        <div className={styles.header}>
          <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>{section.label}</h3>
          {showCountBadge && section.tableRows.length > 0 ? (
            <Badge variant="secondary" className={inspectorVisualClasses.contextPanelTabBadge}>
              {section.tableRows.length}
            </Badge>
          ) : null}
        </div>
      )}
      {section.description == null ? null : (
        <p
          data-slot={`${slots.sectionPrefix}-${section.id}-description`}
          className={inspectorVisualClasses.contextPanelSectionDescription}
        >
          {section.description}
        </p>
      )}
      {contribution('before-body', beforeBody)}
      <SectionBody
        section={section}
        slots={slots}
        surface={surface}
        renderTableCell={renderTableCell}
        beforeBody={beforeBody}
        afterBody={afterBody}
      />
      {contribution('after-body', afterBody)}
    </section>
  );
}
