import React, { useState, useEffect } from 'react';
import { Modal, ModalTitle, ModalClose } from './ui/Modal';

interface IosInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlatform?: 'ios' | 'android';
}

export const IosInstallGuideModal: React.FC<IosInstallGuideModalProps> = ({
  isOpen,
  onClose,
  initialPlatform = 'ios',
}) => {
  const [platform, setPlatform] = useState<'ios' | 'android'>(initialPlatform);

  useEffect(() => {
    if (isOpen) {
      setPlatform(initialPlatform);
    }
  }, [isOpen, initialPlatform]);

  return (
    <Modal
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      layer="sheet"
      placement="bottom"
      backdropClassName="bg-slate-900/60 backdrop-blur-xs"
      className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <ModalTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span aria-hidden="true">📱</span> 홈 화면 앱 추가 안내
          </ModalTitle>
          <ModalClose
            aria-label="닫기"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-ring"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </ModalClose>
        </div>

        {/* 플랫폼 전환 탭 */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              platform === 'ios'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span aria-hidden="true">🍎</span> iOS (아이폰)
          </button>
          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              platform === 'android'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span aria-hidden="true">🤖</span> Android (갤럭시)
          </button>
        </div>

        {platform === 'ios' ? (
          <>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              iOS(아이폰/아이패드) 정책상, <strong>홈 화면에 추가된 앱</strong>에서만 푸시 알림을 받을 수 있습니다.
              아래 3단계를 따라해 주세요!
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-sm text-slate-700 leading-snug">
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

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-sm text-slate-700 leading-snug">
                  스크롤을 내려 <strong>'홈 화면에 추가'</strong>를 선택합니다.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-sm text-slate-700 leading-snug">
                  홈 화면에 생성된 <strong>데이유즈 아이콘</strong>으로 실행하면 매일 알림을 받으실 수 있습니다!
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              안드로이드(갤럭시 등)에서는 홈 화면에 추가하면 전용 앱처럼 빠르고 편리하게 알림을 받아보실 수 있습니다.
            </p>

            <div className="space-y-3 mb-6">
              {/* Chrome 안내 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Chrome (크롬) 브라우저
                </div>
                <ol className="text-xs text-slate-600 space-y-1 pl-4 list-decimal marker:text-slate-400 marker:font-bold leading-relaxed">
                  <li>우측 상단 더보기 메뉴(<strong>⋮</strong>)를 터치합니다.</li>
                  <li><strong>'홈 화면에 추가'</strong> 또는 <strong>'앱 설치'</strong>를 선택합니다.</li>
                  <li>팝업에서 <strong>'추가'</strong> 또는 <strong>'설치'</strong>를 누르면 완료됩니다.</li>
                </ol>
              </div>

              {/* Samsung Internet 안내 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                  삼성 인터넷 (Samsung Internet)
                </div>
                <ol className="text-xs text-slate-600 space-y-1 pl-4 list-decimal marker:text-slate-400 marker:font-bold leading-relaxed">
                  <li>하단 메뉴(<strong>☰</strong>) 또는 주소창의 <strong>설치 아이콘(↓)</strong>을 터치합니다.</li>
                  <li><strong>'현재 페이지 추가'</strong> &rarr; <strong>'홈 화면'</strong>을 선택합니다.</li>
                  <li>팝업에서 <strong>'추가'</strong>를 터치하면 완료됩니다.</li>
                </ol>
              </div>
            </div>
          </>
        )}

        <ModalClose className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors focus-ring text-sm">
          확인했어요
        </ModalClose>
      </div>
    </Modal>
  );
};

export const PwaInstallGuideModal = IosInstallGuideModal;

