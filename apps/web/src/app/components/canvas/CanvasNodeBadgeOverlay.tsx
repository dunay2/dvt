/** Owned concern: render one plugin-projected badge over a Canvas node. */
import type { NodeBadge } from '../../plugins/contracts/NodeRendering';
import { cn } from '../ui/utils';

const POSITION_CLASSES: Record<NodeBadge['position'], string> = {
  'top-right': '-top-1.5 -right-1.5',
  'top-left': '-top-1.5 -left-1.5',
  'bottom-right': '-bottom-1.5 -right-1.5',
};

const COLOR_CLASSES: Record<NodeBadge['color'], string> = {
  green: 'bg-green-500 text-white',
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-400 text-black',
  blue: 'bg-blue-500 text-white',
  gray: 'bg-neutral-500 text-white',
};

export function CanvasNodeBadgeOverlay({ badge }: Readonly<{ badge: NodeBadge }>): JSX.Element {
  const Icon = badge.icon;
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-10 flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-semibold leading-none',
        POSITION_CLASSES[badge.position],
        COLOR_CLASSES[badge.color]
      )}
      title={badge.tooltip}
    >
      {Icon && <Icon size={8} />}
      {badge.text && <span>{badge.text}</span>}
    </div>
  );
}
