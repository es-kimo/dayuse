import { apiClient } from './client';
import type {
  GroupAccount,
  GroupAccountPayload,
  UnpaidRecordItem,
  CreateDepositReportPayload,
  RejectDepositReportPayload,
  CancelConfirmationPayload,
  DepositReportDetail,
  DepositReportStatus,
  SettlementSummary,
} from '../types';

export const settlementApi = {
  getGroupAccount: async (groupId: number): Promise<GroupAccount | null> => {
    const response = await apiClient.get<GroupAccount | null>(`/groups/${groupId}/account`);
    return response.data;
  },

  updateGroupAccount: async (groupId: number, payload: GroupAccountPayload): Promise<GroupAccount> => {
    const response = await apiClient.put<GroupAccount>(`/groups/${groupId}/account`, payload);
    return response.data;
  },

  getUnpaidRecords: async (groupId: number): Promise<UnpaidRecordItem[]> => {
    const response = await apiClient.get<UnpaidRecordItem[]>(`/groups/${groupId}/unpaid-records`);
    return response.data;
  },

  createDepositReport: async (
    groupId: number,
    payload: CreateDepositReportPayload
  ): Promise<DepositReportDetail> => {
    const response = await apiClient.post<DepositReportDetail>(`/groups/${groupId}/deposit-reports`, payload);
    return response.data;
  },

  cancelDepositReport: async (reportId: number): Promise<DepositReportDetail> => {
    const response = await apiClient.delete<DepositReportDetail>(`/deposit-reports/${reportId}`);
    return response.data;
  },

  getDepositReports: async (
    groupId: number,
    status?: DepositReportStatus
  ): Promise<DepositReportDetail[]> => {
    const response = await apiClient.get<DepositReportDetail[]>(`/groups/${groupId}/deposit-reports`, {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  getDepositReportDetail: async (reportId: number): Promise<DepositReportDetail> => {
    const response = await apiClient.get<DepositReportDetail>(`/deposit-reports/${reportId}`);
    return response.data;
  },

  confirmDepositReport: async (reportId: number): Promise<DepositReportDetail> => {
    const response = await apiClient.post<DepositReportDetail>(`/deposit-reports/${reportId}/confirm`);
    return response.data;
  },

  rejectDepositReport: async (
    reportId: number,
    payload: RejectDepositReportPayload
  ): Promise<DepositReportDetail> => {
    const response = await apiClient.post<DepositReportDetail>(`/deposit-reports/${reportId}/reject`, payload);
    return response.data;
  },

  cancelConfirmation: async (
    reportId: number,
    payload: CancelConfirmationPayload
  ): Promise<DepositReportDetail> => {
    const response = await apiClient.post<DepositReportDetail>(
      `/deposit-reports/${reportId}/cancel-confirmation`,
      payload
    );
    return response.data;
  },

  getSettlementSummary: async (groupId: number): Promise<SettlementSummary> => {
    const response = await apiClient.get<SettlementSummary>(`/groups/${groupId}/settlement-summary`);
    return response.data;
  },
};
