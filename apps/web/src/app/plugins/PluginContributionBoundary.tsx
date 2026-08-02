import { Component, type ReactNode } from 'react';

type PluginContributionBoundaryProps = Readonly<{
  children: ReactNode;
  fallback: ReactNode;
  resetKey: string;
}>;

type PluginContributionBoundaryState = Readonly<{
  failed: boolean;
  resetKey: string;
}>;

export class PluginContributionBoundary extends Component<
  PluginContributionBoundaryProps,
  PluginContributionBoundaryState
> {
  state: PluginContributionBoundaryState = {
    failed: false,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(): Pick<PluginContributionBoundaryState, 'failed'> {
    return { failed: true };
  }

  static getDerivedStateFromProps(
    props: PluginContributionBoundaryProps,
    state: PluginContributionBoundaryState
  ): PluginContributionBoundaryState | null {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
