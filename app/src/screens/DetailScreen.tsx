import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import type { HsAlternative, ProductSummary } from '../api/types';
import { Icon } from '../components/Icon';
import {
  AppHeader,
  Banner,
  Body,
  Button,
  Card,
  Chip,
  ErrorState,
  Footer,
  Loading,
  Screen,
  StatusBadge,
} from '../components/ui';
import { formatConfidence, formatDateTime, productStatusOf } from '../format';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing, statusTheme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Params = RouteProp<RootStackParamList, 'Detail'>;

/** 이 값 아래면 결과 대신 경고 배너를 먼저 띄운다. */
const LOW_CONFIDENCE = 0.6;

export default function DetailScreen() {
  const navigation = useNavigation<Nav>();
  const { productId } = useRoute<Params>().params;
  const { start, patch } = useFlow();

  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.summary(productId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '분석 결과를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <AppHeader title="분석 결과" onBack={() => navigation.goBack()} />
        <Loading label="결과를 불러오는 중이에요" />
      </Screen>
    );
  }

  if (error || !summary) {
    return (
      <Screen>
        <AppHeader title="분석 결과" onBack={() => navigation.goBack()} />
        <ErrorState message={error ?? '분석 결과를 불러오지 못했습니다.'} onRetry={load} />
      </Screen>
    );
  }

  const hs = summary.hscode_result;
  const cbm = summary.cbm_result;
  const state = productStatusOf(summary.status);
  const tone = statusTheme(hs?.status);
  const confidence = hs?.confidence ?? null;
  const lowConfidence = hs != null && (confidence == null || confidence < LOW_CONFIDENCE);

  /** 이력에서 들어온 화물의 물류 화면을 보려면 플로우 상태를 그 화물로 바꿔준다. */
  function openLogistics() {
    if (!summary) return;
    start(summary.product_id, summary.product_name, summary.destination_country);
    patch({ hs: summary.hscode_result, cbm: summary.cbm_result });
    navigation.navigate('Pickup');
  }

  return (
    <Screen>
      <AppHeader title="분석 결과" onBack={() => navigation.goBack()} />

      <Body>
        <Card style={s.productCard}>
          <View style={s.productTop}>
            <Text style={s.productName} numberOfLines={2}>
              {summary.product_name}
            </Text>
            <Chip label={state.label} tone={state.tone} />
          </View>
          <View style={s.productMeta}>
            <Icon name="globe" size={14} color={colors.onNavySub} />
            <Text style={s.productMetaText}>
              {summary.origin} → {summary.destination_country ?? '-'}
            </Text>
          </View>
          <Text style={s.productDate}>등록 {formatDateTime(summary.created_at)}</Text>
        </Card>

        <View style={s.thumb}>
          <Icon name="package" size={26} color={colors.textMuted} />
          <Text style={s.thumbText}>상품 이미지</Text>
        </View>

        {lowConfidence ? (
          <Banner
            tone={hs?.status === 'review_required' ? 'danger' : 'warn'}
            title={
              confidence != null
                ? `신뢰도가 낮아요 (${formatConfidence(confidence)})`
                : '자동 판정을 하지 않았어요'
            }
            message={
              hs?.input_method === 'manual'
                ? '직접 입력한 정보라 관세사 확인이 필요합니다.'
                : '사진을 다시 확인하거나 전문가 상담을 권장합니다.'
            }
          />
        ) : null}

        {/* HS Code */}
        <Card padded={false}>
          <View style={s.sectionHead}>
            <Icon name="file-text" size={17} color={colors.textSub} />
            <Text style={s.sectionTitle}>HS Code</Text>
            {hs?.input_method === 'manual' ? <Chip label="직접 입력" tone="warn" /> : null}
          </View>

          {hs ? (
            <View style={s.cardBody}>
              <View style={[s.hsBox, { backgroundColor: tone.bg }]}>
                <Text style={[s.hsLabel, { color: tone.fg }]}>HS Code</Text>
                <Text style={[s.hsCode, { color: tone.fg }]}>
                  {hs.hs_code_formatted ?? '미판정'}
                </Text>
                <Text style={[s.hsConfidence, { color: tone.fg }]}>
                  신뢰도 {formatConfidence(confidence)}
                </Text>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.barFill,
                      { width: `${Math.round((confidence ?? 0) * 100)}%`, backgroundColor: tone.accent },
                    ]}
                  />
                </View>
              </View>

              <View style={s.badgeRow}>
                <StatusBadge status={hs.status} />
              </View>

              {hs.reasoning ? <Text style={s.reason}>{hs.reasoning}</Text> : null}
              {hs.review_note ? <Text style={s.reviewNote}>{hs.review_note}</Text> : null}

              <Row label="식품유형" value={hs.food_type || '-'} />
              <Row label="보관방법" value={hs.storage_method || '-'} />
              <Row
                label="원재료"
                value={
                  hs.ingredients.length > 0
                    ? hs.ingredients
                        .map((i) => (i.ratio != null ? `${i.name} ${i.ratio}%` : i.name))
                        .join(', ')
                    : '-'
                }
                last
              />
            </View>
          ) : (
            <View style={s.cardBody}>
              <Text style={s.missing}>아직 HS Code를 판정하지 않았어요</Text>
            </View>
          )}
        </Card>

        {/* 차순위 후보 */}
        {hs && hs.alternatives.length > 0 ? (
          <Card padded={false}>
            <View style={s.sectionHead}>
              <Icon name="layers" size={17} color={colors.textSub} />
              <Text style={s.sectionTitle}>
                {lowConfidence ? '가능성 있는 후보' : '다른 후보 코드'}
              </Text>
            </View>
            <View style={s.altList}>
              {hs.alternatives.map((alt, i) => (
                <AlternativeRow
                  key={alt.hs_code}
                  alt={alt}
                  last={i === hs.alternatives.length - 1}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {/* 체적 */}
        <Card padded={false}>
          <View style={s.sectionHead}>
            <Icon name="package" size={17} color={colors.textSub} />
            <Text style={s.sectionTitle}>체적 · 무게</Text>
            {cbm?.input_method === 'manual' ? <Chip label="직접 입력" tone="warn" /> : null}
          </View>
          <View style={s.cardBody}>
            {cbm ? (
              <>
                <View style={s.cbmRow}>
                  <Text style={s.cbmValue}>{cbm.cbm.toFixed(3)}</Text>
                  <Text style={s.cbmUnit}>CBM</Text>
                </View>
                <Row label="치수" value={`${cbm.width_mm} × ${cbm.depth_mm} × ${cbm.height_mm} mm`} />
                <Row label="무게" value={cbm.weight_kg != null ? `${cbm.weight_kg} kg` : '-'} last />
              </>
            ) : (
              <Text style={s.missing}>아직 체적을 측정하지 않았어요</Text>
            )}
          </View>
        </Card>

        {/* 물류 */}
        {summary.logistics?.applied ? (
          <Card padded={false}>
            <View style={s.sectionHead}>
              <Icon name="truck" size={17} color={colors.textSub} />
              <Text style={s.sectionTitle}>공동물류</Text>
            </View>
            <View style={s.cardBody}>
              <Row label="신청" value={formatDateTime(summary.logistics.applied_at)} />
              <Row label="현재 단계" value={summary.logistics.stage} last />
            </View>
          </Card>
        ) : null}
      </Body>

      {summary.logistics?.applied ? (
        <Footer>
          <Button label="수출 절차 보기" icon="truck" onPress={openLogistics} />
        </Footer>
      ) : null}
    </Screen>
  );
}

function AlternativeRow({ alt, last }: { alt: HsAlternative; last?: boolean }) {
  return (
    <View style={[s.altRow, !last && s.altRowBorder]}>
      <View style={s.altText}>
        <Text style={s.altCode}>{alt.hs_code_formatted}</Text>
        <Text style={s.altName} numberOfLines={1}>
          {alt.name}
        </Text>
      </View>
      <Text style={s.altConfidence}>{formatConfidence(alt.confidence)}</Text>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, last && s.rowLast]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  productCard: { backgroundColor: colors.navy, borderColor: colors.navy, gap: 7 },
  productTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  productName: { flex: 1, fontSize: 19, fontWeight: '700', color: colors.onNavy, lineHeight: 27 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productMetaText: { fontSize: 13, color: colors.onNavySub },
  productDate: { fontSize: 11.5, color: colors.onNavySub, opacity: 0.85 },

  thumb: {
    height: 108,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  thumbText: { fontSize: 12.5, color: colors.textMuted },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.textSub },
  cardBody: { padding: spacing.lg, gap: 2 },

  hsBox: { borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', gap: 3 },
  hsLabel: { fontSize: 12, fontWeight: '700', opacity: 0.9 },
  hsCode: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hsConfidence: { fontSize: 12, fontWeight: '600', opacity: 0.9 },
  barTrack: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: radius.pill },

  badgeRow: { alignItems: 'center', marginTop: spacing.md },
  reason: { fontSize: 12.5, color: colors.textSub, lineHeight: 19, marginTop: spacing.md },
  reviewNote: { fontSize: 12, color: colors.warnFg, lineHeight: 18, marginTop: 4 },
  missing: { fontSize: 14, fontWeight: '600', color: colors.textMuted },

  altList: { paddingHorizontal: spacing.lg },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 13 },
  altRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  altText: { flex: 1, gap: 2 },
  altCode: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  altName: { fontSize: 12, color: colors.textMuted },
  altConfidence: { fontSize: 13.5, fontWeight: '700', color: colors.textSub, fontVariant: ['tabular-nums'] },

  cbmRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: spacing.sm },
  cbmValue: { fontSize: 28, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'] },
  cbmUnit: { fontSize: 14, fontWeight: '700', color: colors.textSub },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, color: colors.textSub, flexShrink: 0 },
  rowValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
});
