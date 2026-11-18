/** Edit reusable template source and insert references through Monaco's undoable edit operation. */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  MonacoCodeEditor,
  type MonacoCodeEditorMount,
} from '../../components/monaco/MonacoCodeEditor';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import type { TemplateAuthoring } from './useTemplateAuthoring';
import type { TemplatesCopy } from './templatesCopy';
import styles from './templatesPresentation.module.css';

export type TemplateSourceHandle = { insert: (reference: string) => void };
export const TemplateSourceEditor = forwardRef<
  TemplateSourceHandle,
  { author: TemplateAuthoring; copy: TemplatesCopy }
>(function TemplateSourceEditor({ author, copy }, ref) {
  const editorRef = useRef<Parameters<MonacoCodeEditorMount>[0] | null>(null);
  useImperativeHandle(ref, () => ({
    insert(reference) {
      const editor = editorRef.current;
      const range = editor?.getSelection();
      if (!editor || !range) {
        author.setNotice(copy.choosePosition);
        return;
      }
      editor.pushUndoStop();
      editor.executeEdits('insert-project-model', [
        { range, text: reference, forceMoveMarkers: true },
      ]);
      editor.pushUndoStop();
      editor.focus();
    },
  }));
  return (
    <Card className={styles.panel}>
      <h2 className={styles.sectionTitle}>{copy.source}</h2>
      <p className={styles.helper}>{copy.editing}</p>
      <MonacoCodeEditor
        ariaLabel={copy.source}
        loadingLabel={copy.loading}
        language={author.template.exportFileName.endsWith('.yaml') ? 'yaml' : 'sql'}
        value={author.draft.source}
        onChange={(source) => author.update({ source })}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        readOnly={author.busy}
      />
      <div className={styles.actions}>
        <Input
          aria-label={copy.name}
          placeholder={copy.name}
          className={styles.control}
          value={author.draft.name}
          disabled={author.busy}
          onChange={(e) => author.update({ name: e.target.value })}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={author.busy}
          onClick={() => void author.save()}
        >
          {copy.save}
        </Button>
      </div>
    </Card>
  );
});
