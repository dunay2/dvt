/** Owned concern: bind Monaco Editor as the shared code surface for viewer and local editor modes. */
import Editor from '@monaco-editor/react';

import { DEFAULT_MONACO_CONTAINER_CLASS_NAME } from './MonacoViewerFallback';

type MonacoCodeSurfaceProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  onChange?: (value: string) => void;
  path?: string;
  readOnly?: boolean;
  value: string;
}>;

export default function MonacoCodeSurface({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  onChange,
  path,
  readOnly = true,
  value,
}: MonacoCodeSurfaceProps) {
  const isReadOnly = readOnly;

  return (
    <div
      className={containerClassName}
      data-testid={isReadOnly ? 'monaco-code-viewer' : 'monaco-code-editor'}
    >
      <Editor
        height="100%"
        language={language}
        onChange={
          isReadOnly
            ? undefined
            : (nextValue) => {
                onChange?.(nextValue ?? '');
              }
        }
        options={{
          ariaLabel,
          automaticLayout: true,
          codeLens: false,
          contextmenu: isReadOnly ? false : true,
          folding: true,
          glyphMargin: false,
          lineNumbersMinChars: 3,
          minimap: { enabled: false },
          domReadOnly: isReadOnly ? true : false,
          readOnly: isReadOnly ? true : false,
          renderLineHighlight: isReadOnly ? 'none' : 'line',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: 'on',
        }}
        path={path}
        theme="vs-dark"
        value={value}
      />
    </div>
  );
}
