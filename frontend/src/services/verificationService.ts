/**
 * Verification Service
 *
 * In DEMO MODE: returns realistic mock data with a simulated delay.
 * To connect to real backend: set VITE_USE_REAL_API=true and ensure
 * VITE_API_BASE_URL points to your Spring Boot server (default: /api via proxy).
 *
 * The interface contract is identical — swap the implementation, not the callers.
 */

import type {
  TitleVerificationRequest,
  VerificationResult,
  SimilarityMatch,
  RuleCheck,
  RiskBreakdown,
  RegisteredTitle,
  VerificationHistoryItem,
} from '@/types';
import { MOCK_REGISTERED_TITLES, MOCK_VERIFICATION_HISTORY } from '@/data/mockTitles';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

// ─── Live Title Registry ──────────────────────────────────────────────────────
/**
 * Mutable registry of titles the engine checks against.
 * Starts with the 20 seed titles.
 * When a title is APPROVED, it is added here so future submissions
 * correctly detect it as a conflict.
 */
const liveRegistry: RegisteredTitle[] = [...MOCK_REGISTERED_TITLES];

/** Called by VerificationResult when a title is approved — adds it to the live pool */
export function registerApprovedTitle(result: VerificationResult): void {
  const alreadyExists = liveRegistry.some(
    t => t.title.toLowerCase().trim() === result.proposedTitle.toLowerCase().trim()
  );
  if (alreadyExists) return;

  const newEntry: RegisteredTitle = {
    id:                 result.submissionId,
    title:              result.proposedTitle,
    registrationNumber: `REG/LIVE/${result.submissionId.slice(-4)}`,
    language:           result.language,
    periodicity:        result.periodicity,
    publisher:          'Applicant (Pending Formal Registration)',
    owner:              'Applicant (Demo)',
    state:              'Pending',
    district:           'Pending',
    registrationDate:   new Date().toISOString().split('T')[0],
    status:             'ACTIVE',
  };
  liveRegistry.unshift(newEntry); // prepend so it's checked first
}

// ─── Scenario Engine ──────────────────────────────────────────────────────────

interface Scenario {
  status: 'APPROVED' | 'REJECTED' | 'REVIEW';
  verificationProbability: number;
  similarityScore: number;
  riskBreakdown: RiskBreakdown;
  ruleChecks: RuleCheck[];
  matches: SimilarityMatch[];
  explanation: string;
  reasons: string[];
  aiCallInvoked: boolean;
}

// ─── Similarity Helpers ───────────────────────────────────────────────────────

const STOPWORDS = new Set([
  // English function words
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'for', 'to', 'is', 'at', 'on',
  // Common Indian city/region names — too generic to be meaningful for similarity
  'mumbai', 'delhi', 'kolkata', 'chennai', 'bangalore', 'bengaluru', 'hyderabad',
  'pune', 'ahmedabad', 'jaipur', 'lucknow', 'patna', 'bhopal', 'india', 'bharat',
  'maharashtra', 'gujarat', 'rajasthan', 'bihar', 'karnataka', 'tamil',
]);

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
}

/** Jaccard token similarity */
function tokenSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) { if (setB.has(w)) intersection++; }
  return intersection / (setA.size + setB.size - intersection);
}

/** Token containment: does A fully contain all tokens of B? */
function tokenContainment(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = tokenize(b);
  if (tokensB.length === 0) return 0;
  const matched = tokensB.filter(w => tokensA.has(w)).length;
  return matched / tokensB.length;
}

/** Levenshtein edit distance */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/** Normalised edit similarity 0–1 */
function editSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Multi-signal similarity score 0–100 between two title strings.
 *
 * Signals:
 *  - Full token containment    (special case — if all input tokens exist in existing title → ≥80%)
 *  - Jaccard token overlap     (weight 25%)
 *  - Token containment         (weight 40%)
 *  - Normalised edit distance  (weight 20%)
 *  - Prefix match bonus        (weight 15%)
 */
function titleSimilarity(input: string, existing: string): number {
  const a = input.toLowerCase().trim();
  const b = existing.toLowerCase().trim();

  if (a === b) return 100;

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  // Special case: all input tokens are fully contained inside the existing title
  // e.g. "Maharashtra Express" → fully inside "The Daily Maharashtra Express"
  if (tokensA.length > 0 && tokensA.every(t => tokensB.includes(t))) {
    const lengthPenalty = Math.max(0, 1 - (tokensB.length - tokensA.length) * 0.08);
    return Math.round(Math.max(80, 100 * lengthPenalty));
  }

  const jaccard  = tokenSimilarity(a, b);
  const containB = tokenContainment(a, b);
  const containA = tokenContainment(b, a);
  const contain  = Math.max(containB, containA);
  const edit     = editSimilarity(a, b);

  const prefixBonus = tokensA.length > 0 && tokensB.length > 0 && tokensA[0] === tokensB[0] ? 0.15 : 0;

  const raw = (jaccard * 0.25) + (contain * 0.40) + (edit * 0.20) + prefixBonus;
  return Math.round(Math.min(raw * 100, 100));
}

/** Phonetic code (simple Double-Metaphone approximation for demo) */
function phoneticCode(s: string): string {
  return s.toLowerCase()
    .replace(/ph/g, 'f')
    .replace(/[aeiou]/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1')
    .substring(0, 6);
}

function phoneticSimilarity(a: string, b: string): number {
  const ca = phoneticCode(a);
  const cb = phoneticCode(b);
  if (!ca || !cb) return 0;
  return editSimilarity(ca, cb);
}

interface MatchResult {
  title: RegisteredTitle;
  /** 0–100 overall similarity */
  score: number;
  lexical: number;
  phonetic: number;
  matchTypes: string[];
}

/** Score input against ALL titles in the live registry and return ranked matches */
function scoreAllTitles(input: string): MatchResult[] {
  const results: MatchResult[] = [];

  for (const t of liveRegistry) {
    const lexical  = titleSimilarity(input, t.title);
    const phonetic = Math.round(phoneticSimilarity(input, t.title) * 100);
    // Combined: lexical 60%, phonetic 40%
    const combined = Math.round(lexical * 0.6 + phonetic * 0.4);

    if (combined >= 15) {  // only keep titles with any meaningful similarity
      const matchTypes: string[] = [];
      if (lexical >= 50)  matchTypes.push('Lexical');
      if (phonetic >= 50) matchTypes.push('Phonetic');
      if (matchTypes.length === 0) matchTypes.push('Fuzzy');

      results.push({ title: t, score: combined, lexical, phonetic, matchTypes });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─── Combination Detection ────────────────────────────────────────────────────

/**
 * Check if the input is built by combining tokens from two or more existing titles.
 * Returns the matched titles if combination is detected, else null.
 */
function detectCombination(input: string): RegisteredTitle[] | null {
  const inputTokens = tokenize(input);
  if (inputTokens.length < 3) return null; // too short to be a meaningful combination

  const covered: Set<number> = new Set();
  const matched: RegisteredTitle[] = [];

  for (const t of liveRegistry) {
    const tTokens = tokenize(t.title);
    const matchedIdxs = inputTokens.reduce<number[]>((acc, w, i) => {
      if (tTokens.includes(w)) acc.push(i);
      return acc;
    }, []);
    if (matchedIdxs.length >= Math.ceil(tTokens.length * 0.6)) {
      matchedIdxs.forEach(i => covered.add(i));
      matched.push(t);
    }
  }

  const coverageRatio = covered.size / inputTokens.length;
  return matched.length >= 2 && coverageRatio >= 0.7 ? matched : null;
}

// ─── Main Scenario Detection ──────────────────────────────────────────────────

const PERIODICITY_TERMS = new Set(['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annual', 'annually', 'saptahik', 'masik', 'saaptahik', 'dainik']);
const RESTRICTED_WORDS  = ['police', 'cbi', 'cid', 'army', 'navy', 'airforce', 'crime', 'corruption', 'nia', 'raw', 'parliament', 'president', 'judiciary', 'enforcement'];
const DISALLOWED_PREFIXES = ['national', 'rashtriya', 'all india', 'government', 'official'];
const DISALLOWED_SUFFIXES = ['media', 'digital', 'network', 'channel'];

function detectScenario(title: string): Scenario {
  const normalized = title.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  // ── Rule 1: Restricted words (highest priority hard rule) ──────────────────
  for (const word of RESTRICTED_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      return buildRestrictedWordScenario(title, word);
    }
  }

  // ── Rule 2: Disallowed prefix ─────────────────────────────────────────────
  for (const prefix of DISALLOWED_PREFIXES) {
    if (normalized.startsWith(prefix + ' ') || normalized === prefix) {
      return buildPrefixSuffixScenario(title, prefix, 'PREFIX');
    }
  }

  // ── Rule 3: Disallowed suffix ─────────────────────────────────────────────
  for (const suffix of DISALLOWED_SUFFIXES) {
    if (normalized.endsWith(' ' + suffix) || normalized === suffix) {
      return buildPrefixSuffixScenario(title, suffix, 'SUFFIX');
    }
  }

  // ── Rule 4: Periodicity modification ─────────────────────────────────────
  const periodicityFound = words.filter(w => PERIODICITY_TERMS.has(w));
  if (periodicityFound.length > 0) {
    const coreWords = words.filter(w => !PERIODICITY_TERMS.has(w));
    const coreTitle = coreWords.join(' ').trim();
    if (coreTitle.length > 2) {
      const coreMatches = scoreAllTitles(coreTitle);
      // Threshold 60% — requires substantial overlap beyond just a shared city/region name
      if (coreMatches.length > 0 && coreMatches[0].score >= 60) {
        return buildPeriodicityScenario(title, coreMatches[0].title, periodicityFound[0]);
      }
      // Also check: if core tokens are substantially contained in a registered title
      // Require at least 2 matched tokens AND ≥60% containment to avoid false positives
      const coreTokens = new Set(tokenize(coreTitle));
      for (const t of liveRegistry) {
        const tTokens = tokenize(t.title);
        const matched = tTokens.filter(w => coreTokens.has(w)).length;
        if (matched >= 2 && matched / tTokens.length >= 0.6) {
          return buildPeriodicityScenario(title, t, periodicityFound[0]);
        }
      }
    }
  }

  // ── Rule 5: Title combination ────────────────────────────────────────────
  const combinedTitles = detectCombination(normalized);
  if (combinedTitles) {
    return buildCombinationScenario(title, combinedTitles);
  }

  // ── Rule 6: High similarity to existing titles ────────────────────────────
  const allMatches = scoreAllTitles(normalized);
  const topMatch = allMatches[0];

  if (topMatch) {
    if (topMatch.score >= 70) {
      // Hard rejection
      return buildHighSimilarityScenario(title, allMatches);
    }
    if (topMatch.score >= 40) {
      // Borderline — manual review
      return buildReviewScenario(title, allMatches);
    }
  }

  // ── Rule 7: Cross-language semantic keywords ──────────────────────────────
  const crossLangMap: Record<string, string> = {
    'sandhya': 'Sandhya Patrika', 'evening': 'Sandhya Patrika',
    'pratideen': 'Pratidin',      'pratidin': 'Pratidin',
    'rashtriya': 'Rashtriya Sahara',
  };
  for (const [key, existing] of Object.entries(crossLangMap)) {
    if (normalized.includes(key)) {
      return buildCrossLangScenario(title, existing);
    }
  }

  // ── Approved ──────────────────────────────────────────────────────────────
  return buildApprovedScenario(title, allMatches);
}

function buildRestrictedWordScenario(title: string, word: string): Scenario {
  return {
    status: 'REJECTED',
    verificationProbability: 0,
    similarityScore: 100,
    riskBreakdown: { lexical: 10, phonetic: 8, semantic: 5, ruleViolation: 100, overall: 100 },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',            status: 'PASSED',  description: 'No exact match found in PRGI database.' },
      { id: 'phonetic',    name: 'Phonetic Similarity',     status: 'PASSED',  description: 'No phonetically similar titles detected.' },
      { id: 'semantic',    name: 'Semantic Similarity',     status: 'PASSED',  description: 'No semantically similar titles detected.' },
      { id: 'disallowed',  name: 'Disallowed Words',        status: 'FAILED',  description: `Title contains restricted word: "${word}". Government security/law enforcement terms are prohibited.`, detail: `"${word.toUpperCase()}" is in the PRGI restricted word list under Rule 8(3).` },
      { id: 'prefix',      name: 'Prefix/Suffix Rules',     status: 'PASSED',  description: 'No disallowed prefix or suffix detected.' },
      { id: 'periodicity', name: 'Periodicity Rules',       status: 'PASSED',  description: 'No periodicity violation detected.' },
      { id: 'combination', name: 'Title Combination',       status: 'PASSED',  description: 'Title is not a combination of existing titles.' },
    ],
    matches: [],
    explanation: `Automatically rejected. The title contains "${word}" — a restricted word under PRGI Rule 8(3). Government security agency and law enforcement terms are prohibited in publication titles regardless of context.`,
    reasons: [`Contains restricted word: "${word.toUpperCase()}" — prohibited under PRGI Rule 8(3)`],
    aiCallInvoked: false,
  };
}

function buildPrefixSuffixScenario(title: string, term: string, type: 'PREFIX' | 'SUFFIX'): Scenario {
  return {
    status: 'REJECTED',
    verificationProbability: 0,
    similarityScore: 100,
    riskBreakdown: { lexical: 10, phonetic: 5, semantic: 5, ruleViolation: 100, overall: 100 },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',        status: 'PASSED', description: 'No exact match found.' },
      { id: 'phonetic',    name: 'Phonetic Similarity', status: 'PASSED', description: 'No phonetic match detected.' },
      { id: 'semantic',    name: 'Semantic Similarity', status: 'PASSED', description: 'No semantic match detected.' },
      { id: 'disallowed',  name: 'Disallowed Words',    status: 'PASSED', description: 'No restricted word detected.' },
      { id: 'prefix',      name: 'Prefix/Suffix Rules', status: 'FAILED', description: `Title uses a disallowed ${type.toLowerCase()}: "${term}".`, detail: `"${term}" is a prohibited ${type.toLowerCase()} under PRGI guidelines.` },
      { id: 'periodicity', name: 'Periodicity Rules',   status: 'PASSED', description: 'No periodicity violation detected.' },
      { id: 'combination', name: 'Title Combination',   status: 'PASSED', description: 'Not a combination title.' },
    ],
    matches: [],
    explanation: `The title uses a disallowed ${type.toLowerCase()} "${term}". PRGI guidelines prohibit titles from starting or ending with this term.`,
    reasons: [`Disallowed ${type.toLowerCase()}: "${term}" is prohibited under PRGI guidelines`],
    aiCallInvoked: false,
  };
}

function buildPeriodicityScenario(title: string, existing: RegisteredTitle, term: string): Scenario {
  return {
    status: 'REJECTED',
    verificationProbability: 5,
    similarityScore: 95,
    riskBreakdown: { lexical: 85, phonetic: 78, semantic: 72, ruleViolation: 95, overall: 95 },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',        status: 'WARNING', description: `Core title closely matches "${existing.title}" (${existing.registrationNumber}).` },
      { id: 'phonetic',    name: 'Phonetic Similarity', status: 'FAILED',  description: `High phonetic similarity with "${existing.title}".` },
      { id: 'semantic',    name: 'Semantic Similarity', status: 'FAILED',  description: `Semantic analysis confirms near-identical meaning with "${existing.title}".` },
      { id: 'disallowed',  name: 'Disallowed Words',    status: 'PASSED',  description: 'No restricted words detected.' },
      { id: 'prefix',      name: 'Prefix/Suffix Rules', status: 'PASSED',  description: 'No disallowed prefix or suffix detected.' },
      { id: 'periodicity', name: 'Periodicity Rules',   status: 'FAILED',  description: `"${term}" is a periodicity term. Adding it to an existing title does not create a new unique title.`, detail: `"${existing.title}" is registered as ${existing.registrationNumber}.` },
      { id: 'combination', name: 'Title Combination',   status: 'PASSED',  description: 'Not a combination of two distinct titles.' },
    ],
    matches: [
      { id: existing.id, title: existing.title, registrationNumber: existing.registrationNumber, language: existing.language, periodicity: existing.periodicity, publisher: existing.publisher, state: existing.state, registrationDate: existing.registrationDate, similarityScore: 95, matchTypes: ['Phonetic', 'Semantic', 'Periodicity'] },
    ],
    explanation: `Periodicity modification detected. Stripping "${term}" from the proposed title yields "${title.toLowerCase().split(/\s+/).filter(w => !PERIODICITY_TERMS.has(w)).join(' ')}", which closely matches the existing registered title "${existing.title}" (${existing.registrationNumber}). Adding a periodicity word does not make a title sufficiently unique under PRGI rules.`,
    reasons: [
      `Periodicity rule violation: core title matches "${existing.title}" (${existing.registrationNumber})`,
      `"${term}" is a periodicity modifier — adding it to an existing title is prohibited`,
      '95% similarity confirmed by phonetic and semantic analysis',
    ],
    aiCallInvoked: true,
  };
}

function buildHighSimilarityScenario(title: string, allMatches: MatchResult[]): Scenario {
  const top = allMatches[0];
  const topScore = top.score;
  const prob = Math.max(0, 100 - topScore);

  const matches: SimilarityMatch[] = allMatches.slice(0, 4).map((m, i) => ({
    id: m.title.id + i,
    title: m.title.title,
    registrationNumber: m.title.registrationNumber,
    language: m.title.language,
    periodicity: m.title.periodicity,
    publisher: m.title.publisher,
    state: m.title.state,
    registrationDate: m.title.registrationDate,
    similarityScore: m.score,
    matchTypes: m.matchTypes,
  }));

  return {
    status: 'REJECTED',
    verificationProbability: prob,
    similarityScore: topScore,
    riskBreakdown: {
      lexical: top.lexical,
      phonetic: top.phonetic,
      semantic: Math.round(topScore * 0.9),
      ruleViolation: 0,
      overall: topScore,
    },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',        status: topScore >= 90 ? 'FAILED' : 'WARNING', description: topScore >= 90 ? `Near-exact match found: "${top.title.title}".` : `Very similar to "${top.title.title}" in PRGI database.` },
      { id: 'phonetic',    name: 'Phonetic Similarity', status: top.phonetic >= 60 ? 'FAILED' : 'WARNING', description: `Phonetic similarity: ${top.phonetic}% with "${top.title.title}".` },
      { id: 'semantic',    name: 'Semantic Similarity', status: 'FAILED',  description: `Semantic analysis confirms ${topScore}% resemblance.` },
      { id: 'disallowed',  name: 'Disallowed Words',    status: 'PASSED',  description: 'No restricted words detected.' },
      { id: 'prefix',      name: 'Prefix/Suffix Rules', status: 'PASSED',  description: 'No disallowed prefix or suffix.' },
      { id: 'periodicity', name: 'Periodicity Rules',   status: 'PASSED',  description: 'No periodicity manipulation detected.' },
      { id: 'combination', name: 'Title Combination',   status: 'PASSED',  description: 'Not identified as a combination of existing titles.' },
    ],
    matches,
    explanation: `The proposed title "${title}" has ${topScore}% similarity with "${top.title.title}" (${top.title.registrationNumber}). PRGI requires new titles to be sufficiently distinct — titles exceeding 70% combined similarity are automatically rejected. Both lexical (${top.lexical}%) and phonetic (${top.phonetic}%) analysis confirm the overlap.`,
    reasons: [
      `${topScore}% similarity with "${top.title.title}" (${top.title.registrationNumber})`,
      `Lexical similarity: ${top.lexical}% · Phonetic similarity: ${top.phonetic}%`,
      'Exceeds 70% rejection threshold',
    ],
    aiCallInvoked: true,
  };
}

function buildReviewScenario(title: string, allMatches: MatchResult[]): Scenario {
  const top = allMatches[0];
  const prob = 100 - top.score;

  const matches: SimilarityMatch[] = allMatches.slice(0, 3).map((m, i) => ({
    id: m.title.id + i,
    title: m.title.title,
    registrationNumber: m.title.registrationNumber,
    language: m.title.language,
    periodicity: m.title.periodicity,
    publisher: m.title.publisher,
    state: m.title.state,
    registrationDate: m.title.registrationDate,
    similarityScore: m.score,
    matchTypes: m.matchTypes,
  }));

  return {
    status: 'REVIEW',
    verificationProbability: prob,
    similarityScore: top.score,
    riskBreakdown: {
      lexical: top.lexical,
      phonetic: top.phonetic,
      semantic: Math.round(top.score * 0.85),
      ruleViolation: 0,
      overall: top.score,
    },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',        status: 'WARNING', description: `Moderate similarity (${top.score}%) with "${top.title.title}".` },
      { id: 'phonetic',    name: 'Phonetic Similarity', status: top.phonetic >= 50 ? 'WARNING' : 'PASSED', description: `Phonetic similarity: ${top.phonetic}%.` },
      { id: 'semantic',    name: 'Semantic Similarity', status: 'WARNING', description: `Semantic analysis shows borderline resemblance.` },
      { id: 'disallowed',  name: 'Disallowed Words',    status: 'PASSED',  description: 'No restricted words detected.' },
      { id: 'prefix',      name: 'Prefix/Suffix Rules', status: 'PASSED',  description: 'No disallowed prefix or suffix.' },
      { id: 'periodicity', name: 'Periodicity Rules',   status: 'PASSED',  description: 'No periodicity manipulation detected.' },
      { id: 'combination', name: 'Title Combination',   status: 'PASSED',  description: 'Not identified as a combination title.' },
    ],
    matches,
    explanation: `The proposed title "${title}" falls in the borderline zone — ${top.score}% similarity with "${top.title.title}". The system cannot automatically approve or reject this. A PRGI officer will review and make the final determination.`,
    reasons: [
      `Borderline similarity: ${top.score}% with "${top.title.title}"`,
      'Score is in the 40–70% manual review band',
      'Referred to PRGI officer for final decision',
    ],
    aiCallInvoked: true,
  };
}

function buildCombinationScenario(title: string, combinedTitles: RegisteredTitle[]): Scenario {
  return {
    status: 'REJECTED',
    verificationProbability: 0,
    similarityScore: 100,
    riskBreakdown: { lexical: 90, phonetic: 70, semantic: 85, ruleViolation: 100, overall: 100 },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',        status: 'PASSED',  description: 'No single exact match found.' },
      { id: 'phonetic',    name: 'Phonetic Similarity', status: 'WARNING', description: 'Overlapping phonetic patterns with multiple titles.' },
      { id: 'semantic',    name: 'Semantic Similarity', status: 'FAILED',  description: 'Semantic analysis confirms the title is composed of existing registered titles.' },
      { id: 'disallowed',  name: 'Disallowed Words',    status: 'PASSED',  description: 'No restricted words detected.' },
      { id: 'prefix',      name: 'Prefix/Suffix Rules', status: 'PASSED',  description: 'No disallowed prefix or suffix.' },
      { id: 'periodicity', name: 'Periodicity Rules',   status: 'PASSED',  description: 'No periodicity manipulation.' },
      { id: 'combination', name: 'Title Combination',   status: 'FAILED',  description: `Title appears to be a combination of: ${combinedTitles.map(t => `"${t.title}"`).join(' + ')}.`, detail: 'Combining two or more existing registered titles does not create a new or original title.' },
    ],
    matches: combinedTitles.slice(0, 3).map((t, i) => ({
      id: t.id + i, title: t.title, registrationNumber: t.registrationNumber,
      language: t.language, periodicity: t.periodicity, publisher: t.publisher,
      state: t.state, registrationDate: t.registrationDate,
      similarityScore: 85 - i * 5, matchTypes: ['Combination'],
    })),
    explanation: `The proposed title "${title}" is a combination of existing registered titles: ${combinedTitles.map(t => `"${t.title}"`).join(' and ')}. PRGI prohibits titles formed by joining two or more existing registered titles as it does not constitute an original publication name.`,
    reasons: [
      `Title combination detected: ${combinedTitles.map(t => `"${t.title}"`).join(' + ')}`,
      'Combining existing titles does not create a new or original title',
      'Auto-rejected under PRGI combination rule',
    ],
    aiCallInvoked: false,
  };
}

function buildCrossLangScenario(title: string, existingTitle: string): Scenario {
  const existing = liveRegistry.find(t => t.title === existingTitle) ?? liveRegistry[16] ?? liveRegistry[0];
  return {
    status: 'REVIEW',
    verificationProbability: 48,
    similarityScore: 52,
    riskBreakdown: { lexical: 12, phonetic: 22, semantic: 79, ruleViolation: 0, overall: 52 },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',        status: 'PASSED',  description: 'No exact match found in PRGI database.' },
      { id: 'phonetic',    name: 'Phonetic Similarity', status: 'WARNING', description: `Moderate phonetic overlap with "${existingTitle}".` },
      { id: 'semantic',    name: 'Semantic Similarity', status: 'FAILED',  description: `Cross-language semantic analysis: 79% meaning similarity with "${existingTitle}".` },
      { id: 'disallowed',  name: 'Disallowed Words',    status: 'PASSED',  description: 'No restricted words detected.' },
      { id: 'prefix',      name: 'Prefix/Suffix Rules', status: 'PASSED',  description: 'No disallowed prefix or suffix.' },
      { id: 'periodicity', name: 'Periodicity Rules',   status: 'PASSED',  description: 'No periodicity manipulation.' },
      { id: 'combination', name: 'Title Combination',   status: 'PASSED',  description: 'Not a combination title.' },
    ],
    matches: [{
      id: existing.id, title: existing.title, registrationNumber: existing.registrationNumber,
      language: existing.language, periodicity: existing.periodicity, publisher: existing.publisher,
      state: existing.state, registrationDate: existing.registrationDate,
      similarityScore: 79, matchTypes: ['Semantic (Cross-lingual)'],
    }],
    explanation: `Cross-language semantic similarity detected. The proposed title and "${existingTitle}" carry the same meaning across languages. Standard string or phonetic matching cannot catch this — only multilingual embedding analysis can. Referred for manual review.`,
    reasons: [
      `79% cross-language semantic similarity with "${existingTitle}"`,
      'Cannot be caught by lexical or phonetic matching alone',
      'Referred to PRGI officer — borderline semantic score',
    ],
    aiCallInvoked: true,
  };
}

function buildApprovedScenario(title: string, allMatches: MatchResult[]): Scenario {
  const topScore = allMatches[0]?.score ?? 0;
  const prob = Math.max(75, 100 - topScore);
  const sim = 100 - prob;

  return {
    status: 'APPROVED',
    verificationProbability: prob,
    similarityScore: sim,
    riskBreakdown: {
      lexical: allMatches[0]?.lexical ?? Math.floor(Math.random() * 15) + 5,
      phonetic: allMatches[0]?.phonetic ?? Math.floor(Math.random() * 20) + 5,
      semantic: Math.round(sim * 0.9),
      ruleViolation: 0,
      overall: sim,
    },
    ruleChecks: [
      { id: 'exact',       name: 'Exact Match',        status: 'PASSED', description: 'No exact or near-exact match found in PRGI database.' },
      { id: 'phonetic',    name: 'Phonetic Similarity', status: 'PASSED', description: 'Phonetic encoding shows distinct sound pattern from existing titles.' },
      { id: 'semantic',    name: 'Semantic Similarity', status: 'PASSED', description: 'Semantic embedding analysis found no closely related titles.' },
      { id: 'disallowed',  name: 'Disallowed Words',    status: 'PASSED', description: 'No restricted words, agency names, or prohibited expressions detected.' },
      { id: 'prefix',      name: 'Prefix/Suffix Rules', status: 'PASSED', description: 'Title does not begin or end with any disallowed prefix or suffix.' },
      { id: 'periodicity', name: 'Periodicity Rules',   status: 'PASSED', description: 'No periodicity modification of an existing title detected.' },
      { id: 'combination', name: 'Title Combination',   status: 'PASSED', description: 'Title is not formed by combining two or more existing registered titles.' },
    ],
    matches: allMatches.slice(0, 2).map((m, i) => ({
      id: m.title.id + i,
      title: m.title.title,
      registrationNumber: m.title.registrationNumber,
      language: m.title.language,
      periodicity: m.title.periodicity,
      publisher: m.title.publisher,
      state: m.title.state,
      registrationDate: m.title.registrationDate,
      similarityScore: m.score,
      matchTypes: m.matchTypes,
    })),
    explanation: `The proposed title "${title}" passes all 7 PRGI verification checks. No restricted words, disallowed prefix/suffix, periodicity manipulation, combination pattern, or significant similarity with existing titles was detected. Verification probability is ${prob}% — above the 70% approval threshold.`,
    reasons: [
      'No exact or phonetically similar title found',
      'No rule violations detected',
      `Verification probability ${prob}% — above 70% approval threshold`,
    ],
    aiCallInvoked: sim > 10,
  };
}

// ─── Mock API Delay ───────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Service Functions ────────────────────────────────────────────────────────

export async function verifyTitle(request: TitleVerificationRequest): Promise<VerificationResult> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/titles/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: request.title,
        language: request.language,
        applicantId: request.applicantId ?? 'WEB-USER',
      }),
    });
    if (!res.ok) throw new Error(`Verification failed: ${res.statusText}`);
    const data = await res.json();
    // Map Spring Boot response to our VerificationResult type
    return mapBackendResponse(data, request);
  }

  // Demo mode: simulate processing time
  await delay(1800 + Math.random() * 400);
  const scenario = detectScenario(request.title);

  return {
    submissionId: `VRF-2024-${Math.floor(Math.random() * 9000) + 1000}`,
    proposedTitle: request.title,
    language: request.language,
    periodicity: request.periodicity,
    processingTimeMs: Math.floor(1200 + Math.random() * 600),
    timestamp: new Date().toISOString(),
    ...scenario,
  };
}

function mapBackendResponse(data: Record<string, unknown>, request: TitleVerificationRequest): VerificationResult {
  const status = data['verdict'] === 'APPROVED' ? 'APPROVED' : data['verdict'] === 'REJECTED' ? 'REJECTED' : 'REVIEW';
  const prob = typeof data['verificationProbability'] === 'number'
    ? Math.round(data['verificationProbability'] * 10) / 10 : 50;
  const sim = typeof data['similarityScore'] === 'number'
    ? Math.round(data['similarityScore'] * 10) / 10 : 0;

  const matchedTitles = Array.isArray(data['matchedTitles']) ? data['matchedTitles'] as Record<string, unknown>[] : [];
  const reasons       = Array.isArray(data['reasons'])       ? data['reasons']       as string[]                  : [];
  const ruleViolations = Array.isArray(data['ruleViolations']) ? data['ruleViolations'] as string[]               : [];

  // ── Build explanation from the most informative available field ──────────
  let explanation = '';
  if (ruleViolations.length > 0) {
    // Rule-based rejection — use violations directly
    explanation = ruleViolations.join(' | ');
  } else if (matchedTitles.length > 0) {
    const top = matchedTitles[0];
    const topTitle  = typeof top['title']      === 'string' ? top['title']      : '';
    const topScore  = typeof top['finalScore'] === 'number' ? top['finalScore'] : 0;
    const fuzzy     = typeof top['fuzzyScore']     === 'number' ? (top['fuzzyScore']     as number).toFixed(1) : null;
    const phonetic  = typeof top['phoneticScore']  === 'number' ? (top['phoneticScore']  as number).toFixed(1) : null;
    const embedding = typeof top['embeddingScore'] === 'number' ? (top['embeddingScore'] as number).toFixed(1) : null;
    const semantic  = typeof top['semanticScore']  === 'number' ? (top['semanticScore']  as number).toFixed(1) : null;

    const parts: string[] = [];
    if (fuzzy)     parts.push(`Lexical: ${fuzzy}%`);
    if (phonetic)  parts.push(`Phonetic: ${phonetic}%`);
    if (embedding) parts.push(`Embedding: ${embedding}%`);
    if (semantic)  parts.push(`Semantic: ${semantic}%`);
    const scoreDetail = parts.length > 0 ? ` (${parts.join(', ')})` : '';

    if (status === 'APPROVED') {
      explanation = `"${request.title}" passed all checks. No significantly similar titles found in the PRGI database.`;
    } else if (status === 'REJECTED') {
      explanation = `"${request.title}" has ${topScore.toFixed(1)}% final similarity with "${topTitle}"${scoreDetail}. This exceeds the 70% rejection threshold.`;
    } else {
      explanation = `"${request.title}" has borderline ${topScore.toFixed(1)}% similarity with "${topTitle}"${scoreDetail}. Referred to officer for manual review.`;
    }
  } else if (status === 'APPROVED') {
    explanation = `"${request.title}" passed all checks. No significantly similar titles found in the PRGI database.`;
  } else {
    explanation = reasons.length > 0 ? reasons[0] : 'No explanation available.';
  }

  // ── Build riskBreakdown from actual top candidate scores ─────────────────
  let topFuzzy = 0, topPhonetic = 0, topSemantic = 0;
  if (matchedTitles.length > 0) {
    const top = matchedTitles[0];
    topFuzzy    = typeof top['fuzzyScore']     === 'number' ? Math.round(top['fuzzyScore']     as number) : 0;
    topPhonetic = typeof top['phoneticScore']  === 'number' ? Math.round(top['phoneticScore']  as number) : 0;
    const emb   = typeof top['embeddingScore'] === 'number' ? top['embeddingScore'] as number : 0;
    const semv  = typeof top['semanticScore']  === 'number' ? top['semanticScore']  as number : 0;
    topSemantic = Math.round(Math.max(emb, semv));
  }

  // ── Build reasons list — use violations if present, otherwise similarity reasons ──
  const displayReasons: string[] = ruleViolations.length > 0
    ? ruleViolations
    : reasons.filter(r => !r.toLowerCase().includes('see ruleviolations'));

  return {
    submissionId: typeof data['submissionId'] === 'string' ? data['submissionId'] : 'VRF-LIVE',
    proposedTitle: request.title,
    language: request.language,
    periodicity: request.periodicity,
    status,
    verificationProbability: prob,
    similarityScore: sim,
    riskBreakdown: {
      lexical:       topFuzzy,
      phonetic:      topPhonetic,
      semantic:      topSemantic,
      ruleViolation: ruleViolations.length > 0 ? 100 : 0,
      overall:       sim,
    },
    ruleChecks: buildRuleChecksFromReasons(displayReasons, ruleViolations),
    matches: matchedTitles.map((m: Record<string, unknown>, i: number) => {
      const finalScore = typeof m['finalScore'] === 'number' ? Math.round((m['finalScore'] as number) * 10) / 10 : 0;
      // matchTypes is an array from backend e.g. ["FUZZY","VECTOR","EMBEDDED"]
      const matchTypesArr = Array.isArray(m['matchTypes']) ? (m['matchTypes'] as string[]) : [];
      const matchTypeStr  = typeof m['matchType'] === 'string' ? m['matchType'] as string : '';
      const displayTypes  = matchTypesArr.length > 0 ? matchTypesArr : (matchTypeStr ? matchTypeStr.split('_AND_') : ['Fuzzy']);
      return {
        id: String(i),
        title:              typeof m['title']    === 'string' ? m['title']    : '',
        registrationNumber: `REG/LIVE/${i + 1}`,
        language:           request.language,
        periodicity:        request.periodicity,
        publisher:          'On record',
        state:              'On record',
        registrationDate:   '',
        similarityScore:    finalScore,
        matchTypes:         displayTypes,
      };
    }),
    explanation,
    reasons: displayReasons,
    aiCallInvoked: typeof data['aiCallInvoked'] === 'boolean' ? data['aiCallInvoked'] : false,
    processingTimeMs: 0,
    timestamp: new Date().toISOString(),
  };
}

function buildRuleChecksFromReasons(reasons: string[], violations: string[]): import('@/types').RuleCheck[] {
  const all = [...(violations ?? []), ...(reasons ?? [])].map(s => s.toLowerCase());
  const has = (...keywords: string[]) => keywords.some(k => all.some(s => s.includes(k)));

  return [
    {
      id: 'exact', name: 'Exact Match',
      status: has('exact duplicate', 'exact match') ? 'FAILED' : 'PASSED',
      description: has('exact duplicate', 'exact match') ? 'Exact duplicate found in PRGI database.' : 'No exact match found.',
    },
    {
      id: 'spelling', name: 'Spelling Variant',
      status: has('spelling variant', 'transliteration variant') ? 'FAILED' : 'PASSED',
      description: has('spelling variant', 'transliteration variant') ? 'Spelling/transliteration variant of existing title detected.' : 'No spelling variant found.',
    },
    {
      id: 'phonetic', name: 'Phonetic Similarity',
      status: has('phonetic') ? 'FAILED' : 'PASSED',
      description: has('phonetic') ? 'Phonetically similar title detected.' : 'Low phonetic similarity with existing titles.',
    },
    {
      id: 'semantic', name: 'Semantic Similarity',
      status: has('similar to existing', 'borderline similarity', 'semantic') ? (has('similar to existing') ? 'FAILED' : 'WARNING') : 'PASSED',
      description: has('similar to existing') ? 'High semantic similarity with existing title.' : has('borderline') ? 'Borderline semantic similarity detected.' : 'No significant semantic similarity found.',
    },
    {
      id: 'crosslang', name: 'Cross-Language Match',
      status: has('cross-language', 'translation of') ? 'FAILED' : 'PASSED',
      description: has('cross-language', 'translation of') ? 'Title is a translation of an existing registered title.' : 'No cross-language match detected.',
    },
    {
      id: 'disallowed', name: 'Disallowed Words',
      status: has('disallowed word', 'restricted') ? 'FAILED' : 'PASSED',
      description: has('disallowed word', 'restricted') ? 'Contains a restricted or disallowed word.' : 'No restricted words found.',
    },
    {
      id: 'prefix', name: 'Prefix/Suffix Rules',
      status: has('prefix', 'suffix') ? 'FAILED' : 'PASSED',
      description: has('prefix') ? 'Uses a disallowed prefix.' : has('suffix') ? 'Uses a disallowed suffix.' : 'No prefix/suffix violation.',
    },
    {
      id: 'periodicity', name: 'Periodicity Rules',
      status: has('periodicity') ? 'FAILED' : 'PASSED',
      description: has('periodicity') ? 'Periodicity modification of an existing title detected.' : 'No periodicity violation.',
    },
    {
      id: 'combination', name: 'Title Combination',
      status: has('combination', 'combines') ? 'FAILED' : 'PASSED',
      description: has('combination', 'combines') ? 'Title is a combination of existing registered titles.' : 'Not a combination title.',
    },
  ];
}

export async function getVerificationHistory(): Promise<VerificationHistoryItem[]> {
  if (USE_REAL_API) {
    // Future: fetch from /api/titles/history
  }
  await delay(400);
  return MOCK_VERIFICATION_HISTORY;
}

export async function getTitleDatabase(params: { query?: string; language?: string; page?: number; size?: number }): Promise<{ titles: RegisteredTitle[]; total: number }> {
  await delay(300);
  let titles = liveRegistry;
  if (params.query) {
    const q = params.query.toLowerCase();
    titles = titles.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.registrationNumber.toLowerCase().includes(q) ||
      t.publisher.toLowerCase().includes(q)
    );
  }
  if (params.language && params.language !== 'All') {
    titles = titles.filter(t => t.language === params.language);
  }
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  return { titles: titles.slice(page * size, (page + 1) * size), total: titles.length };
}
