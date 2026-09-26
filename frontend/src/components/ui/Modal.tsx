import React, { useEffect, useState } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react';

/**
 * 이미 열린 상태로 마운트될 때도 진입 전환을 돌린다.
 *
 * Base UI는 첫 렌더에 열려 있으면 'starting' 단계를 건너뛴다
 * (internals/useTransitionStatus.js의 animateInitialOpen, 기본 off이고 프롭으로 노출되지 않음).
 * 부모가 조건부로 마운트하는 모달은 그래서 진입 애니메이션 없이 튀어나온다.
 * 첫 프레임만 닫힘으로 두고 바로 열어서 닫힘 → 열림 전환을 만들어준다.
 *
 * effect가 필요한 이유가 여기에 있으므로, 각 모달에서 반복하지 않고 이 한 곳에만 둔다.
 */
const useDeferredOpen = (open: boolean, defer: boolean): boolean => {
  const [ready, setReady] = useState(!defer);

  useEffect(() => {
    setReady(true);
  }, []);

  return open && ready;
};

/** index.css의 z-index 스케일. 컴포넌트에 숫자를 직접 쓰지 않기 위해 여기서만 매핑한다. */
const layerClass = {
  sheet: 'z-sheet',
  modal: 'z-modal',
  'modal-top': 'z-modal-top',
} as const;

const placementClass = {
  center: 'items-center justify-center p-4',
  bottom: 'items-end justify-center p-0 sm:items-center sm:p-4',
} as const;

/*
 * 중앙 모달은 화면 중앙에서 나타나므로 transform-origin: center가 맞다(트리거 기준이 아니다).
 * 아래에서 올라오는 모달은 자기 높이만큼(translate-y-full) 아래에서 올라온다.
 */
const motionClass = {
  center:
    'transition duration-200 ease-out data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
  bottom:
    'transition-[translate] duration-300 ease-drawer data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full',
} as const;

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 열림·닫힘 애니메이션이 끝난 뒤 호출된다. 부모가 조건부 마운트할 때 여기서 정리한다. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** 부모가 이미 열린 상태로 마운트하는 경우 true로 둬야 진입 전환이 돈다. */
  animateInitialOpen?: boolean;
  layer?: keyof typeof layerClass;
  placement?: keyof typeof placementClass;
  /** 백드롭 색·블러. 화면마다 다르므로 호출부가 정한다. */
  backdropClassName?: string;
  /** 제출 중처럼 닫히면 안 되는 동안 백드롭 탭·Escape를 막는다. */
  disablePointerDismissal?: boolean;
  /**
   * 팝업 자체의 외형(배경·모서리·패딩·크기)은 호출부가 정한다.
   * 여기서 기본값을 주면 호출부 클래스와 충돌하는데, Tailwind는 클래스 문자열 순서로
   * 충돌을 해결하지 않아서(생성된 CSS 순서가 이긴다) 덮어쓰기가 불안정해진다.
   */
  className?: string;
  children: React.ReactNode;
}

/**
 * 중앙(또는 모바일에서 아래) 정렬 모달의 공통 셸.
 *
 * Base UI Dialog를 쓰는 이유: Portal, 포커스 트랩, Escape 닫기, 닫힐 때 트리거로
 * 포커스 복귀, 배경 스크롤 잠금을 모달마다 직접 구현하지 않기 위해서다.
 * 시트형(항상 아래에서 올라오고 화면 폭을 채우는 것)은 BottomSheet를 쓴다.
 *
 * 제목·설명·닫기는 ModalTitle / ModalDescription / ModalClose로 연결해야
 * 스크린 리더에 다이얼로그 이름이 전달된다.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  animateInitialOpen = false,
  layer = 'modal',
  placement = 'center',
  backdropClassName = 'bg-night/60 backdrop-blur-2xs',
  disablePointerDismissal = false,
  className = '',
  children,
}) => {
  const effectiveOpen = useDeferredOpen(open, animateInitialOpen);

  return (
    <BaseDialog.Root
      open={effectiveOpen}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      disablePointerDismissal={disablePointerDismissal}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className={`fixed inset-0 ${layerClass[layer]} ${backdropClassName} transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0`}
        />
        <div
          className={`fixed inset-0 ${layerClass[layer]} flex ${placementClass[placement]} pointer-events-none`}
        >
          <BaseDialog.Popup
            className={`pointer-events-auto focus-ring ${motionClass[placement]} ${className}`}
          >
            {children}
          </BaseDialog.Popup>
        </div>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
};

export const ModalTitle = BaseDialog.Title;
export const ModalDescription = BaseDialog.Description;
export const ModalClose = BaseDialog.Close;
