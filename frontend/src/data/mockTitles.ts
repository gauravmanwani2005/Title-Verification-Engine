import type { RegisteredTitle, VerificationHistoryItem, DailyVerificationStat, LanguageDistribution, RejectionReason } from '@/types';

export const MOCK_REGISTERED_TITLES: RegisteredTitle[] = [
  { id: '1', title: 'Hindustan Times', registrationNumber: 'REG/1924/00001', language: 'English', periodicity: 'Daily', publisher: 'HT Media Ltd', owner: 'HT Media Ltd', state: 'Delhi', district: 'New Delhi', registrationDate: '1924-09-15', status: 'ACTIVE' },
  { id: '2', title: 'Dainik Bhaskar', registrationNumber: 'REG/1958/00043', language: 'Hindi', periodicity: 'Daily', publisher: 'DB Corp Ltd', owner: 'DB Corp Ltd', state: 'Madhya Pradesh', district: 'Bhopal', registrationDate: '1958-06-01', status: 'ACTIVE' },
  { id: '3', title: 'Amar Ujala', registrationNumber: 'REG/1948/00021', language: 'Hindi', periodicity: 'Daily', publisher: 'Amar Ujala Publications', owner: 'Amar Ujala Publications', state: 'Uttar Pradesh', district: 'Agra', registrationDate: '1948-04-18', status: 'ACTIVE' },
  { id: '4', title: 'The Hindu', registrationNumber: 'REG/1878/00002', language: 'English', periodicity: 'Daily', publisher: 'Kasturi & Sons Ltd', owner: 'Kasturi & Sons Ltd', state: 'Tamil Nadu', district: 'Chennai', registrationDate: '1878-09-20', status: 'ACTIVE' },
  { id: '5', title: 'Deccan Herald', registrationNumber: 'REG/1948/00031', language: 'English', periodicity: 'Daily', publisher: 'The Printers (Mysore) Pvt Ltd', owner: 'The Printers (Mysore) Pvt Ltd', state: 'Karnataka', district: 'Bengaluru', registrationDate: '1948-06-17', status: 'ACTIVE' },
  { id: '6', title: 'Navbharat Times', registrationNumber: 'REG/1950/00055', language: 'Hindi', periodicity: 'Daily', publisher: 'Bennett Coleman & Co', owner: 'Bennett Coleman & Co', state: 'Delhi', district: 'New Delhi', registrationDate: '1950-03-10', status: 'ACTIVE' },
  { id: '7', title: 'Bharat Samachar', registrationNumber: 'REG/2012/04521', language: 'Hindi', periodicity: 'Daily', publisher: 'Bharat Media Group', owner: 'Ramesh Kumar Sharma', state: 'Uttar Pradesh', district: 'Lucknow', registrationDate: '2012-07-22', status: 'ACTIVE' },
  { id: '8', title: 'Bharat Samachar Daily', registrationNumber: 'REG/2015/06712', language: 'Hindi', periodicity: 'Daily', publisher: 'Samachar Prakashan', owner: 'Sunita Devi', state: 'Bihar', district: 'Patna', registrationDate: '2015-01-15', status: 'ACTIVE' },
  { id: '9', title: 'India Today', registrationNumber: 'REG/1975/00112', language: 'English', periodicity: 'Weekly', publisher: 'Living Media India Ltd', owner: 'Living Media India Ltd', state: 'Delhi', district: 'New Delhi', registrationDate: '1975-12-25', status: 'ACTIVE' },
  { id: '10', title: 'Lokmat', registrationNumber: 'REG/1971/00341', language: 'Marathi', periodicity: 'Daily', publisher: 'Lokmat Media Pvt Ltd', owner: 'Lokmat Media Pvt Ltd', state: 'Maharashtra', district: 'Aurangabad', registrationDate: '1971-11-01', status: 'ACTIVE' },
  { id: '11', title: 'Ananda Bazar Patrika', registrationNumber: 'REG/1922/00008', language: 'Bengali', periodicity: 'Daily', publisher: 'ABP Pvt Ltd', owner: 'ABP Pvt Ltd', state: 'West Bengal', district: 'Kolkata', registrationDate: '1922-03-14', status: 'ACTIVE' },
  { id: '12', title: 'Dinamani', registrationNumber: 'REG/1933/00019', language: 'Tamil', periodicity: 'Daily', publisher: 'Express Publications (Madurai) Ltd', owner: 'Indian Express Group', state: 'Tamil Nadu', district: 'Madurai', registrationDate: '1933-10-03', status: 'ACTIVE' },
  { id: '13', title: 'Eenadu', registrationNumber: 'REG/1974/00289', language: 'Telugu', periodicity: 'Daily', publisher: 'Ushodaya Enterprises', owner: 'Ramoji Rao', state: 'Andhra Pradesh', district: 'Vishakhapatnam', registrationDate: '1974-08-10', status: 'ACTIVE' },
  { id: '14', title: 'Gujarat Samachar', registrationNumber: 'REG/1932/00017', language: 'Gujarati', periodicity: 'Daily', publisher: 'Gujarat Samachar Ltd', owner: 'Shantilal Shah', state: 'Gujarat', district: 'Ahmedabad', registrationDate: '1932-01-05', status: 'ACTIVE' },
  { id: '15', title: 'Namaskar Bharat', registrationNumber: 'REG/2018/09134', language: 'Hindi', periodicity: 'Weekly', publisher: 'Namaskar Media', owner: 'Vikram Singh', state: 'Rajasthan', district: 'Jaipur', registrationDate: '2018-04-30', status: 'ACTIVE' },
  { id: '16', title: 'Pratidin', registrationNumber: 'REG/1999/02341', language: 'Bengali', periodicity: 'Daily', publisher: 'Star Ananda', owner: 'Star Network', state: 'West Bengal', district: 'Kolkata', registrationDate: '1999-08-15', status: 'ACTIVE' },
  { id: '17', title: 'Samachar Jagat', registrationNumber: 'REG/2005/03892', language: 'Hindi', periodicity: 'Daily', publisher: 'Jagat Publications', owner: 'Mohan Lal', state: 'Haryana', district: 'Gurugram', registrationDate: '2005-02-14', status: 'ACTIVE' },
  { id: '18', title: 'Rashtriya Sahara', registrationNumber: 'REG/1991/01234', language: 'Hindi', periodicity: 'Daily', publisher: 'Sahara India Mass Communication', owner: 'Sahara Group', state: 'Uttar Pradesh', district: 'Lucknow', registrationDate: '1991-07-07', status: 'ACTIVE' },
  { id: '19', title: 'Mumbai Mirror', registrationNumber: 'REG/2005/03741', language: 'English', periodicity: 'Daily', publisher: 'Bennett Coleman & Co', owner: 'Times Group', state: 'Maharashtra', district: 'Mumbai', registrationDate: '2005-05-15', status: 'CANCELLED' },
  { id: '20', title: 'Sandesh', registrationNumber: 'REG/1923/00011', language: 'Gujarati', periodicity: 'Daily', publisher: 'Sandesh Ltd', owner: 'Falgunbhai Patel', state: 'Gujarat', district: 'Ahmedabad', registrationDate: '1923-12-10', status: 'ACTIVE' },

  // ── Titles from API specification test cases ──────────────────────────────
  { id: '21', title: 'Maharashtra Express', registrationNumber: 'REG/2003/02891', language: 'English', periodicity: 'Daily', publisher: 'Maharashtra Media Corp', owner: 'Suresh Patil', state: 'Maharashtra', district: 'Pune', registrationDate: '2003-03-12', status: 'ACTIVE' },
  { id: '22', title: 'Maharashtra Times', registrationNumber: 'REG/1996/01872', language: 'Marathi', periodicity: 'Daily', publisher: 'Bennett Coleman & Co', owner: 'Times Group', state: 'Maharashtra', district: 'Mumbai', registrationDate: '1996-08-01', status: 'ACTIVE' },
  { id: '23', title: 'Delhi Chronicle', registrationNumber: 'REG/2001/02134', language: 'English', periodicity: 'Daily', publisher: 'Delhi Chronicle Publications', owner: 'Rakesh Verma', state: 'Delhi', district: 'New Delhi', registrationDate: '2001-11-20', status: 'ACTIVE' },
  { id: '24', title: 'Rashtriya Samachar', registrationNumber: 'REG/2009/03412', language: 'Hindi', periodicity: 'Daily', publisher: 'Rashtriya Publications', owner: 'Arvind Kumar', state: 'Delhi', district: 'New Delhi', registrationDate: '2009-05-05', status: 'ACTIVE' },
  { id: '25', title: 'National Herald', registrationNumber: 'REG/1938/00007', language: 'English', periodicity: 'Daily', publisher: 'Associated Journals Ltd', owner: 'AJL', state: 'Delhi', district: 'New Delhi', registrationDate: '1938-09-09', status: 'ACTIVE' },
];

export const MOCK_VERIFICATION_HISTORY: VerificationHistoryItem[] = [
  { id: 'VRF-2024-0891', proposedTitle: 'Bharat Chronicle', language: 'Hindi', status: 'APPROVED', verificationProbability: 87, similarityScore: 13, timestamp: '2024-11-18T09:32:00Z' },
  { id: 'VRF-2024-0890', proposedTitle: 'India Today News', language: 'English', status: 'REJECTED', verificationProbability: 12, similarityScore: 88, timestamp: '2024-11-18T08:15:00Z' },
  { id: 'VRF-2024-0889', proposedTitle: 'Police Samachar', language: 'Hindi', status: 'REJECTED', verificationProbability: 0, similarityScore: 100, reviewer: 'System', timestamp: '2024-11-17T16:44:00Z' },
  { id: 'VRF-2024-0888', proposedTitle: 'Namaskar Bharat Daily', language: 'Hindi', status: 'REJECTED', verificationProbability: 5, similarityScore: 95, timestamp: '2024-11-17T14:20:00Z' },
  { id: 'VRF-2024-0887', proposedTitle: 'Sandhya Pratideen', language: 'Bengali', status: 'REVIEW', verificationProbability: 54, similarityScore: 46, reviewer: 'Officer A.K. Sharma', timestamp: '2024-11-17T11:05:00Z' },
  { id: 'VRF-2024-0886', proposedTitle: 'Deccan Morning Post', language: 'English', status: 'APPROVED', verificationProbability: 79, similarityScore: 21, timestamp: '2024-11-16T15:30:00Z' },
  { id: 'VRF-2024-0885', proposedTitle: 'Rashtriya Awaz', language: 'Hindi', status: 'APPROVED', verificationProbability: 83, similarityScore: 17, timestamp: '2024-11-16T10:12:00Z' },
  { id: 'VRF-2024-0884', proposedTitle: 'Gujarat Patrika', language: 'Gujarati', status: 'REVIEW', verificationProbability: 44, similarityScore: 56, reviewer: 'Officer P.R. Mehta', timestamp: '2024-11-15T13:45:00Z' },
  { id: 'VRF-2024-0883', proposedTitle: 'Tamil Kural Daily', language: 'Tamil', status: 'APPROVED', verificationProbability: 91, similarityScore: 9, timestamp: '2024-11-15T09:00:00Z' },
  { id: 'VRF-2024-0882', proposedTitle: 'Dainik Bharat', language: 'Hindi', status: 'REJECTED', verificationProbability: 18, similarityScore: 82, timestamp: '2024-11-14T17:22:00Z' },
];

export const MOCK_DAILY_STATS: DailyVerificationStat[] = [
  { date: 'Nov 12', approved: 34, rejected: 12, review: 8 },
  { date: 'Nov 13', approved: 41, rejected: 18, review: 11 },
  { date: 'Nov 14', approved: 28, rejected: 9, review: 6 },
  { date: 'Nov 15', approved: 52, rejected: 22, review: 14 },
  { date: 'Nov 16', approved: 38, rejected: 15, review: 9 },
  { date: 'Nov 17', approved: 47, rejected: 19, review: 12 },
  { date: 'Nov 18', approved: 33, rejected: 11, review: 7 },
];

export const MOCK_LANGUAGE_DISTRIBUTION: LanguageDistribution[] = [
  { language: 'Hindi', count: 58420, percentage: 36.5 },
  { language: 'English', count: 32180, percentage: 20.1 },
  { language: 'Marathi', count: 18740, percentage: 11.7 },
  { language: 'Bengali', count: 14320, percentage: 8.9 },
  { language: 'Gujarati', count: 11560, percentage: 7.2 },
  { language: 'Tamil', count: 9840, percentage: 6.1 },
  { language: 'Telugu', count: 8120, percentage: 5.1 },
  { language: 'Others', count: 6820, percentage: 4.4 },
];

export const MOCK_REJECTION_REASONS: RejectionReason[] = [
  { reason: 'High Phonetic Similarity', count: 412 },
  { reason: 'Exact/Near-Exact Match', count: 287 },
  { reason: 'Periodicity Modification', count: 234 },
  { reason: 'Disallowed Word/Prefix', count: 189 },
  { reason: 'Cross-Language Semantic Match', count: 156 },
  { reason: 'Title Combination Detected', count: 98 },
];

// ─── Derived / Computed Constants ────────────────────────────────────────────
// Single source of truth — all pages derive their stats from these

export const TOTAL_REGISTERED_TITLES = '1,60,000+';

/** Seed applications for applicant views — derived from MOCK_VERIFICATION_HISTORY */
export const SEED_APPLICANT_APPLICATIONS = [
  {
    id: MOCK_VERIFICATION_HISTORY[0].id,
    title: MOCK_VERIFICATION_HISTORY[0].proposedTitle,
    language: MOCK_VERIFICATION_HISTORY[0].language,
    periodicity: 'Daily',
    submittedOn: new Date(MOCK_VERIFICATION_HISTORY[0].timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    probability: MOCK_VERIFICATION_HISTORY[0].verificationProbability,
    status: MOCK_VERIFICATION_HISTORY[0].status,
    note: MOCK_VERIFICATION_HISTORY[0].status === 'APPROVED' ? 'Proceed with formal submission.' : `${MOCK_VERIFICATION_HISTORY[0].similarityScore}% similarity detected with existing titles.`,
  },
  {
    id: MOCK_VERIFICATION_HISTORY[1].id,
    title: MOCK_VERIFICATION_HISTORY[1].proposedTitle,
    language: MOCK_VERIFICATION_HISTORY[1].language,
    periodicity: 'Daily',
    submittedOn: new Date(MOCK_VERIFICATION_HISTORY[1].timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    probability: MOCK_VERIFICATION_HISTORY[1].verificationProbability,
    status: MOCK_VERIFICATION_HISTORY[1].status,
    note: `${MOCK_VERIFICATION_HISTORY[1].similarityScore}% similarity with existing titles.`,
  },
  {
    id: MOCK_VERIFICATION_HISTORY[5].id,
    title: MOCK_VERIFICATION_HISTORY[5].proposedTitle,
    language: MOCK_VERIFICATION_HISTORY[5].language,
    periodicity: 'Daily',
    submittedOn: new Date(MOCK_VERIFICATION_HISTORY[5].timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    probability: MOCK_VERIFICATION_HISTORY[5].verificationProbability,
    status: MOCK_VERIFICATION_HISTORY[5].status,
    note: 'Proceed with formal submission.',
  },
  {
    id: MOCK_VERIFICATION_HISTORY[7].id,
    title: MOCK_VERIFICATION_HISTORY[7].proposedTitle,
    language: MOCK_VERIFICATION_HISTORY[7].language,
    periodicity: 'Weekly',
    submittedOn: new Date(MOCK_VERIFICATION_HISTORY[7].timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    probability: MOCK_VERIFICATION_HISTORY[7].verificationProbability,
    status: MOCK_VERIFICATION_HISTORY[7].status,
    note: 'Under review by PRGI officer.',
  },
  {
    id: MOCK_VERIFICATION_HISTORY[2].id,
    title: MOCK_VERIFICATION_HISTORY[2].proposedTitle,
    language: MOCK_VERIFICATION_HISTORY[2].language,
    periodicity: 'Monthly',
    submittedOn: new Date(MOCK_VERIFICATION_HISTORY[2].timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    probability: MOCK_VERIFICATION_HISTORY[2].verificationProbability,
    status: MOCK_VERIFICATION_HISTORY[2].status,
    note: 'Contains restricted word — auto-rejected.',
  },
] as const;

/** Today's verification count derived from MOCK_DAILY_STATS (last entry) */
const todayStats = MOCK_DAILY_STATS[MOCK_DAILY_STATS.length - 1];
export const BASE_TODAY_COUNT = todayStats.approved + todayStats.rejected + todayStats.review;

/** Total checks across all days in MOCK_DAILY_STATS */
export const TOTAL_CHECKS = MOCK_DAILY_STATS.reduce(
  (sum, d) => sum + d.approved + d.rejected + d.review, 0
);

/** Approval rate from MOCK_DAILY_STATS */
const totalApproved = MOCK_DAILY_STATS.reduce((sum, d) => sum + d.approved, 0);
export const APPROVAL_RATE = ((totalApproved / TOTAL_CHECKS) * 100).toFixed(1) + '%';

/** Average similarity from MOCK_VERIFICATION_HISTORY */
export const AVG_SIMILARITY =
  (MOCK_VERIFICATION_HISTORY.reduce((sum, i) => sum + i.similarityScore, 0) /
    MOCK_VERIFICATION_HISTORY.length).toFixed(1) + '%';

/** High-risk count (similarity >= 70%) from MOCK_VERIFICATION_HISTORY */
export const HIGH_RISK_COUNT = MOCK_VERIFICATION_HISTORY.filter(i => i.similarityScore >= 70).length;

/** Rejection insights computed from MOCK_REJECTION_REASONS */
const totalRejections = MOCK_REJECTION_REASONS.reduce((sum, r) => sum + r.count, 0);
export const REJECTION_INSIGHTS = MOCK_REJECTION_REASONS.map(r => ({
  label: r.reason,
  pct:   Math.round((r.count / totalRejections) * 100),
}));

/** Similarity score distribution bucketed from MOCK_VERIFICATION_HISTORY */
function buildSimilarityDistribution() {
  const buckets = [
    { range: '0–10%',   min: 0,  max: 10  },
    { range: '11–20%',  min: 11, max: 20  },
    { range: '21–30%',  min: 21, max: 30  },
    { range: '31–40%',  min: 31, max: 40  },
    { range: '41–50%',  min: 41, max: 50  },
    { range: '51–60%',  min: 51, max: 60  },
    { range: '61–70%',  min: 61, max: 70  },
    { range: '71–80%',  min: 71, max: 80  },
    { range: '81–90%',  min: 81, max: 90  },
    { range: '91–100%', min: 91, max: 100 },
  ];
  // Use MOCK_DAILY_STATS total as a scaling factor for realistic numbers
  const scale = Math.round(TOTAL_CHECKS / 10);
  return buckets.map(b => {
    const actual = MOCK_VERIFICATION_HISTORY.filter(
      i => i.similarityScore >= b.min && i.similarityScore <= b.max
    ).length;
    // Scale up so chart looks meaningful (actual history has only 10 entries)
    return { range: b.range, count: actual > 0 ? actual * scale : Math.max(1, Math.round(scale * 0.3)) };
  });
}
export const SIMILARITY_DISTRIBUTION = buildSimilarityDistribution();
