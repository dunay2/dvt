/** Passive Monaco DOM adapter; it grants no graph, compilation or write authority. */
import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { MonacoCodeEditor } from '../../components/monaco/MonacoCodeEditor';
import type { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';

type ReferenceProps = Pick<
  ComponentProps<typeof MonacoCodeViewer>,
  'inlineReferences' | 'onInspectReference'
>;

function ReferenceButtons({ inlineReferences, onInspectReference }: ReferenceProps) {
  return inlineReferences?.items.map((reference) => (
    <button
      key={reference.id}
      data-reference={reference.id}
      onClick={() => onInspectReference?.(reference.id)}
    >
      {reference.label}
    </button>
  ));
}

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    value,
    onChange,
    inlineReferences,
    onInspectReference,
  }: ComponentProps<typeof MonacoCodeEditor>) => (
    <>
      <textarea aria-label="Code" value={value} onChange={(e) => onChange(e.currentTarget.value)} />
      <ReferenceButtons
        inlineReferences={inlineReferences}
        onInspectReference={onInspectReference}
      />
    </>
  ),
}));
vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({
    value,
    inlineReferences,
    onInspectReference,
  }: ComponentProps<typeof MonacoCodeViewer>) => (
    <>
      <pre data-testid="code-file-viewer">{value}</pre>
      <ReferenceButtons
        inlineReferences={inlineReferences}
        onInspectReference={onInspectReference}
      />
    </>
  ),
}));
