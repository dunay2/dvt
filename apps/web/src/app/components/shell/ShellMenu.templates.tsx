/**
 * Owned concern: present shell menu entries without owning navigation or command authority.
 * @baseline GH-3622: project context and global navigation have distinct owners.
 * @decision Reuse the existing Radix primitives and shell navigation read model.
 * @consequence Controllers dispatch; templates render localized labels and semantic styles.
 * @version 1.0.0
 */
import { NavLink } from 'react-router';
import type { ShellNavigationModel } from '../../shell/shellNavigationModel';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';

export function ShellNavigationEntriesTemplate({
  navigationModel,
  label,
  onNavigate,
}: Readonly<{
  navigationModel: ShellNavigationModel;
  label: string;
  onNavigate: (to: string) => void;
}>) {
  return (
    <>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {[...navigationModel.primaryItems, ...navigationModel.footerItems].map((item) => {
        const Icon = item.icon;
        return (
          <DropdownMenuItem key={item.to} asChild>
            <NavLink
              data-slot="shell-menu-navigation-link"
              to={item.to}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.to);
              }}
            >
              <Icon aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
              {item.label}
            </NavLink>
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
    </>
  );
}
