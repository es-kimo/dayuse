import React from 'react';
import { PolicyLayout } from '../components/PolicyLayout';
import { Shield, Lock } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <PolicyLayout
      title="dayuse 개인정보처리방침"
      description="dayuse 팀(이하 '회사')은 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하며, 이용자의 개인정보를 안전하게 관리하고 있습니다."
      lastUpdated="2026년 9월 28일"
    >
      {/* 주요 개인정보 처리 요약 */}
      <section className="p-5 rounded-xl bg-blue-50/70 border border-blue-200 text-slate-800 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-900">
          <Shield className="w-5 h-5 text-blue-600 shrink-0" />
          <span>개인정보 처리 한눈에 보기</span>
        </div>
        <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc pl-5">
          <li><strong>수집 항목</strong>: 카카오 소셜 계정 고유 식별자, 닉네임, 프로필 이미지, 이메일, 인증 사진 및 메모</li>
          <li><strong>이용 목적</strong>: 회원 식별, 챌린지 생성 및 인증 피드 공유, 모임 내 진행 현황 표시, 고객 지원</li>
          <li><strong>보유 기간</strong>: <strong>회원 탈퇴 시 지체 없이 즉시 파기</strong> (관계 법령 보존 의무 기간 제외)</li>
          <li><strong>보호 책임자</strong>: 류기현 (contact@dayuse.kr)</li>
        </ul>
      </section>

      {/* 개인정보처리방침 본문 조항 */}
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제1조 (개인정보의 처리 목적)
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed break-keep mb-2">
            회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 leading-relaxed">
            <li><strong>회원 가입 및 관리</strong>: 카카오 소셜 로그인 기반의 본인 식별, 회원 자격 유지·관리, 부정이용 방지</li>
            <li><strong>서비스 제공</strong>: 모임 개설 및 초대, 챌린지 수행 기록 및 인증 사진 피드 제공, 정산 내역 시각화</li>
            <li><strong>고객 문의 대응</strong>: 오류 제보 처리, 서비스 이용 불편 해소 및 공지사항 전달</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제2조 (처리하는 개인정보의 항목)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">구분</th>
                  <th className="p-3">수집 항목</th>
                  <th className="p-3">수집 및 이용 목적</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                <tr>
                  <td className="p-3 font-medium text-slate-800">소셜 간편가입 (필수)</td>
                  <td className="p-3">카카오 회원번호(ID), 프로필 닉네임, 프로필 이미지 URL, 이메일</td>
                  <td className="p-3">회원 식별, 모임 내 멤버 정보 표시</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-800">서비스 이용 중 생성 (선택)</td>
                  <td className="p-3">챌린지 인증 사진, 인증 메모, 응원 댓글</td>
                  <td className="p-3">챌린지 달성 증명 및 모임원 피드 공유</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-800">서비스 접속 시 자동 생성</td>
                  <td className="p-3">접속 IP 주소, 쿠키, 서비스 이용 기록, 기기/OS 정보</td>
                  <td className="p-3">부정 이용 방지, 서비스 안정성 확보, 통계 분석</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제3조 (개인정보의 보유 및 파기 기간)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>
              회사는 이용자의 개인정보를 원칙적으로 <strong>회원 탈퇴 시 지체 없이 파기</strong>합니다.
            </li>
            <li>
              단, 관련 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계 법령에서 정한 일정한 기간 동안 개인정보를 보관합니다.
              <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-slate-500">
                <li>표시·광고에 관한 기록: 6개월 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                <li>웹사이트 접속 로그 기록: 3개월 (통신비밀보호법)</li>
              </ul>
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제4조 (개인정보의 파기 절차 및 방법)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li><strong>파기 절차</strong>: 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 법령에 따라 일정 기간 저장된 후 파기됩니다.</li>
            <li><strong>파기 방법</strong>: 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 기술적 방법을 이용하여 안전하게 삭제합니다.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제5조 (개인정보의 제3자 제공 및 처리 위탁)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>회사는 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공하며, <strong>원칙적으로 외부에 개인정보를 제공하지 않습니다.</strong></li>
            <li>
              회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.
              <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <p><strong>수탁업체</strong>: AWS (Amazon Web Services), Cloudflare</p>
                <p><strong>위탁업무</strong>: 클라우드 인프라 호스팅, 데이터베이스 보관 및 CDN 네트워크 보안</p>
              </div>
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제6조 (정보주체의 권리·의무 및 행사방법)
          </h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <li>정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</li>
            <li>권리 행사는 프로필 설정 메뉴를 통하거나 지원 이메일(contact@dayuse.kr)을 통해 요청하실 수 있으며, 회사는 이에 대해 지체 없이 조치합니다.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">
            제7조 (개인정보의 안전성 확보 조치)
          </h2>
          <div className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="break-keep">
              회사는 개인정보의 안전성 확보를 위해 전송 구간 암호화(HTTPS/SSL 적용), 비밀번호 미수집(OAuth 인증 토큰 안전 격리), 데이터베이스 접근 제한 및 침입 차단 시스템을 적용하여 외부 침입에 대비하고 있습니다.
            </p>
          </div>
        </div>

        {/* 보호책임자 정보 */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
          <h2 className="text-base font-bold text-slate-900 mb-2">
            제8조 (개인정보 보호책임자 및 담당 부서)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-3">
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <div className="text-xs sm:text-sm text-slate-700 space-y-1 bg-white p-3 rounded-lg border border-slate-200">
            <p><strong>성명</strong>: 류기현</p>
            <p><strong>직책/부서</strong>: 개인정보 보호책임자 (dayuse 운영팀)</p>
            <p><strong>이메일</strong>: contact@dayuse.kr</p>
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-500">
          <p><strong>부칙</strong></p>
          <p>본 방침은 2026년 9월 28일부터 시행됩니다.</p>
        </div>
      </section>
    </PolicyLayout>
  );
};
