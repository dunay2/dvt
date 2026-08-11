import {
  SUPPORTED_WAREHOUSE_CONNECTION_TYPES,
  type CreateWarehouseConnectionInput,
} from '../../ports/workspace';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useSourceImportLocalization } from './copy';

interface WarehouseConnectionCreateFormProps {
  form: CreateWarehouseConnectionInput;
  isCreating: boolean;
  error: string | null;
  onFieldChange: <Field extends keyof CreateWarehouseConnectionInput>(
    field: Field,
    value: CreateWarehouseConnectionInput[Field]
  ) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function WarehouseConnectionCreateForm({
  form,
  isCreating,
  error,
  onFieldChange,
  onCancel,
  onSubmit,
}: WarehouseConnectionCreateFormProps) {
  const { copy } = useSourceImportLocalization();

  return (
    <Card className="border-slate-700 bg-slate-950/50 p-4">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <h4 className="text-sm font-medium text-slate-100">{copy.connection.createTitle}</h4>
          <p className="mt-1 text-xs text-slate-400">{copy.connection.createDescription}</p>
        </div>

        {error ? (
          <div className="rounded-md border border-red-700 bg-red-950/30 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-300">
            {copy.connection.createNameLabel}
          </span>
          <input
            data-slot="source-import-create-connection-name"
            aria-label={copy.connection.createNameLabel}
            value={form.name}
            disabled={isCreating}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
            onInput={(event) => onFieldChange('name', event.currentTarget.value)}
            onChange={(event) => onFieldChange('name', event.currentTarget.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-300">
              {copy.connection.createTypeLabel}
            </span>
            <select
              data-slot="source-import-create-connection-type"
              aria-label={copy.connection.createTypeLabel}
              value={form.type}
              disabled={isCreating}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
              onInput={(event) =>
                onFieldChange(
                  'type',
                  event.currentTarget.value as CreateWarehouseConnectionInput['type']
                )
              }
              onChange={(event) =>
                onFieldChange(
                  'type',
                  event.currentTarget.value as CreateWarehouseConnectionInput['type']
                )
              }
            >
              {SUPPORTED_WAREHOUSE_CONNECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-300">
              {copy.connection.createDatabaseLabel}
            </span>
            <input
              data-slot="source-import-create-connection-database"
              aria-label={copy.connection.createDatabaseLabel}
              value={form.database}
              disabled={isCreating}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
              onInput={(event) => onFieldChange('database', event.currentTarget.value)}
              onChange={(event) => onFieldChange('database', event.currentTarget.value)}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-300">
            {copy.connection.createCredentialRefLabel}
          </span>
          <input
            data-slot="source-import-create-connection-credential-ref"
            aria-label={copy.connection.createCredentialRefLabel}
            value={form.credentialRef}
            disabled={isCreating}
            placeholder={copy.connection.createCredentialRefPlaceholder}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
            onInput={(event) => onFieldChange('credentialRef', event.currentTarget.value)}
            onChange={(event) => onFieldChange('credentialRef', event.currentTarget.value)}
          />
        </label>

        <div
          data-slot="source-import-create-connection-actions"
          className="flex flex-wrap justify-end gap-2"
        >
          <Button type="button" variant="ghost" size="sm" disabled={isCreating} onClick={onCancel}>
            {copy.connection.createCancelAction}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isCreating}
            className="bg-blue-700 text-white hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-300 disabled:opacity-100"
          >
            {isCreating ? copy.connection.creatingAction : copy.connection.createSubmitAction}
          </Button>
        </div>
      </form>
    </Card>
  );
}
