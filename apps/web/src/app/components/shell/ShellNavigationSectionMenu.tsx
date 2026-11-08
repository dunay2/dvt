/** Present concern-owned section destinations without interpreting their URL or permissions. */
import { Link, useLocation } from 'react-router';
import { Trigger as DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import type {
  ShellNavigationItem,
  ShellRouteSectionNavigation,
} from '../../shell/shellNavigationModel';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';

type Props = Readonly<{
  item: ShellNavigationItem & { sections: ShellRouteSectionNavigation };
  triggerClassName: string;
  iconClassName: string | undefined;
  captionClassName: string | undefined;
}>;

export function ShellNavigationSectionMenu({
  item,
  triggerClassName,
  iconClassName,
  captionClassName,
}: Props): JSX.Element {
  const location = useLocation();
  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  const activeId = active ? item.sections.activeId(new URLSearchParams(location.search)) : null;
  const Icon = item.icon;
  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Tooltip's Slot needs the primitive's forwarded ref for its actual button anchor. */}
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-slot="left-navigation-section-trigger"
              data-route={item.to}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={triggerClassName}
            >
              <Icon aria-hidden="true" className={iconClassName} />
              <span data-slot="left-navigation-caption" className={captionClassName}>
                {item.label}
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="right"
        align="start"
        className={topAppBarClasses.contextMenuContent}
      >
        <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
        {item.sections.items.map((section) => {
          const SectionIcon = section.icon;
          return (
            <DropdownMenuItem key={section.id} asChild>
              <Link
                to={item.sections.locationFor(section.id, location)}
                data-slot="shell-route-section-link"
                data-section={section.id}
                aria-current={activeId === section.id ? 'page' : undefined}
              >
                <SectionIcon aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
                {section.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
