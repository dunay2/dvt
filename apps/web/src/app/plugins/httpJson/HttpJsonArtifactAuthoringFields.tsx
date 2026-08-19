/** Owned concern: render the bounded, opaque HTTP JSON acquisition authoring fields. */
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type {
  HttpJsonArtifactAuthoringDraft,
  HttpJsonArtifactAuthoringErrors,
} from '../../views/canvas/httpJsonArtifactAuthoringModel';
import { canvasViewCopy, formatCanvasInspectorNodeDraftError } from '../../views/canvas/copy';

type Props = Readonly<{
  nodeId: string;
  disabled: boolean;
  draft: HttpJsonArtifactAuthoringDraft;
  errors?: HttpJsonArtifactAuthoringErrors;
  onChange: (draft: HttpJsonArtifactAuthoringDraft) => void;
}>;

export function HttpJsonArtifactAuthoringFields({
  nodeId,
  disabled,
  draft,
  errors,
  onChange,
}: Props): JSX.Element {
  const update = (patch: Partial<HttpJsonArtifactAuthoringDraft>): void =>
    onChange({ ...draft, ...patch });
  return (
    <div data-slot="http-json-artifact-authoring" className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{canvasViewCopy.inspectorHttpJsonTitle}</h3>
        <p className="text-xs text-muted-foreground">
          {canvasViewCopy.inspectorHttpJsonDescription}
        </p>
      </div>
      <Field
        nodeId={nodeId}
        name="endpoint-ref"
        label={canvasViewCopy.inspectorHttpJsonEndpointRefLabel}
        value={draft.endpointRef}
        disabled={disabled}
        error={errors?.endpointRef}
        onChange={(endpointRef) => update({ endpointRef })}
      />
      <Field
        nodeId={nodeId}
        name="auth-ref"
        label={canvasViewCopy.inspectorHttpJsonAuthCredentialRefLabel}
        value={draft.authCredentialRef}
        disabled={disabled}
        error={errors?.authCredentialRef}
        onChange={(authCredentialRef) => update({ authCredentialRef })}
      />
      <div className="space-y-1">
        <Label>{canvasViewCopy.inspectorHttpJsonFormatLabel}</Label>
        <Select
          value={draft.format}
          disabled={disabled}
          onValueChange={(format) => update({ format: format as 'json' | 'jsonl' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="jsonl">JSON Lines</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Field
        nodeId={nodeId}
        name="sha256"
        label={canvasViewCopy.inspectorHttpJsonExpectedSha256Label}
        value={draft.expectedSha256}
        disabled={disabled}
        error={errors?.expectedSha256}
        onChange={(expectedSha256) => update({ expectedSha256 })}
      />
      <Field
        nodeId={nodeId}
        name="size"
        label={canvasViewCopy.inspectorHttpJsonExpectedSizeBytesLabel}
        value={draft.expectedSizeBytes}
        disabled={disabled}
        error={errors?.expectedSizeBytes}
        onChange={(expectedSizeBytes) => update({ expectedSizeBytes })}
      />
      <Field
        nodeId={nodeId}
        name="max-size"
        label={canvasViewCopy.inspectorHttpJsonMaxBytesLabel}
        value={draft.maxBytes}
        disabled={disabled}
        error={errors?.maxBytes}
        onChange={(maxBytes) => update({ maxBytes })}
      />
      <Field
        nodeId={nodeId}
        name="storage-uri"
        label={canvasViewCopy.inspectorHttpJsonStorageUriLabel}
        value={draft.storageUri}
        disabled={disabled}
        error={errors?.storageUri}
        onChange={(storageUri) => update({ storageUri })}
      />
      <Field
        nodeId={nodeId}
        name="artifact-credential"
        label={canvasViewCopy.inspectorHttpJsonArtifactCredentialRefLabel}
        value={draft.artifactCredentialRef}
        disabled={disabled}
        error={errors?.artifactCredentialRef}
        onChange={(artifactCredentialRef) => update({ artifactCredentialRef })}
      />
      <Field
        nodeId={nodeId}
        name="connect-timeout"
        label={canvasViewCopy.inspectorHttpJsonConnectTimeoutLabel}
        value={draft.connectTimeoutMs}
        disabled={disabled}
        error={errors?.connectTimeoutMs}
        onChange={(connectTimeoutMs) => update({ connectTimeoutMs })}
      />
      <Field
        nodeId={nodeId}
        name="request-timeout"
        label={canvasViewCopy.inspectorHttpJsonRequestTimeoutLabel}
        value={draft.requestTimeoutMs}
        disabled={disabled}
        error={errors?.requestTimeoutMs}
        onChange={(requestTimeoutMs) => update({ requestTimeoutMs })}
      />
      <Field
        nodeId={nodeId}
        name="redirects"
        label={canvasViewCopy.inspectorHttpJsonMaxRedirectsLabel}
        value={draft.maxRedirects}
        disabled={disabled}
        error={errors?.maxRedirects}
        onChange={(maxRedirects) => update({ maxRedirects })}
      />
    </div>
  );
}

function Field(
  props: Readonly<{
    nodeId: string;
    name: string;
    label: string;
    value: string;
    disabled: boolean;
    error?: NonNullable<HttpJsonArtifactAuthoringErrors[keyof HttpJsonArtifactAuthoringErrors]>;
    onChange: (value: string) => void;
  }>
): JSX.Element {
  const id = `${props.nodeId}-http-json-${props.name}`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{props.label}</Label>
      <Input
        id={id}
        value={props.value}
        disabled={props.disabled}
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={props.error ? errorId : undefined}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.error ? (
        <p id={errorId} className={inspectorVisualClasses.inspectorErrorText}>
          {formatCanvasInspectorNodeDraftError(props.error, canvasViewCopy)}
        </p>
      ) : null}
    </div>
  );
}
