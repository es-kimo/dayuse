import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AbortChallengeModal } from './AbortChallengeModal';
import { challengesApi } from '../api/challenges';

vi.mock('../api/challenges', () => ({
  challengesApi: {
    abortChallenge: vi.fn(),
  },
}));

describe('AbortChallengeModal (F05)', () => {
  it('모달이 열렸을 때 경고 안내와 중단하기 버튼이 렌더링된다', () => {
    render(
      <AbortChallengeModal
        challengeId={10}
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: '챌린지를 중단할까요?' })).toBeInTheDocument();
    expect(screen.getByText(/중단하면 다시 시작할 수 없어요/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/모임 일정이 바뀌었어요/)).toBeInTheDocument();
  });

  it('사유 입력 후 중단하기 버튼을 클릭하면 abortChallenge API를 호출한다', async () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();
    const mockUpdatedChallenge = { id: 10, status: 'ABORTED' } as any;

    vi.mocked(challengesApi.abortChallenge).mockResolvedValueOnce(mockUpdatedChallenge);

    render(
      <AbortChallengeModal
        challengeId={10}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByPlaceholderText(/모임 일정이 바뀌었어요/);
    fireEvent.change(textarea, { target: { value: '일정 변경으로 중단' } });

    const submitBtn = screen.getByRole('button', { name: '중단하기' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(challengesApi.abortChallenge).toHaveBeenCalledWith(10, {
        reason: '일정 변경으로 중단',
      });
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUpdatedChallenge);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
