import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '../api/client';
import type { Ingredient } from '../api/types';
import { SegmentedField, TextField } from '../components/Field';
import { Icon } from '../components/Icon';
import { StepBar } from '../components/StepBar';
import { AppHeader, Banner, Body, Button, Card, Footer, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STORAGE_OPTIONS = ['상온', '냉장', '냉동'] as const;

/** 기능명세서 3.3 — 표시사항 인식 실패 시의 직접 입력 경로. */
export default function IngredientManualScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, patch } = useFlow();

  const [rows, setRows] = useState<Ingredient[]>([
    { name: '', ratio: null },
    { name: '', ratio: null },
  ]);
  const [foodType, setFoodType] = useState('');
  const [storage, setStorage] = useState<(typeof STORAGE_OPTIONS)[number]>('냉동');
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const filled = useMemo(() => rows.filter((r) => r.name.trim().length > 0), [rows]);
  const sum = useMemo(() => filled.reduce((acc, r) => acc + (r.ratio ?? 0), 0), [filled]);
  const sumOk = Math.abs(sum - 100) < 0.51;
  const canSave = filled.length > 0 && foodType.trim().length > 0 && sumOk;

  function update(index: number, next: Partial<Ingredient>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...next } : row)));
  }

  async function handleSave() {
    if (!canSave || !productId) return;
    setBusy(true);
    setApiError(null);
    try {
      const { hscode_result } = await api.manualHsCode(productId, {
        ingredients: filled.map((r) => ({ name: r.name.trim(), ratio: r.ratio })),
        food_type: foodType.trim(),
        storage_method: storage,
      });
      patch({ hs: hscode_result });
      navigation.replace('HsCodeResult');
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="원재료 직접 입력" onBack={() => navigation.goBack()} />
      <StepBar current={3} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Body>
          <Banner
            tone="warn"
            title="표시사항을 읽지 못했어요"
            message="원재료명과 함량을 직접 입력해주세요. 직접 입력한 내용은 자동 판정하지 않고 '검토 필요'로 저장됩니다."
          />

          {apiError ? <Banner tone="danger" title="저장 실패" message={apiError} icon="alert-circle" /> : null}

          <View style={s.head}>
            <Text style={s.sectionTitle}>원재료</Text>
            <Text style={[s.sum, !sumOk && s.sumWarn]}>합계 {sum.toFixed(0)}% / 100%</Text>
          </View>

          <Card>
            {rows.map((row, index) => (
              <View key={index} style={[s.row, index === rows.length - 1 && s.lastRow]}>
                <TextInput
                  style={[s.input, s.nameInput]}
                  value={row.name}
                  onChangeText={(v) => update(index, { name: v })}
                  placeholder={index === 0 ? '예: 쇠고기' : '원재료명'}
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={[s.input, s.ratioInput]}
                  value={row.ratio != null ? String(row.ratio) : ''}
                  onChangeText={(v) => {
                    const cleaned = v.replace(/[^0-9.]/g, '');
                    const parsed = Number(cleaned);
                    update(index, { ratio: cleaned === '' || !Number.isFinite(parsed) ? null : parsed });
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <Text style={s.percent}>%</Text>
                <Pressable
                  onPress={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  hitSlop={8}
                  disabled={rows.length <= 1}
                >
                  <Icon name="x" size={17} color={rows.length <= 1 ? colors.border : colors.textMuted} />
                </Pressable>
              </View>
            ))}

            <Pressable onPress={() => setRows((prev) => [...prev, { name: '', ratio: null }])} style={s.addRow}>
              <Icon name="plus" size={17} color={colors.navy} />
              <Text style={s.addText}>원재료 추가</Text>
            </Pressable>
          </Card>

          {!sumOk && filled.length > 0 ? (
            <Text style={s.warnText}>함량 합계가 100%가 되어야 저장할 수 있습니다.</Text>
          ) : null}

          <Card>
            <TextField
              label="식품유형"
              value={foodType}
              onChangeText={setFoodType}
              placeholder="예: 식육가공품 (분쇄가공육제품)"
            />
            <View style={s.storageWrap}>
              <SegmentedField label="보관방법" options={STORAGE_OPTIONS} value={storage} onChange={setStorage} />
            </View>
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  sum: { fontSize: 12.5, fontWeight: '700', color: colors.successFg },
  sumWarn: { color: colors.warnFg },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  input: {
    fontSize: 14.5,
    color: colors.text,
    borderWidth: 1.2,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  nameInput: { flex: 1 },
  ratioInput: { width: 66, textAlign: 'right' },
  percent: { fontSize: 13.5, color: colors.textSub, fontWeight: '600' },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: spacing.md },
  addText: { fontSize: 13.5, color: colors.navy, fontWeight: '700' },

  warnText: { fontSize: 12.5, color: colors.warnFg, fontWeight: '600' },
  storageWrap: { marginTop: spacing.md },
});
