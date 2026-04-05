import { useCallback, useRef, useState } from 'react';

import { parseManifest } from './manifestParser';
import type { ImportState } from './types';

export function useLocalManifestImport() {
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'loading' });

    let text: string;
    try {
      text = await file.text();
    } catch {
      setState({ status: 'error', message: `Could not read file: ${file.name}` });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setState({ status: 'error', message: `${file.name} is not valid JSON.` });
      return;
    }

    const result = parseManifest(parsed);
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }

    setState({ status: 'success', fileName: file.name, result: result.result });
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      event.target.value = '';
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  const clear = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    state,
    fileInputRef,
    openFilePicker,
    handleInputChange,
    handleDrop,
    handleDragOver,
    clear,
  };
}
