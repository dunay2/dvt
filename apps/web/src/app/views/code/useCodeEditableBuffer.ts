/** Owned concern: hold route-local Code editor text keyed by workspace file path. */
import { useCallback, useState } from 'react';

type CodeEditableBufferFile = {
  readonly path: string;
  readonly content: string;
};

type CodeEditableBuffer = {
  readonly value: string;
  readonly updateValue: (value: string) => void;
};

export function useCodeEditableBuffer(
  file: CodeEditableBufferFile | undefined
): CodeEditableBuffer {
  const [buffersByPath, setBuffersByPath] = useState<Record<string, string>>({});
  const value = file ? (buffersByPath[file.path] ?? file.content) : '';

  const updateValue = useCallback(
    (nextValue: string) => {
      if (!file) {
        return;
      }

      setBuffersByPath((currentBuffers) => ({
        ...currentBuffers,
        [file.path]: nextValue,
      }));
    },
    [file]
  );

  return { value, updateValue };
}
