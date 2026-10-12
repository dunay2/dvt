/** Passive card DTO; column interaction uses the existing section contract. */
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import type { GraphNodeAlgebraicDrop } from './GraphNodeAlgebraicDropZone';
import type {
  GraphNodeCardReadModel,
  GraphNodeOperationalDetail,
  GraphNodeMaterializationControl,
} from './graphNodeCardStrategyContracts';

export type GraphNodeCardViewProps = Readonly<{
  cardModel: GraphNodeCardReadModel;
  materializationControl?: GraphNodeMaterializationControl;
  columnSection: GraphNodeColumnSectionProps | null;
  tags: readonly Readonly<{ value: string; label: string }>[];
  icon?: LucideIcon;
  borderClass?: string;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  overlayStyle?: CSSProperties;
  onOpenOperationalDetails?: (
    detail: GraphNodeOperationalDetail,
    anchorElement: HTMLElement
  ) => void;
  onOpenCode?: () => void;
  onSelectTag?: (tag: string) => void;
  getSelectTagLabel?: (tag: string) => string;
  algebraicDrop?: GraphNodeAlgebraicDrop;
}>;
