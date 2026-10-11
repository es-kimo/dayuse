import { apiClient } from './client';

export type CoinTransactionType =
  | 'GRANT'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'HOLD'
  | 'RELEASE'
  | 'REJECT';

export type CoinTransactionStatus = 'COMPLETED' | 'HELD' | 'REJECTED';

export interface CoinBalanceResponse {
  userId: number;
  availableBalance: number;
  heldBalance: number;
  totalBalance: number;
  updatedAt: string;
}

export interface CoinTransactionResponse {
  id: number;
  userId: number;
  type: CoinTransactionType;
  amount: number;
  balanceAfter: number;
  heldBalanceAfter: number;
  targetDate: string;
  challengeId?: number;
  verificationId?: number;
  idempotencyKey: string;
  status: CoinTransactionStatus;
  reason?: string;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const getMyCoinBalance = async (): Promise<CoinBalanceResponse> => {
  const response = await apiClient.get<CoinBalanceResponse>('/coins/me/balance');
  return response.data;
};

export const getMyCoinTransactions = async (
  page = 0,
  size = 20
): Promise<PageResponse<CoinTransactionResponse>> => {
  const response = await apiClient.get<PageResponse<CoinTransactionResponse>>(
    '/coins/me/transactions',
    { params: { page, size } }
  );
  return response.data;
};
