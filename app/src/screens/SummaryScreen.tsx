import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import { Icon } from '../components/Icon';
import { StepBar } from '../components/StepBar';
import { AppHeader, Banner, Body, Button, Card, Footer, Screen, StatusBadge } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SummaryScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, productName, destinationCountry, hs, cbm } = useFlow();

  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function applyLogistics() {
    if (!productId) return;
    setBusy(true);
    setApiError(null);
    try {
      await api.applyLogistics(productId);
      navigation.navigate('Pickup');
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : '공동물류 신청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="등록 내용 확인" onBack={() => navigation.goBack()} />
      <StepBar current={5} />

      <Body>
        {apiError ? <Banner tone="danger" title="신청 실패" message={apiError} icon="alert-circle" /> : null}

        <Card style={s.productCard}>
          <Text style={s.productName}>{productName}</Text>
          <View style={s.productMeta}>
            <Icon name="globe" size={15} color={colors.onNavySub} />
            <Text style={s.productMetaText}>수출 희망국 {destinationCountry ?? '-'}</Text>
          </View>
        </Card>

        {/* HS Code */}
        <Card padded={false}>
          <SectionHead
            icon="file-text"
            title="HS Code"
            onEdit={() => navigation.navigate('LabelCapture')}
          />
          <View style={s.cardBody}>
            {hs?.hs_code_formatted ? (
              <View style={s.hsRow}>
                <Text style={s.hsCode}>{hs.hs_code_formatted}</Text>
                <StatusBadge status={hs.status} />
              </View>
            ) : (
              <View style={s.hsRow}>
                <Text style={s.hsMissing}>판정된 코드 없음</Text>
                <StatusBadge status={hs?.status} />
              </View>
            )}
            {hs?.reasoning ? <Text style={s.reason}>{hs.reasoning}</Text> : null}
            <Row label="식품유형" value={hs?.food_type ?? '-'} />
            <Row label="보관" value={hs?.storage_method ?? '-'} last />
          </View>
        </Card>

        {/* 체적 */}
        <Card padded={false}>
          <SectionHead icon="package" title="체적 · 무게" onEdit={() => navigation.navigate('BoxCapture')} />
          <View style={s.cardBody}>
            {cbm ? (
              <>
                <View style={s.cbmRow}>
                  <Text style={s.cbmValue}>{cbm.cbm.toFixed(3)}</Text>
                  <Text style={s.cbmUnit}>CBM</Text>
                  {cbm.input_method === 'manual' ? <Text style={s.manualTag}>직접 입력</Text> : null}
                </View>
                <Row
                  label="치수"
                  value={`${cbm.width_mm} × ${cbm.depth_mm} × ${cbm.height_mm} mm`}
                />
                <Row label="무게" value={cbm.weight_kg != null ? `${cbm.weight_kg} kg` : '-'} last />
              </>
            ) : (
              <Text style={s.hsMissing}>측정 결과 없음</Text>
            )}
          </View>
        </Card>

        <Card style={s.originCard}>
          <Row label="출발" value="담양" />
          <Row label="집하 방식" value="권역 공동물류" last />
        </Card>

        <Text style={s.note}>
          공동물류를 신청하면 같은 권역의 화물과 묶여 컨테이너에 실립니다. 개별 발송보다 물류비가 내려갑니다.
        </Text>
      </Body>

      <Footer>
        <Button label="공동물류 신청" onPress={applyLogistics} loading={busy} icon="truck" />
      </Footer>
    </Screen>
  );
}

function SectionHead({
  icon,
  title,
  onEdit,
}: {
  icon: 'file-text' | 'package';
  title: string;
  onEdit: () => void;
}) {
  return (
    <View style={s.sectionHead}>
      <Icon name={icon} size={18} color={colors.textSub} />
      <Text style={s.sectionTitle}>{title}</Text>
      <Pressable onPress={onEdit} hitSlop={8} style={s.editBtn}>
        <Text style={s.editText}>수정하러 가기</Text>
        <Icon name="chevron-right" size={15} color={colors.navy} />
      </Pressable>
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
  productCard: { backgroundColor: colors.navy, borderColor: colors.navy, gap: 7 },
  productName: { fontSize: 20, fontWeight: '700', color: colors.onNavy, lineHeight: 28 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productMetaText: { fontSize: 13, color: colors.onNavySub },

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
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editText: { fontSize: 12.5, color: colors.navy, fontWeight: '700' },

  cardBody: { padding: spacing.lg, gap: 2 },

  hsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  hsCode: { fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  hsMissing: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  reason: { fontSize: 12.5, color: colors.textSub, lineHeight: 19, marginBottom: spacing.sm },

  cbmRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: spacing.sm },
  cbmValue: { fontSize: 28, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'] },
  cbmUnit: { fontSize: 14, fontWeight: '700', color: colors.textSub },
  manualTag: {
    marginLeft: 'auto',
    fontSize: 11,
    color: colors.warnFg,
    backgroundColor: colors.warnBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
    fontWeight: '700',
  },

  originCard: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, color: colors.textSub },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  note: { fontSize: 12.5, color: colors.textMuted, lineHeight: 19 },
});
