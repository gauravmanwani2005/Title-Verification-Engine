// ─── Core Verification Types ────────────────────────────────────────────────

export type VerificationStatus = 'APPROVED' | 'REJECTED' | 'REVIEW';

export interface TitleVerificationRequest {
  title: string;
  language: string;
  periodicity: string;
  state?: string;
  district?: string;
  applicantId?: string;
}

export interface RiskBreakdown {
  lexical: number;
  phonetic: number;
  semantic: number;
  ruleViolation: number;
  overall: number;
}

export interface RuleCheck {
  id: string;
  name: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  description: string;
  detail?: string;
}

export interface SimilarityMatch {
  id: string;
  title: string;
  registrationNumber: string;
  language: string;
  periodicity: string;
  publisher: string;
  state: string;
  registrationDate: string;
  similarityScore: number;
  matchTypes: string[];
}

export interface VerificationResult {
  submissionId: string;
  proposedTitle: string;
  language: string;
  periodicity: string;
  status: VerificationStatus;
  verificationProbability: number;
  similarityScore: number;
  riskBreakdown: RiskBreakdown;
  ruleChecks: RuleCheck[];
  matches: SimilarityMatch[];
  explanation: string;
  reasons: string[];
  aiCallInvoked: boolean;
  processingTimeMs: number;
  timestamp: string;
}

// ─── Analysis Step Types ─────────────────────────────────────────────────────

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done';
}

// ─── Title Database Types ────────────────────────────────────────────────────

export interface RegisteredTitle {
  id: string;
  title: string;
  registrationNumber: string;
  language: string;
  periodicity: string;
  publisher: string;
  owner: string;
  state: string;
  district: string;
  registrationDate: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';
}

// ─── Verification History Types ───────────────────────────────────────────────

export interface VerificationHistoryItem {
  id: string;
  proposedTitle: string;
  language: string;
  status: VerificationStatus;
  verificationProbability: number;
  similarityScore: number;
  reviewer?: string;
  timestamp: string;
}

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface DailyVerificationStat {
  date: string;
  approved: number;
  rejected: number;
  review: number;
}

export interface LanguageDistribution {
  language: string;
  count: number;
  percentage: number;
}

export interface RejectionReason {
  reason: string;
  count: number;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRegisteredTitles: number;
  titlesVerifiedToday: number;
  highRiskMatches: number;
  averageVerificationTimeMs: number;
}
