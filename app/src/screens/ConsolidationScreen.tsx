import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import type { ConsolidationStatus } from '../api/types';
import { Icon } from '../components/Icon';
import { LoadGauge } from '../components/LoadGauge';
import { AppHeader, Body, Button, Card, Chip, ErrorState, Footer, Loading, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FRESHNESS_TONE = {
  ample: 'success',
  tight: 'warn',
  none: 'neutral',
} as const;

export default function ConsolidationScreen() {
  const navigation = useNavigation<Nav>();
  const { productId } = useFlow();

  const [status, setStatus] = useState<ConsolidationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      setStatus(await api.consolidation(productId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '대기 현황을 불러오지 못했습니다.');
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
        <AppHeader title="혼재 대기 현황" onBack={() => navigation.goBack()} />
        <Loading label="컨테이너 적재 상황을 확인하고 있어요" />
      </Screen>
    );
  }

  if (error || !status) {
    return (
      <Screen>
        <AppHeader title="혼재 대기 현황" onBack={() => navigation.goBack()} />
        <ErrorState message={error ?? '대기 현황을 불러오지 못했습니다.'} onRetry={load} />
      </Screen>
    );
  }

  const shipNow = status.decision_code === 'ship';

  return (
    <Screen>
      <AppHeader title="혼재 대기 현황" onBack={() => navigation.goBack()} />

      <Body>
        <Text style={s.lead}>
          집하된 화물은 컨테이너가 찰 때까지 대기합니다. 오래 기다릴수록 물류비는 내려가지만 신선도 마감이 다가옵니다.
        </Text>

        <Card>
          <Text style={s.cardTitle}>적재율</Text>
          <LoadGauge
            ratio={status.load_ratio}
            loadedCbm={status.loaded_cbm}
            capacityCbm={status.capacity_cbm}
            myCbm={status.my_cbm}
          />
        </Card>

        <Card padded={false}>
          <Row label="동반 화물" value={`${status.companion_count}건`} />
          <Row
            label="내 화물 신선도 여유"
            value={<Chip label={status.freshness.label} tone={FRESHNESS_TONE[status.freshness.level]} />}
            last
          />
        </Card>

        <Card style={[s.decision, shipNow ? s.decisionShip : s.decisionWait]}>
          <View style={s.decisionHead}>
            <Icon
              name={shipNow ? 'check-circle' : 'clock'}
              size={24}
              color={shipNow ? colors.successFg : colors.warnFg}
            />
            <View style={s.decisionBody}>
              <Text style={s.decisionLabel}>판정</Text>
              <Text style={[s.decisionValue, { color: shipNow ? colors.successFg : colors.warnFg }]}>
                {status.decision}
              </Text>
            </View>
          </View>
          <Text style={[s.decisionReason, { color: shipNow ? colors.successFg : colors.warnFg }]}>
            {status.decision_reason}
          </Text>
        </Card>

        <Card style={s.freshnessCard}>
          <Text style={s.freshnessTitle}>{status.freshness.label}</Text>
          <Text style={s.freshnessDetail}>{status.freshness.detail}</Text>
        </Card>

        <Card style={s.noteCard}>
          <View style={s.noteHead}>
            <Icon name="info" size={17} color={colors.navy} />
            <Text style={s.noteTitle}>출고 시점은 이렇게 정합니다</Text>
          </View>
          <Text style={s.noteText}>{status.note}</Text>
        </Card>
      </Body>

      <Footer>
        <Button label="출고 · 정산 결과 보기" onPress={() => navigation.navigate('Shipment')} icon="anchor" />
      </Footer>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <View style={[s.row, last && s.rowLast]}>
      <Text style={s.rowLabel}>{label}</Text>
      {typeof value === 'string' ? <Text style={s.rowValue}>{value}</Text> : value}
    </View>
  );
}

const s = StyleSheet.create({
  lead: { fontSize: 13.5, color: colors.textSub, lineHeight: 21 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginBottom: spacing.md },

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

  decision: { gap: spacing.sm },
  decisionShip: { backgroundColor: colors.successBg, borderColor: '#B7D6C6' },
  decisionWait: { backgroundColor: colors.warnBg, borderColor: '#EBD6AE' },
  decisionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  decisionBody: { gap: 1 },
  decisionLabel: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  decisionValue: { fontSize: 22, fontWeight: '800' },
  decisionReason: { fontSize: 13, lineHeight: 20, opacity: 0.92 },

  freshnessCard: { gap: 5 },
  freshnessTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  freshnessDetail: { fontSize: 13, color: colors.textSub, lineHeight: 20 },

  noteCard: { backgroundColor: colors.navySoft, borderColor: '#D3DFEE', gap: spacing.sm },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  noteTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  noteText: { fontSize: 13, color: colors.navy, lineHeight: 20, opacity: 0.9 },
});
