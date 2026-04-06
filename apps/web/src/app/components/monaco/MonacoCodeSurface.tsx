import Editor from '@monaco-editor/react';

import { DEFAULT_MONACO_CONTAINER_CLASS_NAME } from './MonacoViewerFallback';

type MonacoCodeSurfaceProps = Readonly<{
  ariaLabel: string;
  containerClassName?: string;
  language: string;
  path?: string;
  value: string;
}>;

export default function MonacoCodeSurface({
  ariaLabel,
  containerClassName = DEFAULT_MONACO_CONTAINER_CLASS_NAME,
  language,
  path,
  value,
}: MonacoCodeSurfaceProps) {
  return (
    <div className={containerClassName} data-testid="monaco-code-viewer">
      <Editor
        height="100%"
        language={language}
        options={{
          ariaLabel,
          automaticLayout: true,
          codeLens: false,
          contextmenu: false,
          folding: true,
          glyphMargin: false,
          lineNumbersMinChars: 3,
          minimap: { enabled: false },
          readOnly: true,
          renderLineHighlight: 'none',
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
