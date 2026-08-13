import type { IObservability } from '@dvt/observability';

import type { IStartRunTargetAdapterRegistry } from '../../../src/application/ports/IStartRunTargetAdapterRegistry.js';
import { startRunRoute } from '../../../src/entrypoints/http/startRunRoute.js';
import { workspaceContextRoute } from '../../../src/entrypoints/http/workspaceContextRoute.js';

type AssertFalse<Value extends false> = Value;
type AssertTrue<Value extends true> = Value;
type IsOptional<ObjectType, Key extends keyof ObjectType> =
  {} extends Pick<ObjectType, Key> ? true : false;

type StartRunRouteParameters = Parameters<typeof startRunRoute>;
type StartRunRouteDependencies = NonNullable<StartRunRouteParameters[2]>;
type StartRunRouteWithoutDependencies = (
  request: StartRunRouteParameters[0],
  reply: StartRunRouteParameters[1]
) => ReturnType<typeof startRunRoute>;

export type StartRunRouteRequiresDependenciesArgument = AssertFalse<
  typeof startRunRoute extends StartRunRouteWithoutDependencies ? true : false
>;
export type StartRunRouteRequiresAdapterRegistry = AssertFalse<
  IsOptional<StartRunRouteDependencies, 'adapterRegistry'>
>;
export type StartRunRouteRequiresObservability = AssertFalse<
  IsOptional<StartRunRouteDependencies, 'observability'>
>;
export type StartRunRouteDependencyTypesAreOwned = AssertTrue<
  StartRunRouteDependencies['adapterRegistry'] extends IStartRunTargetAdapterRegistry
    ? StartRunRouteDependencies['observability'] extends IObservability
      ? true
      : false
    : false
>;

type WorkspaceContextRouteDependencies = Parameters<typeof workspaceContextRoute>[2];

export type WorkspaceContextRouteRequiresAdapterRegistry = AssertFalse<
  IsOptional<WorkspaceContextRouteDependencies, 'adapterRegistry'>
>;
