/** Owned concern: render bounded Python source, JSON input, runtime and execution limits. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import type {
  PythonCodeAuthoringDraft,
  PythonCodeAuthoringErrors,
} from '../../views/canvas/pythonCodeAuthoringModel';

type Props = Readonly<{
  nodeId: string;
  disabled: boolean;
  draft: PythonCodeAuthoringDraft;
  errors?: PythonCodeAuthoringErrors;
  onChange: (draft: PythonCodeAuthoringDraft) => void;
}>;

export function PythonCodeAuthoringFields({
  nodeId,
  disabled,
  draft,
  errors,
  onChange,
}: Props): JSX.Element {
  const update = (patch: Partial<PythonCodeAuthoringDraft>): void =>
    onChange({ ...draft, ...patch });

  return (
    <div data-slot="python-code-authoring" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Código Python</h3>
        <p className="text-xs text-muted-foreground">
          El nodo recibe un objeto JSON en <code>inputs</code> y debe asignar una salida JSON a{' '}
          <code>result</code>. Cada ejecución comienza en un proceso nuevo.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${nodeId}-python-source`}>Código</Label>
        <Textarea
          id={`${nodeId}-python-source`}
          name="python-source"
          value={draft.source}
          disabled={disabled}
          spellCheck={false}
          className={inspectorVisualClasses.inspectorCodeEditor}
          aria-invalid={errors?.source ? 'true' : undefined}
          onChange={(event) => update({ source: event.currentTarget.value })}
        />
        <Error visible={errors?.source != null}>
          El código es obligatorio y no puede superar 64 KiB.
        </Error>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${nodeId}-python-inputs`}>Entrada JSON</Label>
        <Textarea
          id={`${nodeId}-python-inputs`}
          name="python-inputs"
          value={draft.inputsJson}
          disabled={disabled}
          spellCheck={false}
          className={inspectorVisualClasses.inspectorCodeEditor}
          aria-invalid={errors?.inputsJson ? 'true' : undefined}
          onChange={(event) => update({ inputsJson: event.currentTarget.value })}
        />
        <Error visible={errors?.inputsJson != null}>
          Debe ser un objeto JSON válido y no superar 64 KiB.
        </Error>
      </div>

      <TextField
        nodeId={nodeId}
        name="runtime-ref"
        label="Referencia de runtime"
        value={draft.runtimeRef}
        disabled={disabled}
        error={errors?.runtimeRef}
        detail="Referencia opaca con formato python-runtime:nombre; nunca una ruta ejecutable."
        onChange={(runtimeRef) => update({ runtimeRef })}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          nodeId={nodeId}
          name="timeout"
          label="Timeout (ms)"
          value={draft.timeoutMs}
          disabled={disabled}
          error={errors?.timeoutMs}
          onChange={(timeoutMs) => update({ timeoutMs })}
        />
        <TextField
          nodeId={nodeId}
          name="termination-grace"
          label="Gracia de terminación (ms)"
          value={draft.terminationGraceMs}
          disabled={disabled}
          error={errors?.terminationGraceMs}
          onChange={(terminationGraceMs) => update({ terminationGraceMs })}
        />
        <TextField
          nodeId={nodeId}
          name="stdout-limit"
          label="Máximo stdout (bytes)"
          value={draft.maxStdoutBytes}
          disabled={disabled}
          error={errors?.maxStdoutBytes}
          onChange={(maxStdoutBytes) => update({ maxStdoutBytes })}
        />
        <TextField
          nodeId={nodeId}
          name="stderr-limit"
          label="Máximo stderr (bytes)"
          value={draft.maxStderrBytes}
          disabled={disabled}
          error={errors?.maxStderrBytes}
          onChange={(maxStderrBytes) => update({ maxStderrBytes })}
        />
        <TextField
          nodeId={nodeId}
          name="result-limit"
          label="Máximo resultado (bytes)"
          value={draft.maxResultBytes}
          disabled={disabled}
          error={errors?.maxResultBytes}
          onChange={(maxResultBytes) => update({ maxResultBytes })}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        La validación de este formulario es estructural. La sintaxis se comprueba con el compilador
        Python real en el worker antes de ejecutar cualquier instrucción.
      </p>
    </div>
  );
}

function TextField(
  props: Readonly<{
    nodeId: string;
    name: string;
    label: string;
    value: string;
    disabled: boolean;
    error?: string;
    detail?: string;
    onChange: (value: string) => void;
  }>
): JSX.Element {
  const id = `${props.nodeId}-python-${props.name}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{props.label}</Label>
      <Input
        id={id}
        name={props.name}
        value={props.value}
        disabled={props.disabled}
        aria-invalid={props.error ? 'true' : undefined}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      />
      {props.detail ? <p className="text-xs text-muted-foreground">{props.detail}</p> : null}
      <Error visible={props.error != null}>Revisa este valor.</Error>
    </div>
  );
}

function Error({ visible, children }: Readonly<{ visible: boolean; children: string }>): JSX.Element {
  return visible ? <p className="text-xs text-destructive">{children}</p> : <></>;
}
