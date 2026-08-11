import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../api/client';
import type { ProductSummaryCard } from '../api/types';
import { Icon } from '../components/Icon';
import { Button, Card, Chip, StatusBadge } from '../components/ui';
import { formatDate, productStatusOf } from '../format';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ProductSummaryCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    setError(null);
    try {
      const res = await api.history(1, PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total_count);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '분석 이력을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  async function loadMore() {
    const nextPage = Math.floor(items.length / PAGE_SIZE) + 1;
    setLoadingMore(true);
    try {
      const res = await api.history(nextPage, PAGE_SIZE);
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total_count);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '다음 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = items.length < total;

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={s.headerTitle}>분석 이력</Text>
        {total > 0 ? <Text style={s.headerCount}>{total}건</Text> : null}
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadFirstPage();
            }}
            tintColor={colors.navy}
          />
        }
      >
        {error ? (
          <Card style={s.stateCard}>
            <Icon name="alert-circle" size={26} color={colors.dangerAccent} />
            <Text style={s.stateText}>{error}</Text>
            <Button label="다시 시도" variant="secondary" onPress={() => void loadFirstPage()} />
          </Card>
        ) : loading ? (
          <>
            <View style={s.skeleton} />
            <View style={s.skeleton} />
            <View style={s.skeleton} />
          </>
        ) : items.length === 0 ? (
          <Card style={s.stateCard}>
            <Icon name="clock" size={30} color={colors.textMuted} />
            <Text style={s.emptyTitle}>분석 이력이 없어요</Text>
            <Text style={s.stateText}>홈에서 상품을 등록하면 여기에 쌓입니다</Text>
          </Card>
        ) : (
          <>
            {items.map((item) => (
              <HistoryCard
                key={item.product_id}
                item={item}
                onPress={() => navigation.navigate('Detail', { productId: item.product_id })}
              />
            ))}
            {hasMore ? (
              <Button
                label={`더 보기 (${items.length}/${total})`}
                variant="secondary"
                loading={loadingMore}
                onPress={() => void loadMore()}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HistoryCard({ item, onPress }: { item: ProductSummaryCard; onPress: () => void }) {
  const state = productStatusOf(item.status);

  return (
    <Card onPress={onPress}>
      <View style={s.itemTop}>
        <Text style={s.itemName} numberOfLines={1}>
          {item.product_name}
        </Text>
        <Chip label={state.label} tone={state.tone} />
      </View>

      <View style={s.itemRow}>
        <Text style={s.itemDate}>{formatDate(item.created_at)}</Text>
        {item.destination_country ? (
          <Text style={s.itemCountry}>· {item.destination_country}</Text>
        ) : null}
      </View>

      <View style={s.itemBottom}>
        {item.hs_code ? (
          <Text style={s.itemHs}>{item.hs_code}</Text>
        ) : (
          <Text style={s.itemHsMissing}>HS Code 미판정</Text>
        )}
        <StatusBadge status={item.hs_status} size="sm" />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  headerCount: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },

  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.md },

  skeleton: {
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  stateCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  stateText: { fontSize: 13, color: colors.textSub, textAlign: 'center', lineHeight: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemName: { flex: 1, fontSize: 15.5, fontWeight: '700', color: colors.text },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  itemDate: { fontSize: 12.5, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  itemCountry: { fontSize: 12.5, color: colors.textMuted },

  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemHs: { fontSize: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  itemHsMissing: { fontSize: 13.5, fontWeight: '600', color: colors.textMuted },
});
