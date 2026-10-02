import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { VerificationModal } from './VerificationModal';

const mocks = vi.hoisted(() => ({ standalone: false, success: vi.fn(), guide: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { nickname: '테스터' } }) }));
vi.mock('../utils/pwaAnalytics', () => ({ logPwaImpression: vi.fn(), logPwaGuideOpen: mocks.guide }));
vi.mock('../utils/webPush', () => ({ isStandalone: () => mocks.standalone, isIos: () => false }));
vi.mock('./ShareCardModal', () => ({ ShareCardModal: () => <div>공유 카드 화면</div> }));
vi.mock('./IosInstallGuideModal', () => ({ IosInstallGuideModal: () => <div>설치 안내 화면</div> }));
vi.mock('../api/verifications', () => ({ verificationsApi: {
  getPresignedUrl: vi.fn().mockResolvedValue({ presignedUrl: 'https://example.com/upload', imageKey: 'image.png' }),
  uploadToS3: vi.fn().mockResolvedValue(undefined),
  createVerification: vi.fn().mockResolvedValue({ id: 1, imageUrl: 'image.png', targetDate: '2026-09-30' }),
} }));

async function completeVerification() {
  const { container } = render(<VerificationModal action={{ challengeId: 1, challengeTitle: '매일 운동하기' }} onClose={vi.fn()} onSuccess={mocks.success} />);
  await screen.findByText('오늘 사진 인증');
  const input = document.querySelector('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [new File(['image'], 'test.png', { type: 'image/png' })] } });
  fireEvent.click(screen.getByRole('button', { name: '인증 완료하기' }));
  await screen.findByText('인증을 완료했어요!');
  return container;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.standalone = false;
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('인증 완료 모달', () => {
  it('확인 버튼으로 완료 콜백을 실행한다', async () => {
    await completeVerification();
    expect(screen.getByRole('button', { name: /홈 화면에 추가하기/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1));
  });
  it('설치형 앱에서는 설치 안내 없이 공유 카드를 열 수 있다', async () => {
    mocks.standalone = true;
    await completeVerification();
    expect(screen.queryByRole('button', { name: /홈 화면에 추가하기/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '인증 카드 공유하기' }));
    expect(await screen.findByText('공유 카드 화면')).toBeVisible();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('설치 안내를 누르면 안내 화면으로 이동한다', async () => {
    await completeVerification();
    fireEvent.click(screen.getByRole('button', { name: /홈 화면에 추가하기/ }));
    expect(await screen.findByText('설치 안내 화면')).toBeVisible();
    expect(mocks.guide).toHaveBeenCalledWith('verification_success');
  });
});
