import React, { createContext, useContext, useState, useCallback } from 'react';

export interface VerificationDraft {
  challengeId: number;
  challengeTitle: string;
  verificationCriteria?: string;
  groupId?: number;
  recordId?: number;
  targetDate?: string;
  comment: string;
  file: File | null;
  previewUrl: string | null;
}

interface VerificationDraftContextType {
  draft: VerificationDraft | null;
  saveDraft: (draft: VerificationDraft) => void;
  clearDraft: () => void;
  hasDraftFor: (challengeId: number, recordId?: number) => boolean;
}

const VerificationDraftContext = createContext<VerificationDraftContextType | undefined>(undefined);

export const VerificationDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [draft, setDraft] = useState<VerificationDraft | null>(null);

  const saveDraft = useCallback((newDraft: VerificationDraft) => {
    setDraft(newDraft);
  }, []);

  const clearDraft = useCallback(() => {
    setDraft((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const hasDraftFor = useCallback((challengeId: number, recordId?: number) => {
    if (!draft) return false;
    return draft.challengeId === challengeId && (draft.recordId ?? null) === (recordId ?? null);
  }, [draft]);

  return (
    <VerificationDraftContext.Provider
      value={{
        draft,
        saveDraft,
        clearDraft,
        hasDraftFor,
      }}
    >
      {children}
    </VerificationDraftContext.Provider>
  );
};

export const useVerificationDraft = (): VerificationDraftContextType => {
  const context = useContext(VerificationDraftContext);
  if (!context) {
    throw new Error('useVerificationDraft must be used within a VerificationDraftProvider');
  }
  return context;
};
