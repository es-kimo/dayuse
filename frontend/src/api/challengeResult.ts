import { apiClient } from './client';
import type {
  ChallengeParticipantResult,
  ChallengeResultDetail,
  EndedChallengesSummaryResponse,
} from '../types';

export const challengeResultApi = {
  /**
   * 챌린지 결과 상세 조회
   */
  getResult: async (groupId: number, challengeId: number): Promise<ChallengeResultDetail> => {
    const res = await apiClient.get<ChallengeResultDetail>(
      `/groups/${groupId}/challenges/${challengeId}/result`
    );
    return res.data;
  },

  /**
   * 확정 결과 상세 확인(acknowledge) 처리 (F02, 5.5)
   */
  acknowledgeResult: async (groupId: number, challengeId: number): Promise<ChallengeParticipantResult> => {
    const res = await apiClient.post<ChallengeParticipantResult>(
      `/groups/${groupId}/challenges/${challengeId}/result/acknowledge`
    );
    return res.data;
  },

  /**
   * 전체 종료 챌린지 요약 및 미확인 건수 조회 (F02, F04)
   */
  getEndedChallengesSummary: async (): Promise<EndedChallengesSummaryResponse> => {
    const res = await apiClient.get<EndedChallengesSummaryResponse>('/challenges/ended-summary');
    return res.data;
  },

  /**
   * 로컬 개발/테스트용 종료 챌린지 샘플 4종 즉시 시딩 (F02~F04 테스트 편의)
   */
  seedEndedSamples: async (): Promise<{ message: string; createdCount: number }> => {
    const res = await apiClient.post<{ message: string; createdCount: number }>(
      '/challenges/seed-ended-samples'
    );
    return res.data;
  },
};
