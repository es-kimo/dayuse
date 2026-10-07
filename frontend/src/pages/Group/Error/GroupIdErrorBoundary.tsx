import { Component, type ErrorInfo } from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GroupIdErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("올바른 그룹 아이디가 아니에요.", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <div>올바른 그룹 아이디가 아니에요.</div>;
    }

    return this.props.children;
  }
}
