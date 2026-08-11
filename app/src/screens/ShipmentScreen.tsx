import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import type { ShipmentResult } from '../api/types';
import { Icon } from '../components/Icon';
import { AppHeader, Body, Button, Card, ErrorState, Footer, Loading, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const won = (value: number) => `${value.toLocaleString('ko-KR')} 원`;

export default function ShipmentScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, productName, reset } = useFlow();

  const [result, setResult] = useState<ShipmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.shipment(productId);
      setResult(data);
      await api.finalize(productId).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '정산 결과를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  function goHome() {
    reset();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }),
    );
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title="출고 · 정산" />
        <Loading label="정산 내역을 계산하고 있어요" />
      </Screen>
    );
  }

  if (error || !result) {
    return (
      <Screen>
        <AppHeader title="출고 · 정산" onBack={() => navigation.goBack()} />
        <ErrorState message={error ?? '정산 결과를 불러오지 못했습니다.'} onRetry={load} />
      </Screen>
    );
  }

  const maxCost = Math.max(result.cost_individual, result.cost_consolidated);

  return (
    <Screen>
      <AppHeader title="출고 · 정산" />

      <Body>
        <Card style={s.hero}>
          <Icon name="check-circle" size={40} color={colors.successAccent} />
          <Text style={s.heroTitle}>출고 완료</Text>
          <Text style={s.heroProduct}>{productName}</Text>
        </Card>

        <Card padded={false}>
          <Row label="컨테이너" value={`${result.container_type} · 적재율 ${result.load_ratio.toFixed(1)}%`} />
          <Row label="선적" value={`${result.port} ${result.sail_date_label}`} last />
        </Card>

        <Text style={s.sectionTitle}>물류비 비교</Text>
        <Card style={s.costCard}>
          <CostBar
            label="개별 LCL 발송 시"
            amount={result.cost_individual}
            ratio={result.cost_individual / maxCost}
            tone={colors.textMuted}
          />
          <CostBar
            label="공동물류 이용"
            amount={result.cost_consolidated}
            ratio={result.cost_consolidated / maxCost}
            tone={colors.navy}
          />

          <View style={s.savings}>
            <View style={s.savingsHead}>
              <Icon name="trending-down" size={19} color={colors.successFg} />
              <Text style={s.savingsLabel}>절감</Text>
            </View>
            <View style={s.savingsRight}>
              <Text style={s.savingsValue}>{won(result.savings)}</Text>
              <Text style={s.savingsRate}>{result.savings_rate}% 절감</Text>
            </View>
          </View>
        </Card>

        <Card style={s.noteCard}>
          <Text style={s.noteText}>
            같은 권역의 화물을 묶어 컨테이너 한 대를 채웠기 때문에, 혼자 LCL로 보낼 때보다 단위 체적당 운임이
            내려갔습니다.
          </Text>
        </Card>
      </Body>

      <Footer>
        <Button label="메인으로" onPress={goHome} icon="home" />
      </Footer>
    </Screen>
  );
}

function CostBar({
  label,
  amount,
  ratio,
  tone,
}: {
  label: string;
  amount: number;
  ratio: number;
  tone: string;
}) {
  return (
    <View style={s.costRow}>
      <View style={s.costHead}>
        <Text style={s.costLabel}>{label}</Text>
        <Text style={[s.costAmount, { color: tone === colors.navy ? colors.navy : colors.text }]}>
          {won(amount)}
        </Text>
      </View>
      <View style={s.costTrack}>
        <View style={[s.costFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, last && s.rowLast]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingVertical: spacing.xxl },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  heroProduct: { fontSize: 14, color: colors.textSub, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13.5, color: colors.textSub },
  rowValue: { fontSize: 14.5, fontWeight: '700', color: colors.text },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginTop: spacing.sm },

  costCard: { gap: spacing.lg },
  costRow: { gap: 7 },
  costHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  costLabel: { fontSize: 13, color: colors.textSub },
  costAmount: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  costTrack: { height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  costFill: { height: 10, borderRadius: radius.pill },

  savings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  savingsHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  savingsLabel: { fontSize: 14, fontWeight: '700', color: colors.successFg },
  savingsRight: { alignItems: 'flex-end' },
  savingsValue: { fontSize: 22, fontWeight: '800', color: colors.successFg, fontVariant: ['tabular-nums'] },
  savingsRate: { fontSize: 11.5, color: colors.successFg, opacity: 0.85, fontWeight: '600' },

  noteCard: { backgroundColor: colors.surfaceAlt },
  noteText: { fontSize: 12.5, color: colors.textSub, lineHeight: 20 },
});
