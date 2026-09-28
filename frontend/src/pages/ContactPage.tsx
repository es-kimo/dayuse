import React, { useState } from 'react';
import { PolicyLayout } from '../components/PolicyLayout';
import { Mail, Copy, Check, AlertCircle, HelpCircle, Lightbulb } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  const supportEmail = 'contact@dayuse.kr';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 복사 실패 시 폴백
      const textarea = document.createElement('textarea');
      textarea.value = supportEmail;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <PolicyLayout
      title="문의하기"
      description="dayuse를 이용하시면서 겪으신 오류, 궁금한 점, 혹은 더 나은 서비스를 위한 제안이 있으신가요? 언제든 편하게 소통해 주세요."
    >
      {/* 1. 빠른 소통 채널 카드 */}
      <section>
        <div className="p-6 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-4">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">공식 지원 이메일</h2>
            <p className="text-sm text-slate-600 mb-2 break-keep">
              오류 제보, 모임 운영 문의, 계정 관련 요청을 상세한 내용과 함께 보내주시면 영업일 기준 1~2일 이내에 답변드립니다.
            </p>
            <p className="text-base sm:text-lg font-mono font-bold text-blue-700 select-all">
              {supportEmail}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
            <a
              href={`mailto:${supportEmail}?subject=[dayuse 문의] `}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition active:scale-[0.98]"
            >
              <Mail className="w-4 h-4" />
              <span>메일 보내기</span>
            </a>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-sm font-medium rounded-lg transition"
              aria-label="이메일 주소 복사하기"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold text-xs">복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span className="text-xs">주소 복사</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 2. 문의 유형 및 접수 가이드 */}
      <section className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <span>문의 접수 전 확인해 주세요</span>
        </h2>
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base mb-1">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              1. 서비스 오류 및 버그 제보
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 break-keep">
              오류가 발생한 페이지의 <strong>URL 경로</strong>, 사용 중이신 <strong>기기/브라우저 환경</strong>(예: iPhone Safari, 갤럭시 크롬 등), 그리고 가능하시다면 <strong>화면 캡처</strong>를 함께 첨부해 주시면 신속하게 조치할 수 있습니다.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base mb-1">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              2. 모임 및 챌린지 운영 문의
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 break-keep">
              참여 중인 <strong>모임 이름</strong>이나 <strong>초대 링크</strong>를 함께 적어 주시면 정확한 운영 상태를 파악하여 안내해 드립니다. (단, 회원 간 벌금 송금/정산은 회원 간 자율 운영이므로 회사가 금전을 직접 중개하거나 보증하지 않습니다.)
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base mb-1">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              3. 기능 제안 및 피드백
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 break-keep">
              &quot;이런 챌린지 인증 방식이 있으면 좋겠어요&quot;, &quot;모임 피드 화면이 이렇게 바뀌면 편할 것 같아요&quot; 등 서비스 성장을 위한 소중한 의견은 팀 전체가 꼼꼼히 검토합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 3. 자주 묻는 질문 (FAQ) */}
      <section className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-slate-900">자주 묻는 질문 (FAQ)</h2>
        <div className="space-y-3">
          <details className="group border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition">
            <summary className="font-semibold text-slate-900 cursor-pointer text-sm sm:text-base flex items-center justify-between">
              <span>보증금이나 벌금이 서비스에서 자동으로 결제되거나 출금되나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 break-keep">
              <strong>아닙니다. dayuse에는 자동 출금이나 자동 결제 기능이 일체 없습니다.</strong> 보증금 및 미수행 정산은 친구 및 모임원들 간의 자율 약속이며, 정산 현황표를 바탕으로 카카오페이, 토스, 계좌이체 등을 통해 회원들이 직접 상호 송금하는 방식입니다. 또한 정산 금액을 0원으로 설정하여 비용 없이 인증 습관에만 집중하실 수도 있습니다.
            </p>
          </details>

          <details className="group border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition">
            <summary className="font-semibold text-slate-900 cursor-pointer text-sm sm:text-base flex items-center justify-between">
              <span>모임원마다 서로 다른 챌린지를 할 수 있나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 break-keep">
              <strong>네, 가능합니다.</strong> dayuse의 핵심 철학은 <strong>&apos;목표는 각자, 꾸준함은 함께&apos;</strong>입니다. 한 모임 안에서 어떤 친구는 &apos;매일 코딩&apos;, 어떤 친구는 &apos;주 3회 헬스장&apos;, 어떤 친구는 &apos;6시 기상&apos;을 각각 등록하고 함께 인증할 수 있습니다.
            </p>
          </details>

          <details className="group border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition">
            <summary className="font-semibold text-slate-900 cursor-pointer text-sm sm:text-base flex items-center justify-between">
              <span>회원 탈퇴 및 개인정보 삭제는 어떻게 하나요?</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 break-keep">
              프로필 설정 화면 또는 공식 지원 이메일(contact@dayuse.kr)로 탈퇴 요청을 보내주시면, 이용자의 개인정보 및 인증 기록을 법령이 정한 보존 의무 범위를 제외하고 즉시 영구 파기합니다.
            </p>
          </details>
        </div>
      </section>

      {/* 4. 운영 정보 안내 */}
      <section className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 space-y-1">
        <p><strong>운영 주체</strong>: dayuse 팀 (개인정보 보호책임자: 류기현)</p>
        <p><strong>공식 이메일</strong>: contact@dayuse.kr</p>
        <p><strong>응답 시간</strong>: 평일 10:00 ~ 18:00 (주말 및 공휴일 접수 건은 익영업일 순차 확인)</p>
      </section>
    </PolicyLayout>
  );
};
