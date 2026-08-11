import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type {
  CbmOverlay,
  CbmResult,
  Dimensions,
  HsCodeResult,
  MarkerPayload,
} from '../api/types';

/**
 * 등록 플로우 한 건의 작업 상태.
 * 화면 간에 사진·측정값·판정결과를 넘기기 위해 네비게이션 파라미터 대신 여기에 모은다.
 */
type FlowState = {
  productId: string | null;
  productName: string;
  destinationCountry: string | null;

  marker: MarkerPayload | null;

  boxPhotoUri: string | null;
  boxOverlay: CbmOverlay | null;
  dimensions: Dimensions | null;
  cbm: CbmResult | null;

  labelPhotoUri: string | null;
  hs: HsCodeResult | null;
};

const EMPTY: FlowState = {
  productId: null,
  productName: '',
  destinationCountry: null,
  marker: null,
  boxPhotoUri: null,
  boxOverlay: null,
  dimensions: null,
  cbm: null,
  labelPhotoUri: null,
  hs: null,
};

type FlowContextValue = FlowState & {
  start: (productId: string, productName: string, destinationCountry: string | null) => void;
  patch: (next: Partial<FlowState>) => void;
  reset: () => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(EMPTY);

  const start = useCallback(
    (productId: string, productName: string, destinationCountry: string | null) => {
      setState({ ...EMPTY, productId, productName, destinationCountry });
    },
    [],
  );

  const patch = useCallback((next: Partial<FlowState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => setState(EMPTY), []);

  const value = useMemo(() => ({ ...state, start, patch, reset }), [state, start, patch, reset]);

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow는 FlowProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}

/** productId가 반드시 있어야 하는 화면에서 쓴다. */
export function useProductId(): string {
  const { productId } = useFlow();
  if (!productId) throw new Error('등록 중인 상품이 없습니다.');
  return productId;
}
