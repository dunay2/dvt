/**
 * Owned concern: coordinate View preferences without project or navigation authority.
 * @baseline GH-3622: File, Project and View have separate responsibility boundaries.
 * @decision Reuse the existing layout callbacks and application language command.
 * @consequence Only presentation preferences change; graph state and scope remain untouched.
 * @version 1.0.0
 */
import { useState } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { ShellTopBarCopy } from './copy';
import { ShellViewMenuTemplate } from './ShellMenu.templates';
import type { ShellViewControlsReadModel } from './shellViewControlsModel';

type ShellMenuProps = Readonly<{
  viewControls: ShellViewControlsReadModel;
  bottomDrawerVisible: boolean;
  focusMode: boolean;
  toggleBottomDrawer: () => void;
  toggleFocusMode: () => void;
  copy: ShellTopBarCopy;
}>;

export function ShellMenu(props: ShellMenuProps) {
  const [open, setOpen] = useState(false);
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const configureApplicationLanguage = useApplicationLanguageStore(
    (state) => state.configureApplicationLanguage
  );
  function selectLanguage(language: string) {
    if (language !== 'en' && language !== 'es') return;
    configureApplicationLanguage(language);
    setOpen(false);
  }
  return (
    <ShellViewMenuTemplate
      {...props}
      open={open}
      onOpenChange={setOpen}
      applicationLanguage={applicationLanguage}
      onLanguageSelected={selectLanguage}
      onToggleBottomDrawer={props.toggleBottomDrawer}
      onToggleFocusMode={props.toggleFocusMode}
    />
  );
}
