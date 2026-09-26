import React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react';

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 열림·닫힘 애니메이션이 끝난 뒤 호출된다.
   * 부모가 시트를 조건부로 마운트하는 경우, 여기서 부모 상태를 비워야
   * 이탈 전환이 끝나기 전에 노드가 사라지지 않는다.
   */
  onOpenChangeComplete?: (open: boolean) => void;
  /** 'tall'은 목록형 시트(70dvh 고정), 'auto'는 내용 높이(최대 90dvh) */
  size?: 'auto' | 'tall';
  /** 제출 중처럼 닫히면 안 되는 동안 백드롭 탭·Escape로 닫히지 않게 한다 */
  disablePointerDismissal?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * 바텀시트 공통 래퍼.
 *
 * Base UI Dialog를 쓰는 이유: Portal, 포커스 트랩, Escape 닫기, 닫힐 때 트리거로
 * 포커스 복귀, 배경 스크롤 잠금을 직접 구현하지 않기 위해서다.
 *
 * 애니메이션은 키프레임이 아니라 전환이다. 시트는 열고 닫는 게 반복되고
 * 중간에 끊길 수 있어서, 키프레임처럼 0부터 다시 시작하면 튄다.
 * 곡선은 iOS 시트와 같은 --ease-drawer, 시간은 300ms(모달·시트 예산 200~500ms).
 *
 * 헤더·본문·푸터 마크업은 시트마다 달라서 여기서 강제하지 않는다.
 * 대신 접근성 연결을 위해 BottomSheetTitle / BottomSheetDescription /
 * BottomSheetClose를 쓴다.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  size = 'auto',
  disablePointerDismissal = false,
  children,
  className = '',
}) => (
  <BaseDialog.Root
    open={open}
    onOpenChange={onOpenChange}
    onOpenChangeComplete={onOpenChangeComplete}
    disablePointerDismissal={disablePointerDismissal}
  >
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-sheet bg-night/60 backdrop-blur-xs transition-opacity duration-300 ease-drawer data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
      <div className="fixed inset-0 z-sheet flex items-end justify-center p-0 sm:items-center sm:p-4 pointer-events-none">
        <BaseDialog.Popup
          className={`pointer-events-auto w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-sheet flex flex-col overflow-hidden focus-ring ${
            size === 'tall' ? 'h-[70dvh] max-h-[600px]' : 'max-h-[90dvh]'
          } transition-[translate] duration-300 ease-drawer data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full ${className}`}
        >
          {children}
        </BaseDialog.Popup>
      </div>
    </BaseDialog.Portal>
  </BaseDialog.Root>
);

export const BottomSheetTitle = BaseDialog.Title;
export const BottomSheetDescription = BaseDialog.Description;
export const BottomSheetClose = BaseDialog.Close;
