/** Owned concern: define the Filter control's UI model and intents independently of query execution.
 * @decision The view consumes existing method names; query results and card-tag actions stay with the controller.
 * @consequence Existing controllers satisfy the binding directly without aliases or runtime adapters.
 */
import type {
  CanvasGraphFilterComposition,
  CanvasGraphFilterDimension,
  CanvasGraphFilterPredicate,
  CanvasGraphFilterPresentationMode,
} from './canvasGraphFilter.contract';

export type CanvasGraphFilterOptionGroup = Readonly<{
  dimension: CanvasGraphFilterDimension;
  values: readonly string[];
}>;

export type CanvasGraphFilterControlModel = Readonly<{
  open: boolean;
  predicates: readonly CanvasGraphFilterPredicate[];
  composition: CanvasGraphFilterComposition;
  presentation: CanvasGraphFilterPresentationMode;
  status: 'idle' | 'matched' | 'no-match';
  matchCount: number;
  totalCount: number;
  draftDimension: CanvasGraphFilterDimension;
  draftValue: string;
  optionGroups: readonly CanvasGraphFilterOptionGroup[];
}>;

export type CanvasGraphFilterControlBinding = Readonly<{
  model: CanvasGraphFilterControlModel;
  setOpen: (open: boolean) => void;
  selectDimension: (dimension: CanvasGraphFilterDimension) => void;
  selectValue: (value: string) => void;
  addDraftPredicate: () => void;
  removePredicate: (predicate: CanvasGraphFilterPredicate) => void;
  setComposition: (composition: CanvasGraphFilterComposition) => void;
  setPresentation: (presentation: CanvasGraphFilterPresentationMode) => void;
  clear: () => void;
}>;
