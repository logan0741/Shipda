/** 목록·상세 화면에서 공용으로 쓰는 표시 포맷. */

import type { ProductSummary } from './api/types';

type ProductStatus = ProductSummary['status'];

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 0~1 신뢰도를 퍼센트 문자열로. */
export function formatConfidence(confidence: number | null | undefined): string {
  if (confidence == null) return '-';
  return `${Math.round(confidence * 100)}%`;
}

/** 등록 진행 상태 → 뱃지 라벨/색. Chip의 tone과 맞춘다. */
export const PRODUCT_STATUS: Record<
  ProductStatus,
  { label: string; tone: 'neutral' | 'navy' | 'success' }
> = {
  draft: { label: '작성중', tone: 'neutral' },
  in_progress: { label: '진행중', tone: 'navy' },
  completed: { label: '완료', tone: 'success' },
};

export function productStatusOf(status: ProductStatus | null | undefined) {
  return PRODUCT_STATUS[status ?? 'draft'] ?? PRODUCT_STATUS.draft;
}
