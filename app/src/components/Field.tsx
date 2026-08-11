import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '../theme';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  suffix,
  autoFocus,
  editable = true,
  maxLength,
  style,
  hint,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
  autoFocus?: boolean;
  editable?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  hint?: string;
}) {
  return (
    <View style={[s.wrap, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.inputRow, !!error && s.inputRowError, !editable && s.inputRowDisabled]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          editable={editable}
          maxLength={maxLength}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/** 상온/냉장/냉동 같은 소수 선택지에 쓰는 세그먼트 컨트롤. */
export function SegmentedField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.segment}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[s.segmentItem, active && s.segmentItemActive]}
            >
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <View style={s.group}>{children}</View>;
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  group: { gap: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.3,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  inputRowError: { borderColor: colors.dangerAccent },
  inputRowDisabled: { backgroundColor: colors.surfaceAlt },
  input: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  suffix: { fontSize: 13.5, color: colors.textMuted, marginLeft: spacing.sm, fontWeight: '600' },
  error: { fontSize: 12, color: colors.dangerFg },
  hint: { fontSize: 12, color: colors.textMuted },

  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  segmentItemActive: { backgroundColor: colors.navy },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textSub },
  segmentTextActive: { color: colors.onNavy },
});
