import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';
import { DAYU_COLORS, DAYU_COLOR_IDS } from '../components/dayu/dayuColors';

const auth = vi.hoisted(() => ({
  user: { id: 1, nickname: '테스트유저', profileImageUrl: null as string | null },
  updateUserNickname: vi.fn(), logout: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../context/UiVersionContext', () => ({ useUiVersion: () => ({ uiVersion: 'B' }) }));

function expectAvatar(color: keyof typeof DAYU_COLORS) {
  const button = screen.getByRole('button', { name: '프로필 데이유 색 바꾸기' });
  expect(button.firstElementChild).toHaveStyle({ background: DAYU_COLORS[color].bg });
  expect(button.querySelector('svg rect')).toHaveAttribute('fill', DAYU_COLORS[color].fg);
}

describe('내 정보 데이유 색상', () => {
  it.each(DAYU_COLOR_IDS)('저장된 %s 색상을 표시한다', (color) => {
    auth.user.profileImageUrl = `dayu:${color}`;
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expectAvatar(color);
  });

  it.each([null, 'dayu:unknown', 'https://example.com/avatar.png'])('색상 정보가 없는 %s는 기본 파랑을 표시한다', (value) => {
    auth.user.profileImageUrl = value;
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expectAvatar('blue');
  });

  it('사용자 정보가 갱신되면 변경된 색상을 표시한다', () => {
    auth.user.profileImageUrl = 'dayu:mint';
    const { rerender } = render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expectAvatar('mint');
    auth.user.profileImageUrl = 'dayu:purple';
    rerender(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expectAvatar('purple');
  });
});
