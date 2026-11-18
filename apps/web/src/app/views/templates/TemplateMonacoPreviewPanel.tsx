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

type TemplateMonacoPreviewPanelProps = Readonly<{
  exportFileName: string;
  language: string;
  provider: string;
  source: string;
}>;

function TemplatePreviewHeader({
  exportFileName,
  provider,
}: Pick<TemplateMonacoPreviewPanelProps, 'exportFileName' | 'provider'>) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>
          <FileCode2 aria-hidden="true" className={styles.headerIcon} />
          Generated preview
        </h2>
        <p className={styles.description}>Read-only source preview for {provider} export review.</p>
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
  if (preview.kind === 'ready') {
    return (
      <TemplateMonacoPreviewPanel
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
        exportFileName={preview.exportFileName}
        provider={selectedTemplate.provider}
      />
      <div data-slot="templates-validation-state" className={styles.validationState}>
        <AlertTriangle aria-hidden="true" className={styles.errorIcon} />
        <p className={styles.helper}>
          Complete the required parameters before generated source is shown.
        </p>
      </div>
    </Card>
  );
}

export function TemplateMonacoPreviewPanel({
  exportFileName,
  language,
  provider,
  source,
}: TemplateMonacoPreviewPanelProps) {
  return (
    <Card data-slot="templates-preview-panel" className={styles.panel}>
      <TemplatePreviewHeader exportFileName={exportFileName} provider={provider} />
      <div data-slot="templates-generated-source-preview" className={styles.generatedSource}>
        <span data-slot="templates-generated-source-readable-preview" className="sr-only">
          {source}
        </span>
        <MonacoCodeViewer
          ariaLabel={`Generated ${provider} preview: ${exportFileName}`}
          language={language}
          loadingLabel={`Loading ${exportFileName} preview...`}
          path={exportFileName}
          value={source}
        />
      </div>
    </Card>
  );
}
