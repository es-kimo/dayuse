import { Component, type ErrorInfo } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { DayuLogo } from "../../../components/brand/DayuLogo";
import { Button } from "../../../components/dayu/ui";
import { AppHeader } from "../../../components/layout/AppHeader";
import { Screen, ScreenNav } from "../../../components/screens/Screen";
import { SkipNavLink } from "../../../components/ui/SkipNavLink";

function InvalidGroupIdScreen() {
  const navigate = useNavigate();
  const goToGroups = () => navigate("/groups", { replace: true });

  return (
    <Screen>
      <SkipNavLink targetId="main-content" />
      <AppHeader title="모임" onBack={goToGroups} />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 flex-col items-center justify-center px-6 pt-8 pb-screen-nav outline-hidden"
        aria-labelledby="invalid-group-title"
      >
        <div className="w-full max-w-xs py-10 text-center">
          <div className="mx-auto flex size-32 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
            <DayuLogo variant="symbol" className="size-20" alt="데이유" />
          </div>
          <h2
            id="invalid-group-title"
            className="mt-6 text-[20px] leading-[30px] font-extrabold tracking-[-0.02em] text-slate-800"
          >
            모임 주소를 다시 확인해 주세요
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-slate-500">
            주소가 올바르지 않아 모임을 열 수 없어요.
            <br />
            받은 링크를 확인하거나 내 모임에서 찾아보세요.
          </p>
          <Button type="button" size="lg" className="mt-8 w-full" onClick={goToGroups}>
            내 모임으로 이동
          </Button>
        </div>
      </main>
      <ScreenNav active="groups" />
    </Screen>
  );
}

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
      return <InvalidGroupIdScreen />;
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
