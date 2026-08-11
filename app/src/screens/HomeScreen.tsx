import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../api/client';
import type { ProductSummaryCard } from '../api/types';
import { Icon } from '../components/Icon';
import { Button, Card, Chip } from '../components/ui';
import { formatDate, productStatusOf } from '../format';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RECENT_LIMIT = 5;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { reset } = useFlow();

  const [items, setItems] = useState<ProductSummaryCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.recent(RECENT_LIMIT);
      setItems(res.items);
      setTotal(res.total_count);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '최근 등록 상품을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 등록을 마치고 돌아오면 목록이 갱신돼야 하므로 포커스마다 다시 읽는다
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // 상단이 네이비라 이 화면에서만 상태바 글자를 밝게 쓴다
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  function startFlow() {
    reset();
    navigation.navigate('ProductInfo');
  }

  return (
    <View style={s.root}>
      <View style={[s.hero, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={s.brand}>쉽다</Text>
        <Text style={s.brandSub}>수출을 쉽고 빠르게</Text>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={s.startCard}>
          <Text style={s.startTitle}>상품 분석 시작하기</Text>
          <Text style={s.startSub}>사진 한 장이면 끝</Text>
          <Button label="시작하기" icon="camera" onPress={startFlow} style={s.startBtn} />
        </Card>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>최근 등록 상품</Text>
          {total > items.length ? (
            <Pressable
              onPress={() => navigation.navigate('Tabs', { screen: 'HistoryTab' })}
              hitSlop={8}
              style={s.moreBtn}
            >
              <Text style={s.moreText}>전체 보기</Text>
              <Icon name="chevron-right" size={14} color={colors.navy} />
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Card style={s.stateCard}>
            <Icon name="alert-circle" size={26} color={colors.dangerAccent} />
            <Text style={s.stateText}>{error}</Text>
            <Button label="다시 시도" variant="secondary" onPress={() => void load()} />
          </Card>
        ) : loading ? (
          <>
            <View style={s.skeleton} />
            <View style={s.skeleton} />
          </>
        ) : items.length === 0 ? (
          <Card style={s.stateCard}>
            <Icon name="package" size={30} color={colors.textMuted} />
            <Text style={s.emptyTitle}>아직 등록한 상품이 없어요</Text>
            <Text style={s.stateText}>위 [시작하기]로 첫 화물을 등록해보세요</Text>
          </Card>
        ) : (
          items.map((item) => (
            <RecentCard
              key={item.product_id}
              item={item}
              onPress={() => navigation.navigate('Detail', { productId: item.product_id })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function RecentCard({ item, onPress }: { item: ProductSummaryCard; onPress: () => void }) {
  const state = productStatusOf(item.status);
  const meta: string[] = [formatDate(item.created_at)];
  if (item.hs_code) meta.push(item.hs_code);
  if (item.cbm != null) meta.push(`${item.cbm.toFixed(3)} CBM`);

  return (
    <Card onPress={onPress}>
      <View style={s.itemTop}>
        <Text style={s.itemName} numberOfLines={1}>
          {item.product_name}
        </Text>
        <Chip label={state.label} tone={state.tone} />
      </View>
      <Text style={s.itemMeta} numberOfLines={1}>
        {meta.join('  ·  ')}
      </Text>
    </Card>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: 4,
  },
  brand: { fontSize: 26, fontWeight: '800', color: colors.onNavy },
  brandSub: { fontSize: 13, color: colors.onNavySub },

  // 히어로 위로 카드를 걸치게 한다. 음수 마진은 ScrollView 자체에 줘야
  // 콘텐츠가 스크롤 영역 밖으로 잘리지 않는다.
  body: { flex: 1, marginTop: -spacing.xxl },
  bodyContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  startCard: { alignItems: 'center', gap: 4, paddingVertical: spacing.xl },
  startTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  startSub: { fontSize: 13, color: colors.textSub },
  startBtn: { alignSelf: 'stretch', marginTop: spacing.md },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 13.5, fontWeight: '700', color: colors.textSub },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText: { fontSize: 12.5, fontWeight: '700', color: colors.navy },

  skeleton: {
    height: 74,
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
    marginBottom: 6,
  },
  itemName: { flex: 1, fontSize: 15.5, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 12.5, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
