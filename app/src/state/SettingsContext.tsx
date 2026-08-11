import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { getBaseUrl, resetBaseUrl, setBaseUrl } from '../api/client';

export type CbmForceError =
  | null
  | 'marker_not_found'
  | 'marker_too_small'
  | 'angle_invalid'
  | 'edge_occluded';

export type HsForceError = null | 'text_unreadable' | 'ratio_missing';

export const CBM_ERROR_OPTIONS: { id: CbmForceError; label: string }[] = [
  { id: null, label: '정상 인식' },
  { id: 'marker_not_found', label: '마커를 못 찾음' },
  { id: 'marker_too_small', label: '마커가 너무 작게 찍힘' },
  { id: 'angle_invalid', label: '촬영 각도가 30도 미만' },
  { id: 'edge_occluded', label: '박스 모서리가 가려짐' },
];

export const HS_ERROR_OPTIONS: { id: HsForceError; label: string }[] = [
  { id: null, label: '정상 인식' },
  { id: 'text_unreadable', label: '표시사항이 흐림' },
  { id: 'ratio_missing', label: '원재료 함량이 없음' },
];

type SettingsValue = {
  /** 각도 게이팅을 끄면 어떤 각도에서도 촬영 버튼이 눌린다 (시연장 여건 대비). */
  enforceAngle: boolean;
  setEnforceAngle: (v: boolean) => void;

  cbmForceError: CbmForceError;
  setCbmForceError: (v: CbmForceError) => void;

  hsForceError: HsForceError;
  setHsForceError: (v: HsForceError) => void;

  baseUrl: string;
  updateBaseUrl: (url: string) => void;
  restoreBaseUrl: () => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [enforceAngle, setEnforceAngle] = useState(true);
  const [cbmForceError, setCbmForceError] = useState<CbmForceError>(null);
  const [hsForceError, setHsForceError] = useState<HsForceError>(null);
  const [baseUrl, setBaseUrlState] = useState(getBaseUrl());

  const updateBaseUrl = useCallback((url: string) => {
    setBaseUrl(url);
    setBaseUrlState(getBaseUrl());
  }, []);

  const restoreBaseUrl = useCallback(() => {
    setBaseUrlState(resetBaseUrl());
  }, []);

  const value = useMemo(
    () => ({
      enforceAngle,
      setEnforceAngle,
      cbmForceError,
      setCbmForceError,
      hsForceError,
      setHsForceError,
      baseUrl,
      updateBaseUrl,
      restoreBaseUrl,
    }),
    [enforceAngle, cbmForceError, hsForceError, baseUrl, updateBaseUrl, restoreBaseUrl],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings는 SettingsProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
