import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import type { MarkerPayload } from '../api/types';
import { Icon } from '../components/Icon';
import { StepBar } from '../components/StepBar';
import { WaybillPreview, waybillHtml } from '../components/MarkerView';
import { AppHeader, Body, Button, Card, ErrorState, Footer, Loading, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WaybillScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, marker, patch } = useFlow();

  const [loading, setLoading] = useState(!marker);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const payload: MarkerPayload = await api.marker(productId);
      patch({ marker: payload });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '운송장을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [productId, patch]);

  useEffect(() => {
    if (!marker) void load();
  }, [marker, load]);

  async function handlePrint() {
    if (!marker) return;
    setPrinting(true);
    try {
      await Print.printAsync({ html: waybillHtml(marker) });
    } catch {
      // 사용자가 인쇄 대화상자를 닫은 경우도 여기로 온다
      Alert.alert(
        '인쇄를 시작하지 못했어요',
        '연결된 프린터가 없다면 PDF로 저장한 뒤 출력해도 됩니다.',
      );
    } finally {
      setPrinting(false);
    }
  }

  if (loading) return <LoadingShell onBack={() => navigation.goBack()} />;
  if (error || !marker) {
    return (
      <Screen>
        <AppHeader title="운송장 준비" onBack={() => navigation.goBack()} />
        <ErrorState message={error ?? '운송장을 불러오지 못했습니다.'} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="운송장 준비" onBack={() => navigation.goBack()} />
      <StepBar current={1} />

      <Body>
        <Text style={s.title}>운송장을 출력해 박스 윗면에 붙여주세요</Text>

        <WaybillPreview marker={marker} />

        <Card style={s.why}>
          <View style={s.whyHead}>
            <Icon name="info" size={19} color={colors.navy} />
            <Text style={s.whyTitle}>왜 운송장을 붙이나요?</Text>
          </View>
          <Text style={s.whyText}>
            사진만으로는 물체의 실제 크기를 알 수 없습니다. 크기를 아는 물체가 함께 찍혀야 기준이 생깁니다.
            운송장에 인쇄된 마커가 {marker.marker_size_mm}mm 기준자 역할을 합니다.
          </Text>
          <Text style={s.whyText}>운송장은 어차피 붙이는 것이라, 따로 준비할 것이 없습니다.</Text>
        </Card>

        <View style={s.steps}>
          <Step index={1} text="운송장을 실제 크기(100%)로 출력합니다" />
          <Step index={2} text="박스 윗면 평평한 곳에 붙입니다" />
          <Step index={3} text="마커가 접히거나 가려지지 않게 합니다" />
        </View>
      </Body>

      <Footer>
        <Button label="운송장 출력하기" variant="secondary" icon="printer" onPress={handlePrint} loading={printing} />
        <Button label="다음 : 박스 촬영" onPress={() => navigation.navigate('BoxCapture')} />
      </Footer>
    </Screen>
  );
}

function Step({ index, text }: { index: number; text: string }) {
  return (
    <View style={s.step}>
      <View style={s.stepBadge}>
        <Text style={s.stepBadgeText}>{index}</Text>
      </View>
      <Text style={s.stepText}>{text}</Text>
    </View>
  );
}

function LoadingShell({ onBack }: { onBack: () => void }) {
  return (
    <Screen>
      <AppHeader title="운송장 준비" onBack={onBack} />
      <Loading label="운송장을 만들고 있어요" />
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 19, fontWeight: '700', color: colors.text, lineHeight: 27 },

  why: { gap: spacing.sm, backgroundColor: colors.navySoft, borderColor: '#D3DFEE' },
  whyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  whyTitle: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  whyText: { fontSize: 13, color: colors.navy, lineHeight: 20, opacity: 0.9 },

  steps: { gap: spacing.sm, marginTop: spacing.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: colors.onNavy, fontSize: 11.5, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13.5, color: colors.textSub, lineHeight: 20 },
});
