import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { api, ApiError } from '../api/client';
import type { PickupInfo } from '../api/types';
import { Icon } from '../components/Icon';
import { AppHeader, Body, Button, Card, ErrorState, Footer, Loading, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PickupScreen() {
  const navigation = useNavigation<Nav>();
  const { productId } = useFlow();

  const [info, setInfo] = useState<PickupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      setInfo(await api.pickup(productId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '집하 정보를 불러오지 못했습니다.');
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
        <AppHeader title="집하 안내" onBack={() => navigation.goBack()} />
        <Loading label="집하 동선을 짜고 있어요" />
      </Screen>
    );
  }

  if (error || !info) {
    return (
      <Screen>
        <AppHeader title="집하 안내" onBack={() => navigation.goBack()} />
        <ErrorState message={error ?? '집하 정보를 불러오지 못했습니다.'} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="집하 안내" onBack={() => navigation.goBack()} />

      <Body>
        <Card style={s.hero}>
          <View style={s.heroTop}>
            <Icon name="truck" size={22} color={colors.onNavy} />
            <Text style={s.heroLabel}>집하 예정</Text>
          </View>
          <Text style={s.heroDate}>{info.date_label}</Text>
          <Text style={s.heroTime}>
            {info.window_start} ~ {info.window_end}
          </Text>
        </Card>

        <Card padded={false}>
          <Row label="권역" value={info.region} />
          <Row label="차량" value={info.vehicle} />
          <Row label="함께 실리는 화물" value={info.companion_label} last />
        </Card>

        <Text style={s.sectionTitle}>집하 위치</Text>
        <Card padded={false}>
          <PickupMap info={info} />
          <View style={s.addressBox}>
            <Icon name="map-pin" size={17} color={colors.navy} />
            <View style={s.addressBody}>
              <Text style={s.depotName}>{info.depot.name}</Text>
              <Text style={s.depotAddress}>{info.depot.address}</Text>
            </View>
          </View>
        </Card>

        <Card style={s.noteCard}>
          <View style={s.noteHead}>
            <Icon name="info" size={17} color={colors.navy} />
            <Text style={s.noteTitle}>어떻게 정해지나요?</Text>
          </View>
          <Text style={s.noteText}>{info.note}</Text>
        </Card>
      </Body>

      <Footer>
        <Button label="혼재 대기 현황 보기" onPress={() => navigation.navigate('Consolidation')} />
      </Footer>
    </Screen>
  );
}

/** 출발지와 집하소만 보여주는 간이 지도. */
function PickupMap({ info }: { info: PickupInfo }) {
  const W = 320;
  const H = 150;
  const pad = 42;

  const lats = [info.origin.lat, info.depot.lat];
  const lngs = [info.origin.lng, info.depot.lng];
  const minLat = Math.min(...lats) - 0.05;
  const maxLat = Math.max(...lats) + 0.05;
  const minLng = Math.min(...lngs) - 0.05;
  const maxLng = Math.max(...lngs) + 0.05;

  const project = (lat: number, lng: number) => ({
    x: pad + ((lng - minLng) / (maxLng - minLng)) * (W - pad * 2),
    y: pad + ((maxLat - lat) / (maxLat - minLat)) * (H - pad * 2),
  });

  const from = project(info.origin.lat, info.origin.lng);
  const to = project(info.depot.lat, info.depot.lng);

  return (
    <View style={s.map}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <Rect x={0} y={0} width={W} height={H} fill="#EEF2F7" />

        <Line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={colors.navy}
          strokeWidth={2.2}
          strokeDasharray="7 5"
        />

        <Circle cx={from.x} cy={from.y} r={7} fill={colors.warnAccent} stroke="#FFFFFF" strokeWidth={2} />
        <SvgText x={from.x} y={from.y - 13} fill={colors.text} fontSize={11} fontWeight="700" textAnchor="middle">
          {info.origin.name}
        </SvgText>

        <Rect x={to.x - 8} y={to.y - 8} width={16} height={16} rx={3.5} fill={colors.navy} stroke="#FFFFFF" strokeWidth={2} />
        <SvgText x={to.x} y={to.y + 24} fill={colors.text} fontSize={11} fontWeight="700" textAnchor="middle">
          {info.region}
        </SvgText>
      </Svg>
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
  hero: { backgroundColor: colors.navy, borderColor: colors.navy, gap: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  heroLabel: { fontSize: 13, color: colors.onNavySub, fontWeight: '600' },
  heroDate: { fontSize: 24, fontWeight: '800', color: colors.onNavy },
  heroTime: { fontSize: 17, fontWeight: '600', color: colors.onNavySub, fontVariant: ['tabular-nums'] },

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
  map: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden' },

  addressBox: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addressBody: { flex: 1, gap: 2 },
  depotName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  depotAddress: { fontSize: 12.5, color: colors.textSub },

  noteCard: { backgroundColor: colors.navySoft, borderColor: '#D3DFEE', gap: spacing.sm },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  noteTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  noteText: { fontSize: 13, color: colors.navy, lineHeight: 20, opacity: 0.9 },
});
