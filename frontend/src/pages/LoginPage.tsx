import { Info, Plus, Kakao } from "../components/screens/ScreenIcons";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth";
import { handlePostLoginNavigation, inviteStorage } from "../api/invites";
import { Screen, screenAssets } from "../components/screens/Screen";

import { UserCheck } from "lucide-react";
import { InAppBrowserNotice } from "../components/InAppBrowserNotice";

import { Button, Select, FormField } from "../components/ui";
import { Button as DayuButton, Help } from "../components/dayu/ui";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [devOpen, setDevOpen] = useState(false);
  const [mockUserId, setMockUserId] = useState<string>("1");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    const redirectParam = searchParams.get("redirect") || searchParams.get("returnTo");

    if (inviteParam) {
      inviteStorage.set(inviteParam);
    } else if (redirectParam && redirectParam.includes("/invite/")) {
      const match = redirectParam.match(/\/invite\/([^/?#]+)/);
      if (match && match[1]) {
        inviteStorage.set(match[1]);
      }
    } else if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      sessionStorage.setItem("dayuse_return_to", redirectParam);
    }
  }, [searchParams]);

  const handleKakaoLogin = () => {
    const clientId = import.meta.env.VITE_KAKAO_CLIENT_ID;
    const redirectUri = window.location.origin + "/oauth/callback/kakao";

    if (!clientId || clientId.startsWith("dummy-") || clientId.startsWith("test-")) {
      // 카카오 키가 설정되지 않은 로컬 환경인 경우 간편 모의 로그인 안내
      handleMockLogin(`mock-user-${mockUserId}`);
      return;
    }

    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  const handleMockLogin = async (code: string) => {
    setIsLoading(true);
    setLoginError("");
    try {
      const res = await authApi.loginWithKakao(code);
      login(res.accessToken, res.refreshToken, res.user);
      await handlePostLoginNavigation(navigate);
    } catch (err) {
      console.error("Mock login failed:", err);
      setLoginError("로그인에 실패했습니다. 백엔드 서버 상태를 확인해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <main className="flex flex-1 flex-col justify-center px-7 pt-6 pb-[calc(34px+env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-[18px] text-center">
          <img src={screenAssets.logo} alt="데이유즈" className="h-11 w-auto" />
          <div>
            <p className="text-[17px] leading-[25.5px] font-bold text-slate-800">목표는 각자, 꾸준함은 함께.</p>
            <p className="text-[14px] leading-[21px] text-slate-500">친구들과 각자의 챌린지를 인증하고 기록해요</p>
          </div>
        </div>

        <InAppBrowserNotice />

        <div className="mt-[50px] flex flex-col gap-2.5">
          <DayuButton variant="kakao" size="lg" onClick={handleKakaoLogin} disabled={isLoading}>
            <Kakao className="size-[22px]" />
            {isLoading ? "로그인 처리 중..." : "카카오로 시작하기"}
          </DayuButton>
          <Help className="text-center">
            시작하면{" "}
            <a className="underline decoration-slate-400 underline-offset-2 hover:text-slate-800" href="/terms">
              이용약관
            </a>
            과{" "}
            <a className="underline decoration-slate-400 underline-offset-2 hover:text-slate-800" href="/privacy">
              개인정보처리방침
            </a>
            에 동의하게 돼요.
          </Help>
          {loginError && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-[13px] text-red-700"
              role="alert"
            >
              {loginError}
            </p>
          )}
        </div>

        {import.meta.env.DEV && (
          <div className="mt-[41px] rounded-2xl border-[1.5px] border-dashed border-slate-300 bg-white p-4">
            <button
              type="button"
              aria-expanded={devOpen}
              onClick={() => setDevOpen(!devOpen)}
              className="flex w-full cursor-pointer items-center justify-between text-slate-500 transition-colors hover:text-slate-800"
            >
              <span className="flex items-center gap-1.5 text-[12px] leading-[18px] font-bold">
                <Info className="size-4" />
                개발용 빠른 로그인 · 로컬·테스트에서만 보여요
              </span>
              <Plus className={`size-4 transition-transform ${devOpen ? "rotate-45" : ""}`} />
            </button>
            {devOpen && (
              <FormField label="테스트 계정 선택" id="mock-user-select" className="mt-3">
                <div className="flex gap-2">
                  <Select id="mock-user-select" value={mockUserId} onChange={(e) => setMockUserId(e.target.value)}>
                    <option value="1">사용자 1 (모임장 테스트용)</option>
                    <option value="2">사용자 2 (초대 가입 테스트용)</option>
                    <option value="3">사용자 3 (비회원 차단 테스트용)</option>
                  </Select>
                  <Button
                    onClick={() => handleMockLogin(`mock-user-${mockUserId}`)}
                    isLoading={isLoading}
                    leftIcon={<UserCheck className="w-4 h-4" />}
                  >
                    접속
                  </Button>
                </div>
              </FormField>
            )}
          </div>
        )}
      </main>
    </Screen>
  );
};
