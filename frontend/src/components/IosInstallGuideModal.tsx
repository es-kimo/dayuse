import React from 'react';

interface IosInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosInstallGuideModal: React.FC<IosInstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>🍎</span> iOS 홈 화면 추가 안내
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            iOS(아이폰/아이패드) 정책상, <strong>홈 화면에 추가된 앱</strong>에서만 푸시 알림을 받을 수 있습니다.
            아래 3단계를 따라해 주세요!
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                1
              </div>
              <div className="text-sm text-slate-700">
                Safari 하단 바 중앙의 <strong>공유 버튼</strong>
                <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 text-xs">
                  <svg className="w-3.5 h-3.5 mr-0.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  공유
                </span>
                을 터치합니다.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                2
              </div>
              <div className="text-sm text-slate-700">
                스크롤을 내려 <strong>'홈 화면에 추가'</strong>를 선택합니다.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                3
              </div>
              <div className="text-sm text-slate-700">
                홈 화면에 생성된 <strong>데이유즈 아이콘</strong>으로 실행하면 매일 알림을 받으실 수 있습니다!
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            확인했어요
          </button>
        </div>
      </div>
    </div>
  );
};
