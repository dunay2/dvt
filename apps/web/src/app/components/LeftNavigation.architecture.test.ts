/**
 * Owned concern: guard navigation stylesheet ownership and accessible interaction tokens.
 * @baseline GH-3629: source ownership checks do not prove rendered browser geometry.
 * @decision Read the actual component and stylesheet; reject legacy, inline and undeclared bindings.
 * @consequence Navigation behavior stays in Root tests and dimensions in native layout evidence.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';
import { assertComponentStyleOwnership } from '../../testing/componentStyleOwnership.test.support';
import { readArchitectureSiblingSource } from '../views/architecture.test.support';

const NAVIGATION_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'LeftNavigation.tsx');
const NAVIGATION_STYLESHEET = readArchitectureSiblingSource(
  import.meta.dirname,
  'LeftNavigation.module.css'
);

describe('LeftNavigation stylesheet ownership', () => {
  it('consumes only declared classes from its direct stylesheet', () => {
    assertComponentStyleOwnership({
      componentSource: NAVIGATION_SOURCE,
      stylesheetSource: NAVIGATION_STYLESHEET,
      stylesheetImport: './LeftNavigation.module.css',
    });
  });

  it.each([
    [
      'legacy chrome import',
      NAVIGATION_SOURCE.replace(
        "import styles from './LeftNavigation.module.css'",
        "import { leftNavigationRailClasses } from './shell/chrome'"
      ),
    ],
    ['inline class', `${NAVIGATION_SOURCE}\n<div className="legacy-appearance" />`],
    ['inline style', `${NAVIGATION_SOURCE}\n<div style={{ display: 'grid' }} />`],
    ['undeclared class', NAVIGATION_SOURCE.replace('styles.rail', 'styles.undeclaredRail')],
  ] as const)('rejects %s rather than admitting an invalid style owner', (_reason, source) => {
    expect(() =>
      assertComponentStyleOwnership({
        componentSource: source,
        stylesheetSource: NAVIGATION_STYLESHEET,
        stylesheetImport: './LeftNavigation.module.css',
      })
    ).toThrow();
  });

  it('keeps focus, active and hover appearance tied to semantic tokens', () => {
    const focus = NAVIGATION_STYLESHEET.match(
      /\.linkInteractive:focus-visible\s*\{([^}]+)\}/u
    )?.[1];
    const active = NAVIGATION_STYLESHEET.match(/\.linkActive\s*\{([^}]+)\}/u)?.[1];
    const hover = NAVIGATION_STYLESHEET.match(/\.linkInteractive:hover\s*\{([^}]+)\}/u)?.[1];
    expect(focus).toContain('var(--focus-ring)');
    expect(active).toContain('var(--status-running)');
    expect(active).toContain('var(--surface-selected)');
    expect(hover).toContain('var(--surface-selected)');
    expect(hover).toContain('var(--text-strong)');
  });
});
