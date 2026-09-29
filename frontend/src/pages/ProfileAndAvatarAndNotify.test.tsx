import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileHeader } from '../components/ProfileHeader';
import { DayuColorPicker } from '../components/DayuColorPicker';
import { NotifyTimeChips } from '../components/NotifyTimeChips';
import { PushPreview } from '../components/PushPreview';

describe('13 내 정보 - ProfileHeader 컴포넌트', () => {
  it('닉네임과 데이유 아바타를 올바르게 렌더링하고 클릭 핸들러를 호출한다', () => {
    const handleAvatarClick = vi.fn();
    render(
      <ProfileHeader
        nickname="테스트유저"
        dayuColor="mint"
        onAvatarClick={handleAvatarClick}
      />
    );

    expect(screen.getByText('테스트유저')).toBeInTheDocument();
    expect(screen.getByText('카카오 계정 연동됨')).toBeInTheDocument();

    const avatarButton = screen.getByRole('button', { name: '프로필 데이유 색 바꾸기' });
    expect(avatarButton).toBeInTheDocument();
    fireEvent.click(avatarButton);
    expect(handleAvatarClick).toHaveBeenCalledTimes(1);
  });
});

describe('14 프로필 데이유 - DayuColorPicker 컴포넌트', () => {
  it('10가지 데이유 색상 버튼과 랜덤 변경 버튼을 렌더링하고 이벤트를 처리한다', () => {
    const handleColorSelect = vi.fn();

    render(
      <DayuColorPicker
        selectedColor="blue"
        onColorSelect={handleColorSelect}
      />
    );

    expect(screen.getByText('색 고르기')).toBeInTheDocument();
    expect(screen.getByText('랜덤으로 바꾸기')).toBeInTheDocument();

    const colorGroup = screen.getByRole('radiogroup', { name: '데이유 색' });
    expect(colorGroup).toBeInTheDocument();

    // 민트 색상 선택
    const mintRadio = screen.getByRole('radio', { name: '민트' });
    fireEvent.click(mintRadio);
    expect(handleColorSelect).toHaveBeenCalledWith('mint');

    // 랜덤 변경 클릭
    const randomBtn = screen.getByRole('button', { name: /랜덤으로 바꾸기/ });
    fireEvent.click(randomBtn);
    expect(handleColorSelect).toHaveBeenCalledTimes(2);
  });
});

describe('15 알림 설정 - NotifyTimeChips & PushPreview 컴포넌트', () => {
  it('NotifyTimeChips가 20, 21, 22, 23시 칩과 직접 입력을 제공한다', () => {
    const handleTimeChange = vi.fn();
    render(
      <NotifyTimeChips
        selectedTime="21:00"
        onTimeChange={handleTimeChange}
      />
    );

    expect(screen.getByRole('button', { name: '20:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '21:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '22:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '23:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직접' })).toBeInTheDocument();

    // 22시 선택
    fireEvent.click(screen.getByRole('button', { name: '22:00' }));
    expect(handleTimeChange).toHaveBeenCalledWith('22:00');
  });

  it('PushPreview가 잠금화면 시간과 데이유즈 알림 카드를 올바르게 렌더링한다', () => {
    render(
      <PushPreview
        time="21:00"
      />
    );

    expect(screen.getByText('21:00')).toBeInTheDocument();
    expect(screen.getByText('데이유즈')).toBeInTheDocument();
    expect(screen.getByText('지금')).toBeInTheDocument();
    expect(screen.getByText(/오늘 인증할 챌린지가 1개 남았어요/)).toBeInTheDocument();
  });
});
