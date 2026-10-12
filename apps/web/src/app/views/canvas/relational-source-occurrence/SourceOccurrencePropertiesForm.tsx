/** Coordinate the shared alias form; the caller owns pending or revision-bound persistence. */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { parseOccurrenceAlias } from './renameSourceOccurrence';
import { sourceOccurrenceCopy } from './sourceOccurrenceCopy';
import { SourceOccurrencePropertiesTemplate } from './SourceOccurrenceProperties.templates';

export function SourceOccurrencePropertiesForm({
  data,
  actions,
  output,
  onPendingChange,
}: Readonly<{
  data: Readonly<{
    relationId: string;
    alias: string;
    occupied: ReadonlySet<string>;
    supported: boolean;
  }>;
  actions: Readonly<{
    save: (alias: string) => boolean | Promise<boolean>;
    close: () => void;
  }>;
  output: ReactNode;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = sourceOccurrenceCopy(language);
  const id = useId();
  const [alias, setAlias] = useState(data.alias);
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle');
  const result = parseOccurrenceAlias(alias);
  const duplicate = result.success && data.occupied.has(result.data);
  const valid = result.success && !duplicate;
  const pending = data.supported && alias !== data.alias;
  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  const submit = async () => {
    if (!result.success || duplicate || !pending || status === 'busy') return;
    setStatus('busy');
    try {
      const accepted = await actions.save(result.data);
      setStatus(accepted ? 'idle' : 'error');
      if (accepted) setAlias(result.data);
    } catch {
      setStatus('error');
    }
  };
  return (
    <SourceOccurrencePropertiesTemplate
      data={{
        inputId: id,
        relationId: data.relationId,
        title: data.alias,
        alias,
        aliasLabel: copy.alias,
        updateLabel: copy.update,
        unsupported: data.supported ? null : copy.aliasUnsupported,
        error: !result.success
          ? copy.invalid_alias
          : duplicate
            ? copy.duplicate_alias
            : status === 'error'
              ? copy.update_failed
              : null,
        invalid: !valid,
        canSubmit: pending && valid && status !== 'busy',
      }}
      actions={{
        changeAlias: (value) => {
          setAlias(value);
          setStatus('idle');
        },
        submit: () => {
          void submit();
        },
        close: actions.close,
      }}
      output={output}
    />
  );
}
