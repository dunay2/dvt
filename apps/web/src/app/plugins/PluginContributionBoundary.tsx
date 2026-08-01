import { Component, type ReactNode } from 'react';

type PluginContributionBoundaryProps = Readonly<{
  children: ReactNode;
  fallback: ReactNode;
}>;

type PluginContributionBoundaryState = Readonly<{
  failed: boolean;
}>;

export class PluginContributionBoundary extends Component<
  PluginContributionBoundaryProps,
  PluginContributionBoundaryState
> {
  state: PluginContributionBoundaryState = { failed: false };

  static getDerivedStateFromError(): PluginContributionBoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
