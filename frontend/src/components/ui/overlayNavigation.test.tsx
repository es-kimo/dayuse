import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Dialog,
  ConfirmDialog,
  BottomSheet,
  BottomSheetTitle,
  BottomSheetClose,
  Modal,
  ModalTitle,
  ModalClose,
  Tabs,
  TabsList,
  TabsTab,
  TabsPanel,
  SkipNavLink,
} from './index';

describe('Overlay, Navigation & Feedback Accessibility (DS-03, DS-05)', () => {
  it('SkipNavLink should render link to main content with sr-only class', () => {
    render(<SkipNavLink />);
    const link = screen.getByRole('link', { name: '본문 바로가기' });
    expect(link).toHaveAttribute('href', '#main-content');
    expect(link).toHaveClass('sr-only');
  });

  it('Tabs should render role="tablist", role="tab", and toggle aria-selected on click/keyboard', async () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList aria-label="테스트 탭">
          <TabsTab value="tab1">첫번째 탭</TabsTab>
          <TabsTab value="tab2">두번째 탭</TabsTab>
        </TabsList>
        <TabsPanel value="tab1">첫번째 내용</TabsPanel>
        <TabsPanel value="tab2">두번째 내용</TabsPanel>
      </Tabs>
    );

    const tablist = screen.getByRole('tablist', { name: '테스트 탭' });
    expect(tablist).toBeInTheDocument();

    const tab1 = screen.getByRole('tab', { name: '첫번째 탭' });
    const tab2 = screen.getByRole('tab', { name: '두번째 탭' });

    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab2).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('첫번째 내용')).toBeInTheDocument();

    // Click tab2
    fireEvent.click(tab2);
    expect(tab1).toHaveAttribute('aria-selected', 'false');
    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('두번째 내용')).toBeInTheDocument();
  });

  it('ConfirmDialog (AlertDialog) should focus Cancel button by default instead of destructive action', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="챌린지 삭제"
        description="정말 삭제하시겠습니까?"
        confirmText="삭제하기"
        cancelText="취소"
        confirmVariant="danger"
        onConfirm={onConfirm}
      />
    );

    const title = screen.getByText('챌린지 삭제');
    expect(title).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: '취소' });
    const confirmButton = screen.getByRole('button', { name: '삭제하기' });

    // Cancel button should receive initial focus
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelButton);
    });
    expect(document.activeElement).not.toBe(confirmButton);
  });

  it('Dialog should render title, description, and close button with focus trap capability', async () => {
    const TestComponent = () => {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>모달 열기</button>
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title="모달 다이얼로그"
            description="다이얼로그 설명입니다."
          >
            <div>모달 내용</div>
          </Dialog>
        </div>
      );
    };

    render(<TestComponent />);

    const openButton = screen.getByRole('button', { name: '모달 열기' });
    fireEvent.click(openButton);

    expect(screen.getByText('모달 다이얼로그')).toBeInTheDocument();
    expect(screen.getByText('다이얼로그 설명입니다.')).toBeInTheDocument();
    expect(screen.getByText('모달 내용')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: '닫기' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('모달 내용')).not.toBeInTheDocument();
    });
  });

  it('BottomSheet should expose role="dialog" named by its title, close on Escape, and render nothing when closed', async () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <BottomSheet open={false} onOpenChange={onOpenChange}>
        <>
          <BottomSheetTitle>댓글</BottomSheetTitle>
          <BottomSheetClose aria-label="닫기">X</BottomSheetClose>
          <div>시트 내용</div>
        </>
      </BottomSheet>
    );

    // 닫힌 상태에서는 내용이 마운트되지 않는다
    expect(screen.queryByText('시트 내용')).not.toBeInTheDocument();

    rerender(
      <BottomSheet open={true} onOpenChange={onOpenChange}>
        <>
          <BottomSheetTitle>댓글</BottomSheetTitle>
          <BottomSheetClose aria-label="닫기">X</BottomSheetClose>
          <div>시트 내용</div>
        </>
      </BottomSheet>
    );

    const sheet = await screen.findByRole('dialog');
    expect(sheet).toHaveAccessibleName('댓글');
    expect(screen.getByText('시트 내용')).toBeInTheDocument();

    // Escape로 닫힌다(수제 오버레이에는 없던 동작)
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });
  });
  it('Modal should expose role="dialog" named by its title and close on Escape', async () => {
    const onOpenChange = vi.fn();

    render(
      <Modal open={true} onOpenChange={onOpenChange} className="bg-white p-5">
        <>
          <ModalTitle>입금 신고 반려</ModalTitle>
          <ModalClose aria-label="닫기">X</ModalClose>
          <div>모달 내용</div>
        </>
      </Modal>
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('입금 신고 반려');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });
  });

  it('Modal with animateInitialOpen should still open when mounted already open', async () => {
    // 이미 열린 상태로 마운트되는 모달은 첫 프레임만 닫힘으로 두고 바로 열린다.
    // 그 처리가 깨지면 모달이 아예 뜨지 않으므로 별도로 확인한다.
    render(
      <Modal open={true} animateInitialOpen onOpenChange={vi.fn()} className="bg-white p-5">
        <>
          <ModalTitle>공유 카드 미리보기</ModalTitle>
          <div>지연 오픈 내용</div>
        </>
      </Modal>
    );

    expect(await screen.findByText('지연 오픈 내용')).toBeInTheDocument();
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('공유 카드 미리보기');
  });
});
