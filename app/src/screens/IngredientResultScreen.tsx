import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '../api/client';
import type { Ingredient } from '../api/types';
import { SegmentedField } from '../components/Field';
import { Icon } from '../components/Icon';
import { StepBar } from '../components/StepBar';
import { AppHeader, Banner, Body, Button, Card, Footer, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STORAGE_OPTIONS = ['상온', '냉장', '냉동'] as const;

export default function IngredientResultScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, productName, hs, patch } = useFlow();

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>(hs?.ingredients ?? []);
  const [foodType, setFoodType] = useState(hs?.food_type ?? '');
  const [storage, setStorage] = useState<string>(hs?.storage_method ?? '상온');

  const ratioSum = useMemo(
    () => ingredients.reduce((acc, item) => acc + (item.ratio ?? 0), 0),
    [ingredients],
  );
  const missingRatio = ingredients.some((item) => item.ratio == null);

  if (!hs) {
    return (
      <Screen>
        <AppHeader title="표시사항 확인" onBack={() => navigation.goBack()} />
        <Banner tone="danger" title="인식 결과가 없습니다" message="표시사항을 다시 촬영해주세요." />
      </Screen>
    );
  }

  function updateIngredient(index: number, next: Partial<Ingredient>) {
    setIngredients((prev) => prev.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', ratio: null }]);
  }

  async function saveEdits() {
    if (!productId) return;
    setBusy(true);
    setApiError(null);
    try {
      const cleaned = ingredients
        .filter((item) => item.name.trim().length > 0)
        .map((item) => ({ name: item.name.trim(), ratio: item.ratio }));
      const { hscode_result } = await api.reviseHsCode(productId, {
        ingredients: cleaned,
        food_type: foodType.trim() || hs!.food_type,
        storage_method: storage,
      });
      patch({ hs: hscode_result });
      setIngredients(hscode_result.ingredients);
      setFoodType(hscode_result.food_type);
      setStorage(hscode_result.storage_method);
      setEditing(false);
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : '수정 내용을 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title="표시사항 확인"
        onBack={() => navigation.goBack()}
        right={
          !editing ? (
            <Pressable onPress={() => setEditing(true)} hitSlop={10}>
              <Icon name="edit" size={20} color={colors.navy} />
            </Pressable>
          ) : null
        }
      />
      <StepBar current={3} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Body>
          {apiError ? <Banner tone="danger" title="저장 실패" message={apiError} icon="alert-circle" /> : null}

          {missingRatio ? (
            <Banner
              tone="warn"
              title="원재료 함량을 읽지 못했어요"
              message="함량 없이도 코드는 산출되지만 판정이 '사전심사 권장'으로 내려갑니다. 직접 입력하면 정확해집니다."
            />
          ) : null}

          <Text style={s.lead}>
            {editing ? '잘못 읽힌 항목을 고쳐주세요' : '자동으로 읽은 내용입니다. 틀린 곳이 있으면 수정하세요.'}
          </Text>

          <Card>
            <Row label="제품명" value={hs.label ?? productName} />

            {editing ? (
              <View style={s.editRow}>
                <Text style={s.rowLabel}>식품유형</Text>
                <TextInput
                  style={s.inlineInput}
                  value={foodType}
                  onChangeText={setFoodType}
                  placeholder="예: 식육가공품"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            ) : (
              <Row label="식품유형" value={foodType} />
            )}

            {editing ? (
              <View style={s.storageEdit}>
                <SegmentedField
                  label="보관방법"
                  options={STORAGE_OPTIONS}
                  value={(STORAGE_OPTIONS.includes(storage as (typeof STORAGE_OPTIONS)[number])
                    ? storage
                    : '상온') as (typeof STORAGE_OPTIONS)[number]}
                  onChange={setStorage}
                />
              </View>
            ) : (
              <Row label="보관방법" value={storage} last />
            )}
          </Card>

          <View style={s.ingredientHead}>
            <Text style={s.sectionTitle}>원재료</Text>
            <Text style={[s.sum, Math.round(ratioSum) !== 100 && s.sumWarn]}>
              합계 {ratioSum.toFixed(0)}%
            </Text>
          </View>

          <Card>
            {ingredients.map((item, index) => (
              <View key={`${index}`} style={[s.ingredientRow, index === ingredients.length - 1 && s.lastRow]}>
                {editing ? (
                  <>
                    <TextInput
                      style={[s.inlineInput, s.nameInput]}
                      value={item.name}
                      onChangeText={(v) => updateIngredient(index, { name: v })}
                      placeholder="원재료명"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[s.inlineInput, s.ratioInput]}
                      value={item.ratio != null ? String(item.ratio) : ''}
                      onChangeText={(v) => {
                        const cleaned = v.replace(/[^0-9.]/g, '');
                        const parsed = Number(cleaned);
                        updateIngredient(index, {
                          ratio: cleaned === '' || !Number.isFinite(parsed) ? null : parsed,
                        });
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                    <Text style={s.percent}>%</Text>
                    <Pressable onPress={() => removeIngredient(index)} hitSlop={8}>
                      <Icon name="x" size={17} color={colors.textMuted} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={s.ingredientName}>{item.name}</Text>
                    <Text style={[s.ingredientRatio, item.ratio == null && s.ingredientRatioMissing]}>
                      {item.ratio != null ? `${item.ratio}%` : '함량 미상'}
                    </Text>
                  </>
                )}
              </View>
            ))}

            {editing ? (
              <Pressable onPress={addIngredient} style={s.addRow}>
                <Icon name="plus" size={17} color={colors.navy} />
                <Text style={s.addText}>원재료 추가</Text>
              </Pressable>
            ) : null}
          </Card>
        </Body>

        <Footer>
          {editing ? (
            <>
              <Button
                label="취소"
                variant="secondary"
                onPress={() => {
                  setIngredients(hs.ingredients);
                  setFoodType(hs.food_type);
                  setStorage(hs.storage_method);
                  setEditing(false);
                }}
              />
              <Button label="수정 내용 저장" onPress={saveEdits} loading={busy} />
            </>
          ) : (
            <>
              <Button label="수정" variant="secondary" icon="edit" onPress={() => setEditing(true)} />
              <Button label="확인 : HS Code 판정" onPress={() => navigation.navigate('HsCodeResult')} />
            </>
          )}
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, last && s.lastRow]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  lead: { fontSize: 14, color: colors.textSub, lineHeight: 20 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { width: 72, fontSize: 13, color: colors.textSub },
  rowValue: { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.text },

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  storageEdit: { paddingTop: spacing.md },

  inlineInput: {
    flex: 1,
    fontSize: 14.5,
    color: colors.text,
    borderWidth: 1.2,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },

  ingredientHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  sum: { fontSize: 12.5, fontWeight: '700', color: colors.successFg },
  sumWarn: { color: colors.warnFg },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientName: { flex: 1, fontSize: 14.5, color: colors.text, fontWeight: '500' },
  ingredientRatio: { fontSize: 14.5, fontWeight: '700', color: colors.navy, fontVariant: ['tabular-nums'] },
  ingredientRatioMissing: { color: colors.warnFg, fontSize: 12.5, fontWeight: '600' },

  nameInput: { flex: 1 },
  ratioInput: { flex: 0, width: 62, textAlign: 'right' },
  percent: { fontSize: 13.5, color: colors.textSub, fontWeight: '600' },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: spacing.md },
  addText: { fontSize: 13.5, color: colors.navy, fontWeight: '700' },
});
