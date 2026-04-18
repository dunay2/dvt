import { useEffect, type ReactNode } from 'react';

import { publishRouteBootstrapPresentation, resetRouteBootstrapPresentation } from './routeBootstrapRegistry';
import {
  getStaticRouteSettledPresentation,
  type RouteBootstrapRegistration,
} from './routeBootstrapRegistration';

type StaticRouteBootstrapBoundaryProps = {
  registration: RouteBootstrapRegistration | null;
  children: ReactNode;
};

export default function StaticRouteBootstrapBoundary({
  registration,
  children,
}: StaticRouteBootstrapBoundaryProps) {
  useEffect(() => {
    if (!registration) {
      return;
    }

    const settledPresentation = getStaticRouteSettledPresentation(registration);
    if (!settledPresentation) {
      return;
    }

    publishRouteBootstrapPresentation(registration, settledPresentation);

    return () => {
      resetRouteBootstrapPresentation(registration);
    };
  }, [registration]);

  return <>{children}</>;
}
