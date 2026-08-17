import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { VerificationStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Status classes (muted semantic colors) ────────────────────────────────────

export function getStatusBadgeClasses(status: VerificationStatus): string {
  switch (status) {
    case 'APPROVED': return 'bg-[#EAF5EE] text-[#237A4B] border border-[#B7DECA]';
    case 'REJECTED': return 'bg-[#FCEEEE] text-[#B42318] border border-[#F5C2BE]';
    case 'REVIEW':   return 'bg-[#FFF5E5] text-[#9A6700] border border-[#F5D99A]';
  }
}

// Legacy alias used by older components
export function getStatusBg(status: VerificationStatus): string {
  return getStatusBadgeClasses(status);
}

export function getStatusColor(status: VerificationStatus): string {
  switch (status) {
    case 'APPROVED': return 'text-[#237A4B]';
    case 'REJECTED': return 'text-[#B42318]';
    case 'REVIEW':   return 'text-[#9A6700]';
  }
}

// ── Similarity — color only used to communicate risk level ────────────────────

/**
 * Only apply color when the score communicates a meaningful risk level.
 * ≥70 = high risk (rejected territory) → red
 * 40–69 = moderate risk → amber
 * <40 = low risk → neutral ink, NOT green (green = approved status only)
 */
export function getSimilarityTextColor(score: number): string {
  if (score >= 70) return 'text-[#B42318]';
  if (score >= 40) return 'text-[#9A6700]';
  return 'text-[#1F2933]'; // neutral — low risk needs no color emphasis
}

export function getSimilarityBarColor(score: number): string {
  if (score >= 70) return 'bg-[#B42318]';
  if (score >= 40) return 'bg-[#9A6700]';
  return 'bg-[#12304A]'; // navy for low-risk bar — not green
}

// Legacy alias
export function getSimilarityColor(score: number): string {
  return getSimilarityTextColor(score);
}

export function getProbabilityColor(prob: number): string {
  if (prob >= 70) return '#237A4B';
  if (prob >= 40) return '#9A6700';
  return '#B42318';
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}
