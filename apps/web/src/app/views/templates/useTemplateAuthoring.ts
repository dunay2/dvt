/** Own SelectExecutionTemplateProfile, UpdateExecutionTemplateParameterValue and EditExecutionTemplateSource.
 * A project change retires this session and conditional file saves use the current draft's revision.
 */
import { useEffect, useRef, useState } from 'react';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { useSessionContext } from '../../services/AppServicesContext';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import { projectTemplatePath, type ProjectTemplateFile } from './projectTemplateFile';
import { useProjectTemplateFiles } from './useProjectTemplateFiles';
import {
  EXECUTION_TEMPLATE_CATALOG,
  createDefaultExecutionTemplateValues,
  localizeExecutionTemplate,
} from './templatesViewModel';
import type { TemplatesCopy } from './templatesCopy';
import { resolveCodeFileCreationFailure } from '../code/codeWorkbenchErrorModel';
import { resolveCodeFileCreationCopy } from '../code/codeViewCopy';

type Draft = ProjectTemplateFile & { digest?: string };
export function useTemplateAuthoring(
  scope: WorkspaceScope,
  language: ApplicationLanguage,
  copy: TemplatesCopy
) {
  const files = useProjectTemplateFiles(scope);
  const session = useSessionContext();
  const [selected, setSelected] = useState('snowflake-task');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [edit, setEdit] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const writing = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    []
  );
  const savedDraft = drafts[selected];
  const base = EXECUTION_TEMPLATE_CATALOG.find(
    (t) => t.id === (savedDraft?.baseTemplateId ?? selected)
  )!;
  const template = localizeExecutionTemplate(base, language);
  const draft: Draft = savedDraft ?? {
    version: 1,
    baseTemplateId: base.id,
    name: '',
    source: base.templateSource,
    values: createDefaultExecutionTemplateValues(base),
  };
  function update(patch: Partial<Pick<Draft, 'source' | 'name' | 'values'>>) {
    if (writing.current) return;
    setDrafts((all) => ({ ...all, [selected]: { ...(all[selected] ?? draft), ...patch } }));
    setNotice('');
  }
  function parameter(id: string, value: string) {
    update({ values: { ...draft.values, [id]: value } });
  }
  async function select(id: string) {
    if (writing.current) return;
    const token = ++generation.current;
    setNotice('');
    setBusy(false);
    if (!drafts[id] && !EXECUTION_TEMPLATE_CATALOG.some((t) => t.id === id)) {
      setBusy(true);
      try {
        const result = await files.read(id);
        if (token !== generation.current || session.getWorkspaceScopeSnapshot() !== scope) return;
        if (
          !result ||
          !EXECUTION_TEMPLATE_CATALOG.some((t) => t.id === result.file.baseTemplateId)
        ) {
          setNotice(copy.invalid);
          return;
        }
        setDrafts((all) => ({ ...all, [id]: { ...result.file, digest: result.digest } }));
      } catch {
        if (token === generation.current) setNotice(copy.invalid);
        return;
      } finally {
        if (token === generation.current) setBusy(false);
      }
    }
    setSelected(id);
    setEdit(false);
  }
  async function save() {
    if (busy || writing.current) return;
    const path = projectTemplatePath(draft.name);
    if (!path) {
      setNotice(copy.invalidName);
      return;
    }
    const token = ++generation.current;
    writing.current = true;
    setBusy(true);
    try {
      const { digest: previousDigest, ...file } = draft;
      const digest = await files.save(path, file, selected === path ? previousDigest : undefined);
      if (token !== generation.current || session.getWorkspaceScopeSnapshot() !== scope) return;
      setDrafts((all) => ({ ...all, [path]: { ...file, digest } }));
      setSelected(path);
      setNotice(copy.saved + ' · ' + path);
    } catch (error) {
      const kind = resolveCodeFileCreationFailure(error);
      if (token === generation.current)
        setNotice(
          kind === 'conflict' ? copy.conflict : resolveCodeFileCreationCopy(language)[kind]
        );
    } finally {
      writing.current = false;
      if (token === generation.current) setBusy(false);
    }
  }
  const displayTemplate = selected.startsWith('dvt_templates/')
    ? { ...template, label: draft.name || template.label }
    : template;
  return {
    selected,
    template: displayTemplate,
    draft,
    edit,
    setEdit,
    notice,
    setNotice,
    busy,
    select,
    parameter,
    update,
    save,
    paths: files.paths,
    unavailable: files.unavailable,
  };
}
export type TemplateAuthoring = ReturnType<typeof useTemplateAuthoring>;
