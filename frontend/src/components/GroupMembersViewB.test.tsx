import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GroupMembersViewB } from './GroupMembersViewB';
import type { GroupDetail } from '../types';

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));
const code = '8417002c-b715-4381-846a-f92eb40fdd03';
const group: GroupDetail = {
  id: 1, name: '모임', hostUserId: 1, inviteCode: code,
  inviteCodeIssuedAt: '2026-09-29T00:00:00', isHost: true, memberCount: 0, members: [],
};
function renderInvite() {
  render(<GroupMembersViewB group={group} inviteUrl={`https://dayuse.kr/invite/${code}`}
    isHost onRefreshInviteCode={vi.fn()} isRefreshing={false} />);
}
describe('친구 초대 코드 펼치기', () => {
  it('기본으로 접혀 있고 버튼으로 펼치거나 접을 수 있다', () => {
    renderInvite();
    expect(screen.getByText(code)).not.toBeVisible();
    const toggle = screen.getByRole('button', { name: '초대 코드 보기' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByText(code)).toBeVisible();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: '코드 복사' })).toBeVisible();
    fireEvent.click(toggle);
    expect(screen.getByText(code)).not.toBeVisible();
  });
  it('코드 복사는 링크가 아닌 전체 초대 코드를 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    try {
      renderInvite();
      fireEvent.click(screen.getByRole('button', { name: '초대 코드 보기' }));
      fireEvent.click(screen.getByRole('button', { name: '코드 복사' }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(code));
      expect(showToast).toHaveBeenCalledWith('초대 코드가 복사되었습니다!', 'success');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
