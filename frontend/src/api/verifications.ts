import { apiClient } from './client';
import axios from 'axios';
import type {
  PresignedUrlResponse,
  VerificationDetail,
  FeedPageResponse,
  CommentItem,
} from '../types';

export const verificationsApi = {
  getPresignedUrl: async (payload: {
    challengeId: number;
    filename: string;
    contentType: string;
    fileSize: number;
  }): Promise<PresignedUrlResponse> => {
    const res = await apiClient.post<PresignedUrlResponse>('/verifications/presigned-url', payload);
    return res.data;
  },

  uploadToS3: async (presignedUrl: string, file: File): Promise<void> => {
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  },

  createVerification: async (payload: {
    challengeId: number;
    imageUrl: string;
    comment?: string;
    targetDate?: string;
  }): Promise<VerificationDetail> => {
    const res = await apiClient.post<VerificationDetail>('/verifications', payload);
    return res.data;
  },

  updateVerification: async (
    verificationId: number,
    payload: { imageUrl?: string; comment?: string }
  ): Promise<VerificationDetail> => {
    const res = await apiClient.patch<VerificationDetail>(`/verifications/${verificationId}`, payload);
    return res.data;
  },

  deleteVerification: async (verificationId: number): Promise<void> => {
    await apiClient.delete(`/verifications/${verificationId}`);
  },

  getGroupFeed: async (groupId: number, page = 0, size = 10): Promise<FeedPageResponse> => {
    const res = await apiClient.get<FeedPageResponse>(`/groups/${groupId}/feed`, {
      params: { page, size, sort: 'createdAt,desc' },
    });
    return res.data;
  },

  getComments: async (verificationId: number): Promise<CommentItem[]> => {
    const res = await apiClient.get<CommentItem[]>(`/verifications/${verificationId}/comments`);
    return res.data;
  },

  createComment: async (verificationId: number, content: string): Promise<CommentItem> => {
    const res = await apiClient.post<CommentItem>(`/verifications/${verificationId}/comments`, { content });
    return res.data;
  },

  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },
};
