import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  AdminOverview,
  AdminRoutes,
  CbmPredictResponse,
  CbmResult,
  ConsolidationStatus,
  HsCodeResult,
  HsPredictResponse,
  Ingredient,
  MarkerPayload,
  PickupInfo,
  ProductSummary,
  ProductSummaryCard,
  ShipmentResult,
} from './types';

const API_PORT = (Constants.expoConfig?.extra as { apiPort?: number } | undefined)?.apiPort ?? 8000;

/**
 * Expo 개발 서버 주소에서 PC의 LAN IP를 뽑아 API 주소를 만든다.
 * 실기기(Expo Go)에서는 localhost가 폰 자신을 가리키므로 이 과정이 필요하다.
 */
function detectBaseUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // 구버전 매니페스트 호환
    (Constants.manifest2?.extra?.expoGo?.debuggerHost as string | undefined) ??
    '';

  const host = hostUri.split('/')[0]?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${API_PORT}`;
  }
  // 안드로이드 에뮬레이터는 10.0.2.2가 호스트 PC를 가리킨다
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
}

let baseUrl = detectBaseUrl();

export function getBaseUrl(): string {
  return baseUrl;
}

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, '');
}

export function resetBaseUrl(): string {
  baseUrl = detectBaseUrl();
  return baseUrl;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, init);
  } catch {
    throw new ApiError(
      `서버에 연결할 수 없습니다.\n(${baseUrl})\n\nPC에서 서버가 실행 중인지, 폰과 PC가 같은 Wi-Fi인지 확인해주세요.`,
      0,
    );
  }
  if (!response.ok) {
    let detail = `요청이 실패했습니다 (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* 본문이 JSON이 아니면 기본 메시지를 쓴다 */
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}

function json(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function photoPart(uri: string) {
  const name = uri.split('/').pop() || 'photo.jpg';
  return { uri, name, type: 'image/jpeg' } as unknown as Blob;
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  // ---- 상품
  recent: (limit = 5) =>
    request<{ items: ProductSummaryCard[]; total_count: number }>(`/product/recent?limit=${limit}`),

  history: (page = 1, limit = 20) =>
    request<{ items: ProductSummaryCard[]; total_count: number }>(
      `/product/history?page=${page}&limit=${limit}`,
    ),

  createProduct: (productName: string, destinationCountry: string | null) =>
    request<{ product_id: string; product_name: string; created_at: string }>(
      '/product/create',
      json({ product_name: productName, destination_country: destinationCountry }),
    ),

  summary: (id: string) => request<ProductSummary>(`/product/${id}/summary`),

  finalize: (id: string) =>
    request<{ status: string; finalized_at: string }>(`/product/${id}/finalize`, { method: 'POST' }),

  // ---- 운송장 마커
  marker: (id: string) => request<MarkerPayload>(`/product/${id}/marker`),

  // ---- CBM
  predictCbm: (id: string, imageUri: string, deviceAngle: number, forceError?: string | null) => {
    const form = new FormData();
    form.append('image', photoPart(imageUri));
    form.append('device_angle', String(deviceAngle));
    if (forceError) form.append('force_error', forceError);
    return request<CbmPredictResponse>(`/product/${id}/cbm/predict`, {
      method: 'POST',
      body: form,
    });
  },

  confirmCbm: (
    id: string,
    body: {
      width_mm: number;
      depth_mm: number;
      height_mm: number;
      weight_kg: number;
      input_method: 'ai' | 'manual';
    },
  ) => request<{ cbm_result: CbmResult }>(`/product/${id}/cbm/confirm`, json(body)),

  manualCbm: (
    id: string,
    body: { width_mm: number; depth_mm: number; height_mm: number; weight_kg: number | null },
  ) => request<{ cbm: number; cbm_result: CbmResult }>(`/product/${id}/cbm/manual`, json(body)),

  // ---- HS Code
  predictHsCode: (id: string, imageUri: string, forceError?: string | null) => {
    const form = new FormData();
    form.append('image', photoPart(imageUri));
    if (forceError) form.append('force_error', forceError);
    return request<HsPredictResponse>(`/product/${id}/hscode/predict`, {
      method: 'POST',
      body: form,
    });
  },

  reviseHsCode: (
    id: string,
    body: { ingredients: Ingredient[]; food_type: string; storage_method: string },
  ) => request<{ hscode_result: HsCodeResult }>(`/product/${id}/hscode/revise`, json(body)),

  manualHsCode: (
    id: string,
    body: { ingredients: Ingredient[]; food_type: string; storage_method: string },
  ) => request<{ hscode_result: HsCodeResult }>(`/product/${id}/hscode/manual`, json(body)),

  selectHsCode: (id: string, hsCode: string) =>
    request<{ hscode_result: HsCodeResult }>(`/product/${id}/hscode/select`, json({ hs_code: hsCode })),

  // ---- 공동물류
  applyLogistics: (id: string) =>
    request<{ applied: boolean; pickup: PickupInfo }>(`/product/${id}/logistics/apply`, {
      method: 'POST',
    }),

  pickup: (id: string) => request<PickupInfo>(`/product/${id}/logistics/pickup`),

  consolidation: (id: string) => request<ConsolidationStatus>(`/product/${id}/logistics/consolidation`),

  shipment: (id: string) => request<ShipmentResult>(`/product/${id}/logistics/shipment`),

  // ---- 운영자
  adminOverview: () => request<AdminOverview>('/admin/overview'),

  adminRoutes: (scenario: 'single_depot' | 'three_region') =>
    request<AdminRoutes>(`/admin/routes?scenario=${scenario}`),
};
