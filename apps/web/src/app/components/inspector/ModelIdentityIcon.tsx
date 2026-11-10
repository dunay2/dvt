/** Present a compact model technology mark; capability admission belongs to the model projection. */
import type { JSX } from 'react';
import { Braces, Box, Globe } from 'lucide-react';
import type { CanvasModelIcon } from '../../views/canvas/canvasModelIdentity';
import { MODEL_IDENTITY_GLYPHS } from './modelIdentityGlyphs';
import styles from './ModelIdentity.module.css';

export const MODEL_IDENTITY_LABELS: Readonly<Record<CanvasModelIcon, string>> = {
  model: 'Model',
  dbt: 'dbt',
  sql: 'SQL',
  substrait: 'Substrait',
  api: 'API',
  postgres: 'PostgreSQL',
};

/** Decorative by default; callers supply adjacent text or a title on the surrounding control. */
export function ModelIdentityIcon({
  icon,
  size = 'compact',
}: Readonly<{ icon: CanvasModelIcon; size?: 'compact' | 'header' }>): JSX.Element {
  const Primitive = icon === 'sql' ? Braces : icon === 'api' ? Globe : Box;
  const glyph =
    icon === 'dbt' || icon === 'substrait' || icon === 'postgres'
      ? MODEL_IDENTITY_GLYPHS[icon]
      : null;
  return (
    <span className={styles.icon} data-model-icon={icon} data-size={size} aria-hidden="true">
      {glyph == null ? (
        <Primitive />
      ) : (
        <svg viewBox={glyph.viewBox} fill="currentColor" focusable="false">
          <path d={glyph.path} />
        </svg>
      )}
    </span>
  );
}
