/**
 * Owned concern: render one file-editor presentation using existing UI components and tokens.
 * @decision Accept resolved states and callbacks; query, recovery and execution lifetimes stay outside.
 * @consequence Layout changes cannot authorize writes or replace the retained working-tree session.
 */
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../components/ui/utils';
import { Button } from '../../components/ui/button';
import { routeWorkbenchPanelHeaderClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { CodePreviewEmptyStateView, CodePreviewErrorStateView } from './CodeStateViews';
import { CodeWorkingTreeNavigationGuard } from './CodeWorkingTreeNavigationGuard';
import { CodeWorkingTreeStatus } from './CodeWorkingTreeStatus';
import { CodeWorkspaceFileSurface } from './CodeWorkspaceFileSurface';
import { CodeReferenceDetails } from './CodeReferenceDetails';
import type { CodeViewCopy } from './codeViewCopy';
import type { WorkspaceFileEditorPresentation } from './workspaceFileEditorPresentation';
import styles from './WorkspaceFileCodeEditor.module.css';

type ViewProps = Readonly<{
  path: string | undefined;
  className?: string;
  fillAvailableSpace: boolean;
  headerActions?: ReactNode;
  executionCommands?: ReactNode;
  copy: CodeViewCopy;
  surface: WorkspaceFileEditorPresentation['surface'];
  editor: Omit<
    ComponentProps<typeof CodeWorkspaceFileSurface>,
    'file' | 'ariaLabel' | 'loadingLabel' | 'fillAvailableSpace'
  >;
  navigation: ComponentProps<typeof CodeWorkingTreeNavigationGuard>;
  analysisAction?: Readonly<{ label: string; enabled: boolean; onAnalyze: () => void }>;
  status?: ComponentProps<typeof CodeWorkingTreeStatus>;
  message?: string;
  details?: Omit<ComponentProps<typeof CodeReferenceDetails>, 'overlay'>;
}>;

export function WorkspaceFileCodeEditorView(props: ViewProps) {
  const { surface } = props;
  return (
    <div
      className={cn(styles.editor, props.className)}
      data-file-path={props.path}
      data-slot="workspace-file-code-editor"
    >
      <CodeWorkingTreeNavigationGuard {...props.navigation} />
      <div className={routeWorkbenchPanelHeaderClassName}>
        <code className={styles.path}>{props.path}</code>
        {props.analysisAction ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-slot="code-analyze-references"
            disabled={!props.analysisAction.enabled}
            onClick={props.analysisAction.onAnalyze}
          >
            {props.analysisAction.label}
          </Button>
        ) : null}
        {props.headerActions}
      </div>
      {props.executionCommands}
      {props.message == null ? null : (
        <p role="status" className={styles.message}>
          {props.message}
        </p>
      )}
      {props.status ? <CodeWorkingTreeStatus {...props.status} /> : null}
      {surface.kind === 'file' && surface.retainedError ? (
        <CodePreviewErrorStateView error={surface.retainedError} />
      ) : null}
      <div className={cn(styles.surface, props.fillAvailableSpace && styles.fill)}>
        <EditorContent
          surface={surface}
          editor={props.editor}
          copy={props.copy}
          fillAvailableSpace={props.fillAvailableSpace}
        />
      </div>
      {props.details ? <CodeReferenceDetails overlay {...props.details} /> : null}
    </div>
  );
}

function EditorContent({
  surface,
  editor,
  copy,
  fillAvailableSpace,
}: Pick<ViewProps, 'surface' | 'editor' | 'copy' | 'fillAvailableSpace'>) {
  switch (surface.kind) {
    case 'loading':
      return <div className={styles.loading}>{copy.previewLoadingMessage}</div>;
    case 'error':
      return <CodePreviewErrorStateView error={surface.error} />;
    case 'empty':
      return <CodePreviewEmptyStateView />;
    case 'file':
      return (
        <CodeWorkspaceFileSurface
          {...editor}
          file={surface.file}
          fillAvailableSpace={fillAvailableSpace}
          loadingLabel={copy.editorLoadingMessage}
          ariaLabel={`${editor.posture.kind === 'editable' ? copy.editorAriaLabelPrefix : copy.viewerAriaLabelPrefix} ${surface.file.name}`}
        />
      );
  }
}
