import { useEffect, useId, useRef } from 'react';

import type { RenameWarehouseConnectionInput } from '../../ports/workspace';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useSourceImportLocalization } from './copy';

interface WarehouseConnectionRenameFormProps {
  currentName: string;
  form: RenameWarehouseConnectionInput;
  isRenaming: boolean;
  error: string | null;
  onNameChange: (name: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function WarehouseConnectionRenameForm({
  currentName,
  form,
  isRenaming,
  error,
  onNameChange,
  onCancel,
  onSubmit,
}: WarehouseConnectionRenameFormProps) {
  const { copy } = useSourceImportLocalization();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorId = useId();
  const normalizedName = form.name.trim();
  const canSubmit = normalizedName.length > 0 && normalizedName !== currentName.trim();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <Card className="border-slate-700 bg-slate-950/50 p-4">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        <h4 className="text-sm font-medium text-slate-100">{copy.connection.renameTitle}</h4>

        {error ? (
          <div
            id={errorId}
            data-slot="source-import-rename-connection-error"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="rounded-md border border-red-700 bg-red-950/30 px-3 py-2 text-sm text-red-100"
          >
            {error}
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-300">
            {copy.connection.renameNameLabel}
          </span>
          <input
            ref={inputRef}
            data-slot="source-import-rename-connection-name"
            aria-label={copy.connection.renameNameLabel}
            aria-invalid={error ? true : undefined}
            aria-errormessage={error ? errorId : undefined}
            value={form.name}
            disabled={isRenaming}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            onInput={(event) => onNameChange(event.currentTarget.value)}
            onChange={(event) => onNameChange(event.currentTarget.value)}
          />
        </label>

        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:ml-auto sm:w-auto sm:grid-cols-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full min-w-0"
            disabled={isRenaming}
            onClick={onCancel}
          >
            {copy.connection.renameCancelAction}
          </Button>
          <Button
            type="submit"
            size="sm"
            className="w-full min-w-0 bg-blue-700 text-white hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-300 disabled:opacity-100"
            disabled={!canSubmit || isRenaming}
          >
            {isRenaming ? copy.connection.renamingAction : copy.connection.renameSubmitAction}
          </Button>
        </div>
      </form>
    </Card>
  );
}
