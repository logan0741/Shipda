import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import { FieldGroup, TextField } from '../components/Field';
import { StepBar } from '../components/StepBar';
import { AppHeader, Banner, Body, Button, Card, Footer, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'CbmManual'>;

export default function CbmManualScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { productId, patch } = useFlow();

  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const numbers = useMemo(() => {
    const parse = (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    return {
      width: parse(width),
      depth: parse(depth),
      height: parse(height),
      weight: parse(weight),
    };
  }, [width, depth, height, weight]);

  const cbm =
    numbers.width && numbers.depth && numbers.height
      ? (numbers.width * numbers.depth * numbers.height) / 1_000_000_000
      : null;

  const canSave = !!(numbers.width && numbers.depth && numbers.height && numbers.weight);

  async function handleSave() {
    if (!canSave || !productId) return;
    setApiError(null);
    setBusy(true);
    try {
      const { cbm_result } = await api.manualCbm(productId, {
        width_mm: numbers.width!,
        depth_mm: numbers.depth!,
        height_mm: numbers.height!,
        weight_kg: numbers.weight!,
      });
      patch({ cbm: cbm_result, dimensions: { width_mm: numbers.width!, depth_mm: numbers.depth!, height_mm: numbers.height! } });
      navigation.navigate('LabelCapture');
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="치수 직접 입력" onBack={() => navigation.goBack()} />
      <StepBar current={2} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Body>
          {route.params?.reason ? (
            <Banner tone="warn" title="사진으로 측정하지 못했어요" message={route.params.reason} />
          ) : (
            <Banner
              tone="info"
              title="줄자로 잰 값을 입력해주세요"
              message="입력한 치수로 체적(CBM)이 자동 계산됩니다."
              icon="info"
            />
          )}

          {apiError ? <Banner tone="danger" title="저장 실패" message={apiError} icon="alert-circle" /> : null}

          <Card>
            <FieldGroup>
              <TextField
                label="가로"
                value={width}
                onChangeText={(v) => setWidth(v.replace(/[^0-9.]/g, ''))}
                placeholder="600"
                keyboardType="number-pad"
                suffix="mm"
              />
              <TextField
                label="세로"
                value={depth}
                onChangeText={(v) => setDepth(v.replace(/[^0-9.]/g, ''))}
                placeholder="450"
                keyboardType="number-pad"
                suffix="mm"
              />
              <TextField
                label="높이"
                value={height}
                onChangeText={(v) => setHeight(v.replace(/[^0-9.]/g, ''))}
                placeholder="400"
                keyboardType="number-pad"
                suffix="mm"
              />
              <TextField
                label="무게"
                value={weight}
                onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ''))}
                placeholder="11.4"
                keyboardType="decimal-pad"
                suffix="kg"
              />
            </FieldGroup>
          </Card>

          <Card style={s.cbmCard}>
            <Text style={s.cbmLabel}>계산된 체적</Text>
            <Text style={s.cbmValue}>
              {cbm != null ? cbm.toFixed(3) : '—'}
              <Text style={s.cbmUnit}> CBM</Text>
            </Text>
          </Card>
        </Body>

        <Footer>
          <Button label="저장하고 계속" onPress={handleSave} disabled={!canSave} loading={busy} />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  cbmCard: {
    backgroundColor: colors.navySoft,
    borderColor: '#D3DFEE',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
  },
  cbmLabel: { fontSize: 14, fontWeight: '600', color: colors.navy },
  cbmValue: { fontSize: 28, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'] },
  cbmUnit: { fontSize: 14, fontWeight: '700' },
});
