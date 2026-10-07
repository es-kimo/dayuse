import { Component, type ErrorInfo } from "react";

export class InvalidGroupIdError extends Error {
  constructor(message = "invalid group id from url") {
    super(message);
    this.name = "InvalidGroupIdError";
  }
}
interface Props {
  children: React.ReactNode;
}

interface State {
  isInvalidGroupId: boolean;
  error: Error | null;
}

export class GroupIdErrorBoundary extends Component<Props, State> {
  public state: State = {
    isInvalidGroupId: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { error, isInvalidGroupId: error instanceof InvalidGroupIdError };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.state.isInvalidGroupId) {
      console.error("올바른 그룹 아이디가 아니에요.", error, errorInfo);
    }
  }

  public render() {
    if (this.state.isInvalidGroupId) {
      return <div>올바른 그룹 아이디가 아니에요.</div>;
    }

    if (this.state.error !== null) {
      throw this.state.error;
    }

    return this.props.children;
  }
}
