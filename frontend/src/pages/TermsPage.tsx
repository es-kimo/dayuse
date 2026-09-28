import React from 'react';
import { PolicyLayout } from '../components/PolicyLayout';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <PolicyLayout
      title="dayuse 서비스 이용약관"
      description="본 약관은 dayuse 팀(이하 '회사')이 제공하는 dayuse 서비스(이하 '서비스')의 이용 조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임 사항을 규정합니다."
      lastUpdated="2026년 9월 28일"
    >
      {/* 중요 고지사항 박스 */}
      <section className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 text-slate-800">
        <div className="flex items-center gap-2 font-bold text-amber-900 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>보증금 및 벌금 정산에 대한 핵심 고지 (제7조 발췌)</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-keep">
          dayuse 서비스에서 제공하는 모임 내 챌린지 보증금 및 미수행 정산(벌금) 기능은 회원 상호 간의 자율적인 약속 이행과 정산 기록 편의를 돕는 도구입니다. <strong>회사는 회원들의 금전을 수탁·보관·예치하지 않으며, 정산금의 강제 징수나 지급 보증을 하지 않습니다.</strong> 회원 간의 모든 금전 정산은 상호 합의에 따라 직접 진행됩니다.
        </p>
      </section>

      {/* 약관 본문 조항들 */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제1조 (목적)
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed break-keep">
            본 약관은 회사가 운영하는 웹 및 모바일 애플리케이션 기반의 챌린지 인증 및 모임 습관 관리 플랫폼 dayuse의 이용과 관련하여 회사와 이용자(이하 &apos;회원&apos;) 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제2조 (용어의 정의)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>
              <strong>&quot;서비스&quot;</strong>란 단말기(PC, 휴대폰 등 정보통신기기)에 상관없이 회원이 이용할 수 있는 dayuse 챌린지 생성, 모임 관리, 사진 인증, 정산 기록 등 관련 제반 서비스를 의미합니다.
            </li>
            <li>
              <strong>&quot;회원&quot;</strong>이란 본 약관에 동의하고 카카오 소셜 계정 등을 통하여 회사와 이용계약을 체결하고 서비스를 이용하는 자를 의미합니다.
            </li>
            <li>
              <strong>&quot;모임&quot;</strong>이란 1인 이상의 회원이 챌린지를 함께 수행하고 인증 피드를 공유하기 위해 서비스 내에 개설한 가상의 그룹을 의미합니다.
            </li>
            <li>
              <strong>&quot;챌린지&quot;</strong>란 특정 주기 및 목표를 설정하여 사진 등으로 수행을 인증하는 개별 활동 과제를 의미합니다.
            </li>
            <li>
              <strong>&quot;정산 도구&quot;</strong>란 모임 구성원 간에 자율적으로 정한 벌금 또는 보증금 기준에 따라 미수행 내역과 송금 상태를 기록·표시하는 기능을 의미합니다.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제3조 (약관의 효력 및 개정)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>본 약관은 서비스 웹사이트 및 애플리케이션 초기 화면에 게시함으로써 효력이 발생합니다.</li>
            <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 적용일자 7일 전(회원에게 불리한 경우 30일 전)부터 공지합니다.</li>
            <li>회원이 개정 약관의 적용에 동의하지 않는 경우 이용계약을 해지(회원 탈퇴)할 수 있습니다.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제4조 (이용계약 체결 및 회원가입)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>이용계약은 회원이 되고자 하는 자가 본 약관의 내용에 동의하고 소셜 로그인(카카오) 절차를 완료함으로써 성립합니다.</li>
            <li>회사는 타인의 명의를 도용하거나 사회적 안녕질서 또는 미풍양속을 저해할 목적으로 신청한 경우, 기타 서비스 운영상 필요하다고 판단되는 경우 회원가입을 제한하거나 사후에 이용계약을 해지할 수 있습니다.</li>
          </ol>
        </div>

        {/* 제7조 (챌린지 보증금 및 정산에 관한 책임 한계) - 강조 */}
        <div className="p-5 rounded-xl border-2 border-blue-200 bg-blue-50/30">
          <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            제5조 (챌린지 보증금 및 정산에 관한 책임의 한계)
          </h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">
            <li>
              <strong>자율 운영 원칙</strong>: 서비스에서 제공하는 모임 보증금, 예치금, 미수행 정산금(벌금) 등의 관리 기능은 모임 구성원 간의 자율적 신뢰 및 상호 약속 이행을 돕기 위한 <strong>단순 기록 편의 도구</strong>에 불과합니다.
            </li>
            <li>
              <strong>자금 수탁 및 예치 부존재</strong>: 회사는 회원의 자금을 직접 수탁, 보관, 예치하지 아니하며, 전자금융거래법상 전자금융업자 또는 결제대행업체(PG)가 아닙니다.
            </li>
            <li>
              <strong>지급 보증 및 징수 책임 면책</strong>: 회원 상호 간에 발생하는 정산금의 송금, 수취, 환급은 회원 간에 카카오페이, 토스, 계좌이체 등의 방법으로 직접 진행되며, <strong>회사는 정산금의 강제 징수, 지급 보증, 대위 변제, 환불 의무를 일체 부담하지 않습니다.</strong> 회원 간 정산 불이행이나 분쟁으로 인한 책임은 전적으로 해당 회원 본인들에게 있습니다.
            </li>
            <li>
              <strong>0원 설정 및 자율성 보장</strong>: 회원은 챌린지 생성 시 미수행 정산금을 0원으로 설정할 수 있으며, 서비스는 어떠한 경우에도 금전적 부담을 강제하지 않습니다.
            </li>
            <li>
              <strong>자동 결제/출금 부존재</strong>: 서비스는 이용자의 금융계좌, 신용카드 등에서 금액을 자동으로 인출하거나 결제하는 기능을 일체 제공하지 않습니다.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제6조 (회원의 의무 및 금지 행위)
          </h2>
          <p className="text-sm text-slate-600 mb-2">회원은 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 leading-relaxed">
            <li>타인의 소셜 계정 또는 정보를 도용하는 행위</li>
            <li>챌린지 인증 목적과 무관한 음란물, 폭력적 사진, 불법 콘텐츠를 게시하는 행위</li>
            <li>수행하지 않은 활동에 대해 조작되거나 허위인 사진을 등록하는 행위</li>
            <li>타인의 명예를 훼손하거나 저작권 등 제3자의 지식재산권을 침해하는 행위</li>
            <li>서비스의 안정적 운영을 방해할 목적으로 자동화 프로그램, 매크로, 악성 코드를 유포하는 행위</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제7조 (게시물의 권리 및 이용)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>회원이 서비스 내에 게시한 인증 사진 및 게시물의 저작권은 해당 회원에게 귀속됩니다.</li>
            <li>회원은 자신이 등록한 게시물이 타인의 권리를 침해하지 않도록 주의하여야 하며, 저작권 침해 등으로 발생하는 모든 법적 책임은 회원 본인에게 있습니다.</li>
            <li>회사는 회원이 게시한 콘텐츠를 서비스 운영, 모임 내 피드 노출, 서비스 홍보 및 개선 목적으로 합리적인 범위 내에서 활용할 수 있습니다. 단, 회원이 삭제를 요청하는 경우 지체 없이 삭제합니다.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제8조 (서비스의 변경, 중단 및 면책)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>회사는 천재지변, 정전, 서비스 설비의 장애 또는 긴급 점검 등 불가피한 사유가 있는 경우 서비스 제공을 일시 중단할 수 있습니다.</li>
            <li>회사는 무료로 제공되는 서비스의 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.</li>
            <li>회사는 회원이 서비스를 이용하여 기대하는 습관 형성 성과나 이익을 얻지 못한 것에 대하여 책임을 지지 아니합니다.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제9조 (준거법 및 재판관할)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>회사와 회원 간에 제기된 소송은 대한민국 법령을 준거법으로 합니다.</li>
            <li>회사와 회원 간에 발생한 분쟁에 관한 소송은 민사소송법에 따른 관할 법원에 제기합니다.</li>
          </ol>
        </div>

        <div className="pt-2 text-xs text-slate-500">
          <p><strong>부칙</strong></p>
          <p>본 약관은 2026년 9월 28일부터 적용됩니다.</p>
        </div>
      </section>
    </PolicyLayout>
  );
};
