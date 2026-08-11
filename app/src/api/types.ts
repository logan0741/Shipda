import type { HsStatus } from '../theme';

export type Ingredient = { name: string; ratio: number | null };

export type HsAlternative = {
  hs_code: string;
  hs_code_formatted: string;
  name: string;
  confidence: number;
};

export type HsCodeParts = { heading: string; subheading: string; national: string };

export type HsCodeResult = {
  hs_code: string | null;
  hs_code_formatted: string | null;
  hs_code_parts: HsCodeParts | null;
  status: HsStatus;
  confidence: number | null;
  reasoning: string;
  review_note: string;
  ingredients: Ingredient[];
  food_type: string;
  storage_method: string;
  label: string | null;
  alternatives: HsAlternative[];
  input_method: 'ai' | 'manual';
};

export type CbmResult = {
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  cbm: number;
  weight_kg: number | null;
  input_method: 'ai' | 'manual';
};

export type Dimensions = { width_mm: number; depth_mm: number; height_mm: number };

export type Point = [number, number];

export type CbmOverlay = { marker: Point[]; box_top: Point[]; box_bottom: Point[] };

export type CbmPredictResponse = {
  success: boolean;
  dimensions: Dimensions | null;
  cbm: number | null;
  error_reason:
    | 'marker_not_found'
    | 'marker_too_small'
    | 'angle_invalid'
    | 'edge_occluded'
    | null;
  message: string | null;
  guidance: string | null;
  action: 'confirm' | 'retake' | 'manual_corners';
  attempts: number;
  suggest_manual: boolean;
  device_angle?: number;
  overlay?: CbmOverlay;
};

export type HsPredictResponse = {
  success: boolean;
  error_reason: 'text_unreadable' | null;
  message: string | null;
  guidance: string | null;
  action: 'confirm' | 'manual_input';
  product_label?: string;
  ingredients?: Ingredient[];
  food_type?: string;
  storage_method?: string;
  hscode_result: HsCodeResult | null;
};

export type MarkerPayload = {
  marker_id: string;
  marker_size_mm: number;
  pattern: number[][];
  waybill: {
    product_name: string;
    destination_country: string;
    origin: string;
    issued_at: string;
    tracking_no: string;
  };
  marker_image_url: string;
};

export type ProductSummaryCard = {
  product_id: string;
  product_name: string;
  destination_country: string | null;
  hs_code: string | null;
  hs_status: HsStatus | null;
  cbm: number | null;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
};

export type ProductSummary = {
  product_id: string;
  product_name: string;
  destination_country: string | null;
  origin: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  finalized_at: string | null;
  hscode_result: HsCodeResult | null;
  cbm_result: CbmResult | null;
  logistics: {
    applied: boolean;
    applied_at: string;
    stage: string;
    /** 신청 시점에 배정된 집하 정보. 신청 전 화물에는 없다. */
    pickup?: PickupInfo;
  } | null;
};

export type PickupInfo = {
  region: string;
  vehicle: string;
  date_label: string;
  date_iso: string;
  window_start: string;
  window_end: string;
  companion_count: number;
  companion_label: string;
  depot: { name: string; address: string; lat: number; lng: number };
  origin: { name: string; lat: number; lng: number };
  note: string;
};

export type ConsolidationStatus = {
  load_ratio: number;
  load_ratio_exact: number;
  loaded_cbm: number;
  capacity_cbm: number;
  companion_count: number;
  my_cbm: number | null;
  freshness: { label: string; level: 'ample' | 'tight' | 'none'; detail: string };
  decision: string;
  decision_code: string;
  decision_reason: string;
  note: string;
};

export type ShipmentResult = {
  container_type: string;
  load_ratio: number;
  port: string;
  sail_date_label: string;
  sail_date_iso: string;
  cost_individual: number;
  cost_consolidated: number;
  savings: number;
  savings_rate: number;
};

export type Market = {
  id: string;
  name: string;
  district: string;
  region: string;
  lat: number;
  lng: number;
  cargo_count: number;
};

export type RouteScenario = {
  id: 'individual' | 'single_depot' | 'three_region';
  label: string;
  distance_km: number;
  truck_count: number | null;
  description: string;
};

export type AdminOverview = {
  market_total: number;
  cargo_total: number;
  markets: Market[];
  regions: {
    region: string;
    depot: { name: string; lat: number; lng: number };
    market_count: number;
    cargo_count: number;
    market_ids: string[];
  }[];
  scenarios: RouteScenario[];
  bounds: { min_lat: number; max_lat: number; min_lng: number; max_lng: number };
  note: string;
};

export type AdminRoutes = {
  scenario: string;
  routes: {
    region: string;
    depot: { name: string; lat: number; lng: number };
    stops: { id: string; name: string; lat: number; lng: number }[];
  }[];
};
