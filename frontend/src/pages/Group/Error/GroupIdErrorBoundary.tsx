import { Component, type ErrorInfo } from "react";
import { Outlet, useParams } from "react-router-dom";

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

class GroupIdErrorBoundaryBase extends Component<Props, State> {
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

/**
 * url 기준으로 상태 초기화하는 에러 바운더리
 */
export const GroupIdErrorBoundary = () => {
  const { groupId } = useParams<{ groupId: string }>();
  return (
    <GroupIdErrorBoundaryBase key={groupId}>
      <Outlet />
    </GroupIdErrorBoundaryBase>
  );
};
