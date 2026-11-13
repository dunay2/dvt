/**
 * Owned concern: present viewport and application display preferences.
 * @reason Project authority and display preferences have separate owners.
 * @consequence Render existing callbacks without owning commands or persistence.
 */
import { Activity, Languages, Maximize2, Minimize2, SlidersHorizontal } from 'lucide-react';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import { CanvasExplorerViewMenu } from '../../views/canvas/explorer/CanvasExplorerViewMenu';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';
import type { ShellViewControlsReadModel } from './shellViewControlsModel';

export function ShellViewMenuTemplate({
  open,
  onOpenChange,
  copy,
  viewControls,
  bottomDrawerVisible,
  focusMode,
  applicationLanguage,
  onToggleBottomDrawer,
  onToggleFocusMode,
  onLanguageSelected,
  onCloseAutoFocus,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ShellTopBarCopy;
  viewControls: ShellViewControlsReadModel;
  bottomDrawerVisible: boolean;
  focusMode: boolean;
  applicationLanguage: ApplicationLanguage;
  onToggleBottomDrawer: () => void;
  onToggleFocusMode: () => void;
  onLanguageSelected: (language: string) => void;
  onCloseAutoFocus: (event: Event) => void;
}>) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="shell-menu-trigger"
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
        >
          <SlidersHorizontal aria-hidden="true" className={topAppBarClasses.menuTriggerIcon} />
          {copy.shell}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={topAppBarClasses.contextMenuContent}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DropdownMenuLabel>{copy.workspacePanels}</DropdownMenuLabel>
        <CanvasExplorerViewMenu />
        {viewControls.showBottomDrawerToggle ? (
          <DropdownMenuCheckboxItem
            checked={bottomDrawerVisible}
            onCheckedChange={onToggleBottomDrawer}
          >
            <Activity aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
            {copy.operationalDrawer}
          </DropdownMenuCheckboxItem>
        ) : null}
        {viewControls.showFocusModeToggle ? (
          <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={onToggleFocusMode}>
            {focusMode ? (
              <Minimize2 aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
            ) : (
              <Maximize2 aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
            )}
            {copy.focusMode}
          </DropdownMenuCheckboxItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{copy.viewOptions}</DropdownMenuLabel>
        <DropdownMenuLabel
          data-slot="shell-language-menu"
          className={topAppBarClasses.menuLanguageLabel}
        >
          <Languages aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
          {copy.language}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={applicationLanguage} onValueChange={onLanguageSelected}>
          <DropdownMenuRadioItem data-slot="shell-language-option-en" value="en">
            {copy.languageEnglish}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem data-slot="shell-language-option-es" value="es">
            {copy.languageSpanish}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
