/** 와이어프레임 기준 디자인 토큰. */

export const colors = {
  // 브랜드 — 짙은 네이비
  navy: '#1E3A5C',
  navyDark: '#162C46',
  navyLight: '#2C5182',
  navySoft: '#E8EEF6',

  // 배경 / 표면
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FB',
  border: '#E4E7EC',
  borderStrong: '#D3D8E0',

  // 텍스트
  text: '#1A1D21',
  textSub: '#5C6470',
  textMuted: '#98A0AC',
  onNavy: '#FFFFFF',
  onNavySub: '#B9C7DA',

  // 판정 상태 3단계 (기능명세서 6.3)
  successBg: '#CFE3D8',
  successFg: '#1F6B4A',
  successAccent: '#2E9E6B',

  warnBg: '#FAEBD0',
  warnFg: '#A96A05',
  warnAccent: '#E09A26',

  dangerBg: '#FBDFDB',
  dangerFg: '#B33A2B',
  dangerAccent: '#D9543F',

  infoBg: '#DDE7F3',
  infoFg: '#2C5182',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const font = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 19, fontWeight: '700' },
  h3: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0B1B2E',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0B1B2E',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/** 판정 상태 → 라벨/색상 매핑. 앱 전체에서 이 함수만 사용한다. */
export type HsStatus = 'approved' | 'pre_review_recommended' | 'review_required';

export function statusTheme(status: HsStatus | null | undefined) {
  switch (status) {
    case 'approved':
      return { label: '신고 가능', bg: colors.successBg, fg: colors.successFg, accent: colors.successAccent };
    case 'pre_review_recommended':
      return { label: '사전심사 권장', bg: colors.warnBg, fg: colors.warnFg, accent: colors.warnAccent };
    case 'review_required':
      return { label: '검토 필요', bg: colors.dangerBg, fg: colors.dangerFg, accent: colors.dangerAccent };
    default:
      return { label: '미판정', bg: colors.border, fg: colors.textSub, accent: colors.textMuted };
  }
}
