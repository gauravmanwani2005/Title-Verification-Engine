/**
 * Shared in-memory submission store.
 *
 * When an applicant completes a verification, the result is pushed here.
 * The officer dashboard reads from this store — so submissions appear
 * in the officer queue and recent activity in real time.
 *
 * In production this would be replaced by a backend API + WebSocket/polling.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { VerificationResult } from '@/types';

export interface SubmissionEntry {
  result: VerificationResult;
  submittedAt: string; // ISO timestamp
  submittedBy: string; // applicant name (demo)
}

interface SubmissionStoreValue {
  submissions: SubmissionEntry[];
  addSubmission: (result: VerificationResult) => void;
}

const SubmissionStoreContext = createContext<SubmissionStoreValue>({
  submissions: [],
  addSubmission: () => {},
});

export function SubmissionStoreProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);

  function addSubmission(result: VerificationResult) {
    const entry: SubmissionEntry = {
      result,
      submittedAt: new Date().toISOString(),
      submittedBy: 'Applicant (Demo)',
    };
    // Prepend so newest appears first
    setSubmissions(prev => [entry, ...prev]);
  }

  return (
    <SubmissionStoreContext.Provider value={{ submissions, addSubmission }}>
      {children}
    </SubmissionStoreContext.Provider>
  );
}

export function useSubmissionStore() {
  return useContext(SubmissionStoreContext);
}
