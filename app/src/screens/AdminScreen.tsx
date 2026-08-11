import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { api, ApiError } from '../api/client';
import type { AdminOverview, AdminRoutes, RouteScenario } from '../api/types';
import { Icon } from '../components/Icon';
import { REGION_COLORS, RegionMap } from '../components/RegionMap';
import { AppHeader, Body, Card, ErrorState, Loading, Screen } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ScenarioId = RouteScenario['id'];

const MAP_HEIGHT = 260;

export default function AdminScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [routes, setRoutes] = useState<AdminRoutes | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>('three_region');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await api.adminOverview());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '운영 현황을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 개별 배송은 거점이 없어 경로가 존재하지 않는다
  useEffect(() => {
    if (scenario === 'individual') {
      setRoutes(null);
      return;
    }
    let alive = true;
    api
      .adminRoutes(scenario)
      .then((res) => {
        if (alive) setRoutes(res);
      })
      .catch(() => {
        if (alive) setRoutes(null);
      });
    return () => {
      alive = false;
    };
  }, [scenario]);

  if (loading) {
    return (
      <Screen>
        <AppHeader title="공동물류 운영 현황" onBack={() => navigation.goBack()} />
        <Loading label="권역 화물을 모으는 중이에요" />
      </Screen>
    );
  }

  if (error || !overview) {
    return (
      <Screen>
        <AppHeader title="공동물류 운영 현황" onBack={() => navigation.goBack()} />
        <ErrorState message={error ?? '운영 현황을 불러오지 못했습니다.'} onRetry={load} />
      </Screen>
    );
  }

  const active = overview.scenarios.find((sc) => sc.id === scenario) ?? overview.scenarios[0];

  return (
    <Screen>
      <AppHeader
        title="공동물류 운영 현황"
        subtitle="광주 · 전남 전통시장"
        onBack={() => navigation.goBack()}
      />

      <Body>
        <View style={s.statRow}>
          <Stat icon="map-pin" value={String(overview.market_total)} label="전통시장" />
          <Stat icon="package" value={String(overview.cargo_total)} label="수출 화물" />
          <Stat
            icon="truck"
            value={active?.truck_count != null ? String(active.truck_count) : '-'}
            label="필요 차량"
          />
        </View>

        <ScenarioTabs
          scenarios={overview.scenarios}
          value={scenario}
          onChange={(id) => setScenario(id)}
        />

        <RegionMap
          overview={overview}
          routes={routes}
          width={width - spacing.lg * 2}
          height={MAP_HEIGHT}
          showRoutes={scenario !== 'individual'}
        />

        <View style={s.legend}>
          {overview.regions.map((region) => (
            <View key={region.region} style={s.legendItem}>
              <View
                style={[
                  s.legendDot,
                  { backgroundColor: REGION_COLORS[region.region] ?? colors.navy },
                ]}
              />
              <Text style={s.legendText}>{region.region}</Text>
            </View>
          ))}
        </View>

        {active ? (
          <Card style={s.activeCard}>
            <Text style={s.activeLabel}>{active.label}</Text>
            <View style={s.activeRow}>
              <Text style={s.activeValue}>{active.distance_km.toLocaleString()}</Text>
              <Text style={s.activeUnit}>km 총 이동거리</Text>
            </View>
            <Text style={s.activeDesc}>{active.description}</Text>
          </Card>
        ) : null}

        <Text style={s.sectionTitle}>권역별 집하</Text>
        <Card padded={false}>
          {overview.regions.map((region, i) => (
            <View
              key={region.region}
              style={[s.regionRow, i < overview.regions.length - 1 && s.regionRowBorder]}
            >
              <View
                style={[
                  s.regionDot,
                  { backgroundColor: REGION_COLORS[region.region] ?? colors.navy },
                ]}
              />
              <View style={s.regionText}>
                <Text style={s.regionName}>{region.region}</Text>
                <Text style={s.regionDepot}>{region.depot.name}</Text>
              </View>
              <View style={s.regionNumbers}>
                <Text style={s.regionCargo}>화물 {region.cargo_count}건</Text>
                <Text style={s.regionMarket}>시장 {region.market_count}곳</Text>
              </View>
            </View>
          ))}
        </Card>

        <Text style={s.sectionTitle}>시나리오 비교</Text>
        <Card padded={false}>
          {overview.scenarios.map((sc, i) => (
            <Pressable
              key={sc.id}
              onPress={() => setScenario(sc.id)}
              style={({ pressed }) => [
                s.compareRow,
                i < overview.scenarios.length - 1 && s.regionRowBorder,
                sc.id === scenario && s.compareRowActive,
                pressed && s.comparePressed,
              ]}
            >
              <View style={s.compareText}>
                <Text style={[s.compareLabel, sc.id === scenario && s.compareLabelActive]}>
                  {sc.label}
                </Text>
                <Text style={s.compareDesc} numberOfLines={2}>
                  {sc.description}
                </Text>
              </View>
              <View style={s.compareNumbers}>
                <Text style={s.compareDistance}>{sc.distance_km.toLocaleString()} km</Text>
                <Text style={s.compareTruck}>
                  {sc.truck_count != null ? `차량 ${sc.truck_count}대` : '거점 없음'}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>

        <Text style={s.note}>{overview.note}</Text>
      </Body>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: 'map-pin' | 'package' | 'truck'; value: string; label: string }) {
  return (
    <Card style={s.stat}>
      <Icon name={icon} size={18} color={colors.navy} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Card>
  );
}

function ScenarioTabs({
  scenarios,
  value,
  onChange,
}: {
  scenarios: RouteScenario[];
  value: ScenarioId;
  onChange: (id: ScenarioId) => void;
}) {
  return (
    <View style={s.tabs}>
      {scenarios.map((sc) => {
        const activeTab = sc.id === value;
        return (
          <Pressable
            key={sc.id}
            onPress={() => onChange(sc.id)}
            style={[s.tab, activeTab && s.tabActive]}
          >
            <Text style={[s.tabText, activeTab && s.tabTextActive]} numberOfLines={1}>
              {sc.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: spacing.lg, paddingHorizontal: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11.5, color: colors.textMuted },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.navy },
  tabText: { fontSize: 12.5, fontWeight: '600', color: colors.textSub },
  tabTextActive: { color: colors.onNavy, fontWeight: '700' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: radius.pill },
  legendText: { fontSize: 11.5, color: colors.textSub, fontWeight: '600' },

  activeCard: { backgroundColor: colors.navy, borderColor: colors.navy, gap: 5 },
  activeLabel: { fontSize: 12.5, fontWeight: '700', color: colors.onNavySub },
  activeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  activeValue: { fontSize: 28, fontWeight: '800', color: colors.onNavy, fontVariant: ['tabular-nums'] },
  activeUnit: { fontSize: 13, fontWeight: '600', color: colors.onNavySub },
  activeDesc: { fontSize: 12.5, color: colors.onNavySub, lineHeight: 19 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },

  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
  },
  regionRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  regionDot: { width: 11, height: 11, borderRadius: radius.pill },
  regionText: { flex: 1, gap: 2 },
  regionName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  regionDepot: { fontSize: 11.5, color: colors.textMuted },
  regionNumbers: { alignItems: 'flex-end', gap: 2 },
  regionCargo: { fontSize: 13.5, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  regionMarket: { fontSize: 11.5, color: colors.textMuted, fontVariant: ['tabular-nums'] },

  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
  },
  compareRowActive: { backgroundColor: colors.navySoft },
  comparePressed: { opacity: 0.85 },
  compareText: { flex: 1, gap: 3 },
  compareLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  compareLabelActive: { color: colors.navy },
  compareDesc: { fontSize: 11.5, color: colors.textMuted, lineHeight: 17 },
  compareNumbers: { alignItems: 'flex-end', gap: 2 },
  compareDistance: { fontSize: 14, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  compareTruck: { fontSize: 11.5, color: colors.textMuted },

  note: { fontSize: 12, color: colors.textMuted, lineHeight: 19, marginTop: spacing.xs },
});
