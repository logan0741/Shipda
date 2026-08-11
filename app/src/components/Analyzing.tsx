import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, radius, spacing } from '../theme';

const SIZE = 96;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * "AI가 분석하고 있어요" 로딩 화면.
 * steps에 넘긴 문구가 stepInterval 간격으로 순차 전환된다. (기능명세서 3.3)
 */
export function Analyzing({
  title = 'AI가 분석하고 있어요',
  subtitle = '잠시만 기다려주세요',
  steps,
  stepInterval = 900,
}: {
  title?: string;
  subtitle?: string;
  steps: string[];
  stepInterval?: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  useEffect(() => {
    if (steps.length <= 1) return;
    const timer = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, stepInterval);
    return () => clearInterval(timer);
  }, [steps.length, stepInterval]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.wrap}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.border}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.navy}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * 0.28} ${CIRCUMFERENCE}`}
          />
        </Svg>
      </Animated.View>

      <View style={s.textBlock}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>

      <View style={s.dots}>
        {steps.map((_, index) => (
          <View key={index} style={[s.dot, index <= stepIndex && s.dotActive]} />
        ))}
      </View>

      <View style={s.stepList}>
        {steps.map((step, index) => (
          <Text key={step} style={[s.step, index <= stepIndex && s.stepActive]}>
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, backgroundColor: colors.surface },
  textBlock: { alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textSub },

  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.navy },

  stepList: { alignItems: 'center', gap: 6, marginTop: spacing.sm },
  step: { fontSize: 13, color: colors.textMuted },
  stepActive: { color: colors.text, fontWeight: '600' },
});
