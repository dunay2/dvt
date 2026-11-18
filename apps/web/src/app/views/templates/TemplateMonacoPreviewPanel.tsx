/** Owned concern: present generated-preview states and adapt ready source to the read-only Monaco viewer.
 * Why: blocked and ready presentation share one header while generation remains with the pure model.
 * Corner: a blocked preview cannot mount Monaco or retain previously generated source.
 */
import { AlertTriangle, FileCode2 } from 'lucide-react';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import type { ExecutionTemplateDefinition, ExecutionTemplatePreview } from './templatesViewModel';
import styles from './templatesPresentation.module.css';
import { templatesCopy, type TemplatesCopy } from './templatesCopy';

type TemplateMonacoPreviewPanelProps = Readonly<{
  exportFileName: string;
  language: string;
  provider: string;
  source: string;
  copy: TemplatesCopy;
}>;

function TemplatePreviewHeader({
  exportFileName,
  provider,
  copy,
}: Pick<TemplateMonacoPreviewPanelProps, 'exportFileName' | 'provider' | 'copy'>) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>
          <FileCode2 aria-hidden="true" className={styles.headerIcon} />
          {copy.generated}
        </h2>
        <p className={styles.description}>{copy.previewFor(provider)}</p>
      </div>
      <Badge variant="outline" className={styles.fileName}>
        {exportFileName}
      </Badge>
    </div>
  );
}

export function GeneratedSourcePanel({
  selectedTemplate,
  preview,
}: Readonly<{
  selectedTemplate: ExecutionTemplateDefinition;
  preview: ExecutionTemplatePreview;
}>) {
  const copy = templatesCopy(selectedTemplate.language);
  if (preview.kind === 'ready') {
    return (
      <TemplateMonacoPreviewPanel
        copy={copy}
        exportFileName={preview.exportFileName}
        language={selectedTemplate.exportFileName.endsWith('.yaml') ? 'yaml' : 'sql'}
        provider={selectedTemplate.provider}
        source={preview.source}
      />
    );
  }
  return (
    <Card data-slot="templates-preview-panel" className={styles.panel}>
      <TemplatePreviewHeader
        copy={copy}
        exportFileName={preview.exportFileName}
        provider={selectedTemplate.provider}
      />
      <div data-slot="templates-validation-state" className={styles.validationState}>
        <AlertTriangle aria-hidden="true" className={styles.errorIcon} />
        <p className={styles.helper}>{copy.complete}</p>
      </div>
    </Card>
  );
}

export function TemplateMonacoPreviewPanel({
  exportFileName,
  language,
  provider,
  source,
  copy,
}: TemplateMonacoPreviewPanelProps) {
  return (
    <Card data-slot="templates-preview-panel" className={styles.panel}>
      <TemplatePreviewHeader exportFileName={exportFileName} provider={provider} copy={copy} />
      <div data-slot="templates-generated-source-preview" className={styles.generatedSource}>
        <span data-slot="templates-generated-source-readable-preview" className="sr-only">
          {source}
        </span>
        <MonacoCodeViewer
          ariaLabel={`${copy.generated} · ${exportFileName}`}
          language={language}
          loadingLabel={`${copy.loading} ${exportFileName}`}
          path={exportFileName}
          value={source}
        />
      </div>
    </Card>
  );
}
