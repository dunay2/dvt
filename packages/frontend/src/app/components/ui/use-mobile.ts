/* eslint-env browser */
import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

const getBrowserWindow = () => {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }
  return (globalThis as any).window;
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const win = getBrowserWindow();
    if (!win) return;

    const mql = win.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(win.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
