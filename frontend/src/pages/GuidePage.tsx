import React from 'react';
import { PolicyLayout } from '../components/PolicyLayout';
import { Users, Target, Camera, Coins, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GuidePage: React.FC = () => {
  return (
    <PolicyLayout
      title="서비스 이용 안내"
      description="dayuse는 친구들과 각자의 목표를 공유하고 사진 한 장으로 가볍게 인증하며 함께 성장하는 습관 형성 서비스입니다."
      lastUpdated="2026년 9월 28일"
    >
      {/* 1. 핵심 철학 소개 */}
      <section className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
        <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">Philosophy</span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 mb-3">
          &quot;목표는 각자, 꾸준함은 함께&quot;
        </h2>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed break-keep">
          모두가 똑같은 운동이나 똑같은 공부를 억지로 할 필요는 없습니다. 한 사람은 &apos;매일 1알고리즘 풀기&apos;, 다른 친구는 &apos;주 3회 헬스장 가기&apos;, 또 다른 친구는 &apos;아침 6시 기상&apos;을 하더라도 한 모임에서 서로의 오늘을 응원할 수 있습니다. 각자의 목표를 존중하면서 서로의 꾸준함에 긍정적인 자극을 받는 공간, 그것이 dayuse가 지향하는 가치입니다.
        </p>
      </section>

      {/* 2. 1단계: 모임 만들기 & 친구 초대 */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-base">
            1
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            모임 만들기 & 친구 초대
          </h2>
        </div>
        <div className="pl-12 space-y-3 text-sm sm:text-base text-slate-600">
          <p className="break-keep">
            카카오 소셜 로그인 후 <strong>&apos;새 모임 만들기&apos;</strong> 버튼을 눌러 모임 이름을 입력하면 단 3초 만에 모임이 개설됩니다.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>초대 링크 공유</strong>: 모임 상세 화면에서 원클릭으로 초대 링크(또는 6자리 모임 코드)를 복사하여 카카오톡이나 SNS로 친구들에게 보낼 수 있습니다.
            </li>
            <li>
              <strong>초대장 수락</strong>: 링크를 받은 친구는 로그인 후 즉시 해당 모임의 멤버로 합류합니다.
            </li>
            <li>
              <strong>자유로운 모임 다중 참여</strong>: 직장 동료 스터디, 대학 친구 운동 모임, 가족 아침 루틴 등 원하는 만큼 여러 모임에 동시에 참여할 수 있습니다.
            </li>
          </ul>
        </div>
      </section>

      {/* 3. 2단계: 챌린지 수행 방식 비교 ('각자하기' vs '함께하기') */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-base">
            2
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            챌린지 방식: &apos;각자하기&apos; vs &apos;함께하기&apos;
          </h2>
        </div>
        <div className="pl-12 space-y-4">
          <p className="text-sm sm:text-base text-slate-600 break-keep">
            dayuse는 모임의 성격과 목표에 맞춰 두 가지 방식의 챌린지를 완벽히 지원합니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 각자하기 */}
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40">
              <div className="inline-block px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold mb-2">
                개인 맞춤형 · 각자하기
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                나만의 목표를 스스로 정의
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep mb-3">
                모임 안에서 멤버마다 각자 수행할 과제, 주기(매일, 주 N회), 인증 기준을 독립적으로 생성합니다.
              </p>
              <div className="text-xs text-slate-500 bg-white/80 p-3 rounded-lg border border-blue-100 space-y-1">
                <p>예시: A는 알고리즘 1문제, B는 주 3회 헬스장, C는 6시 기상</p>
                <p className="font-semibold text-blue-700">추천: 서로의 관심사나 생활 패턴이 다른 친구 모임</p>
              </div>
            </div>

            {/* 함께하기 */}
            <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/40">
              <div className="inline-block px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-bold mb-2">
                그룹 단체형 · 함께하기
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                동일한 목표를 다 같이 달성
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-keep mb-3">
                모임장이 정한 단일 규칙(예: 매일 TIL 작성, 아침 독서 30분)에 모임원 전원이 함께 참여합니다.
              </p>
              <div className="text-xs text-slate-500 bg-white/80 p-3 rounded-lg border border-indigo-100 space-y-1">
                <p>예시: 부트캠프 동기들의 4주 스프린트, 다이어트 단체 챌린지</p>
                <p className="font-semibold text-indigo-700">추천: 동일한 마일스톤을 향해 함께 달리는 팀</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 3단계: 사진 한 장 인증 & 피드 공유 */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-base">
            3
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            사진 한 장 인증 & 피드 공유
          </h2>
        </div>
        <div className="pl-12 space-y-3 text-sm sm:text-base text-slate-600">
          <p className="break-keep">
            인증은 복잡하지 않고 가벼워야 매일 이어질 수 있습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">1. 오늘의 액션 확인</span>
              <span className="text-xs text-slate-600">참여 중인 모든 챌린지의 오늘 남은 인증 항목만 모아서 보여줍니다.</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">2. 촬영 or 붙여넣기</span>
              <span className="text-xs text-slate-600">모바일 카메라 촬영이나 PC/모바일 스크린샷 클립보드 붙여넣기를 지원합니다.</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">3. 피드와 연속 기록</span>
              <span className="text-xs text-slate-600">친구 인증 피드에 실시간 반영되며 주간/연속 달성 현황이 갱신됩니다.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 4단계: 보증금 및 미수행 정산 운영 원칙 (매우 중요) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base">
            4
          </div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            보증금 및 미수행 정산 운영 방식 (필독)
          </h2>
        </div>

        <div className="pl-12 space-y-4">
          <div className="p-5 rounded-xl bg-amber-50/60 border border-amber-200 text-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
              <ShieldAlert className="w-5 h-5" />
              <span>dayuse의 정산 정책 및 책임 한계 안내</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-keep">
              dayuse는 건강한 동기부여를 위해 모임별 벌금 및 정산 기능(정산표 산출, 미납 상태 표시 등)을 제공하지만, <strong>금융 결제 대행(PG)이나 자금 수탁 서비스를 제공하지 않습니다.</strong> 안전하고 명확한 이용을 위해 아래 사항을 반드시 확인해 주세요.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong>회원 간 직접 자율 송금 방식</strong>: 미수행 벌금이나 정산금은 카카오페이, 토스, 직접 계좌이체 등을 통해 회원들끼리 상호 신뢰 하에 직접 주고받습니다.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong>0원 정산 설정 지원</strong>: 금전적인 부담 없이 순수하게 습관을 기르고 싶은 모임을 위해, 미수행 정산 금액(벌금)을 <strong>0원</strong>으로 자유롭게 설정할 수 있습니다.
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <strong>서비스 자동 출금 기능 없음</strong>: 이용자의 카드, 은행 계좌에서 자동으로 결제되거나 출금되는 기능은 일체 존재하지 않으며, 회사는 회원 간의 금전 거래에 개입하거나 지급을 보증하지 않습니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 시작하기 버튼 링크 */}
      <section className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">지금 바로 모임을 만들고 시작해 보세요!</h3>
          <p className="text-xs sm:text-sm text-slate-500">모임 개설부터 친구 초대까지 1분이면 충분합니다.</p>
        </div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm active:scale-[0.98]"
        >
          <span>내 모임으로 이동하기</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </PolicyLayout>
  );
};
