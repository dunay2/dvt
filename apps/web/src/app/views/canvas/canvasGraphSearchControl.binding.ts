/** Owned concern: define the Search control's UI model and intents without coupling the view to its hook.
 * @decision Keyboard events stay in this UI boundary; viewport activation has its own narrow facet.
 * @consequence Existing controllers satisfy the binding directly without aliases or runtime adapters.
 */
import type { KeyboardEventHandler } from 'react';

export type CanvasGraphSearchControlModel = Readonly<{
  open: boolean;
  focusRequestId: number;
  query: string;
  status: 'idle' | 'no-match' | 'matched';
  matchCount: number;
  activeMatchPosition: number | null;
  activeNodeId: string | null;
}>;

export type CanvasGraphSearchControlBinding = Readonly<{
  model: CanvasGraphSearchControlModel;
  setQuery: (query: string) => void;
  showPrevious: () => void;
  showNext: () => void;
  close: () => void;
  onControlKeyDown: KeyboardEventHandler<HTMLElement>;
  onQueryKeyDown: KeyboardEventHandler<HTMLInputElement>;
}>;

export type CanvasGraphSearchViewportBinding = CanvasGraphSearchControlBinding &
  Readonly<{
    onViewportKeyDown: KeyboardEventHandler<HTMLElement>;
  }>;
