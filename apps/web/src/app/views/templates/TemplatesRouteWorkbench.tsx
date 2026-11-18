/** Owned concern: render Templates route slots for the selected project recipe.
 * Generated SQL, project file writes and model references each have their own authority.
 */
import { FilePlus2, Pencil, Eye } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../../components/ui/button';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import { FileCreationDialog } from '../code/FileCreationDialog';
import { resolveCodeFileCreationCopy } from '../code/codeViewCopy';
import { resolveDbtProjectWorkspaceFilePath } from '../code/codeViewFileSelection';
import { useWorkspaceFileCreation } from '../code/useWorkspaceFileCreation';
import { resolveExecutionTemplatePreview } from './templatesViewModel';
import { GeneratedSourcePanel } from './TemplateMonacoPreviewPanel';
import { acceptsProjectModel } from './templateParameters';
import { templatesCopy } from './templatesCopy';
import { TemplateParameterForm } from './TemplateParameterForm';
import { TemplateLibrary } from './TemplateLibrary';
import { TemplateModelPicker } from './TemplateModelPicker';
import { TemplateSourceEditor, type TemplateSourceHandle } from './TemplateSourceEditor';
import { useTemplateAuthoring } from './useTemplateAuthoring';
import { useTemplateProjectModels } from './useTemplateProjectModels';
import styles from './templatesPresentation.module.css';

export function TemplatesRouteWorkbench({
  scope,
  language,
}: {
  scope: WorkspaceScope;
  language: ApplicationLanguage;
}) {
  const copy = templatesCopy(language);
  const author = useTemplateAuthoring(scope, language, copy);
  const project = useTemplateProjectModels(
    [scope.tenantId, scope.projectId, scope.environmentId].join('::')
  );
  const create = useWorkspaceFileCreation('.', scope, (path) =>
    author.setNotice(copy.newFile + ' · ' + path)
  );
  const editor = useRef<TemplateSourceHandle>(null);
  const fieldTarget = useRef<{ recipe: string; field: string } | null>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const preview = resolveExecutionTemplatePreview(
    author.template,
    author.draft.values,
    author.draft.source
  );
  function insert(reference: string) {
    if (author.busy) return;
    if (author.edit && editor.current) editor.current.insert(reference);
    else {
      const active = fieldTarget.current;
      const field =
        active?.recipe === author.selected
          ? active.field
          : author.template.parameters.find(acceptsProjectModel)?.id;
      if (field) author.parameter(field, reference);
      else {
        author.setNotice(copy.choosePosition);
        author.setEdit(true);
      }
    }
  }
  function createOutput() {
    if (preview.kind !== 'ready') return;
    const folder = author.template.category === 'model' ? 'models' : 'operations';
    if (author.template.referenceStyle === 'dbt' && !project.projectRoot) {
      create.begin({ path: '', content: preview.source });
      return;
    }
    const root = author.template.referenceStyle === 'dbt' ? project.projectRoot! : '.';
    create.begin({
      path: resolveDbtProjectWorkspaceFilePath(root, folder + '/' + preview.exportFileName),
      content: preview.source,
    });
  }
  return (
    <div data-slot="templates-workbench" className={styles.workbench}>
      <TemplateLibrary
        copy={copy}
        language={language}
        selected={author.selected}
        paths={author.paths}
        onSelect={(id) => void author.select(id)}
      >
        <TemplateModelPicker
          copy={copy}
          models={project.models}
          referenceStyle={author.template.referenceStyle}
          onInsert={insert}
          onInspectModel={() => void author.select('inspect-relation')}
          loading={project.loading}
          unavailable={project.unavailable || author.unavailable}
        />
      </TemplateLibrary>
      <div className={styles.content}>
        <TemplateParameterForm
          selectedTemplate={author.template}
          parameterValues={author.draft.values}
          onParameterChange={author.parameter}
          preview={preview}
          onRelationFocus={(field) => {
            fieldTarget.current = { recipe: author.selected, field };
          }}
        />
        <div className={styles.output}>
          <div className={styles.actions}>
            <Button
              size="sm"
              variant="outline"
              disabled={author.busy}
              onClick={() => author.setEdit(!author.edit)}
            >
              {author.edit ? <Eye /> : <Pencil />}
              {author.edit ? copy.preview : copy.edit}
            </Button>
            <Button
              size="sm"
              ref={exportButton}
              disabled={author.busy || preview.kind !== 'ready'}
              onClick={createOutput}
            >
              <FilePlus2 />
              {copy.create}
            </Button>
          </div>
          {(author.notice || author.busy) && (
            <p role="status" className={styles.helper}>
              {author.notice || copy.loading}
            </p>
          )}
          {author.edit ? (
            <TemplateSourceEditor key={author.selected} ref={editor} author={author} copy={copy} />
          ) : (
            <GeneratedSourcePanel selectedTemplate={author.template} preview={preview} />
          )}
          {preview.errors
            .filter((e) => e.parameterId === 'source')
            .map((e) => (
              <p role="alert" key={e.parameterId} className={styles.fieldError}>
                {e.message}
              </p>
            ))}
        </div>
      </div>
      <FileCreationDialog
        controller={create}
        copy={resolveCodeFileCreationCopy(language)}
        onReturnFocus={() => exportButton.current?.focus()}
      />
    </div>
  );
}
