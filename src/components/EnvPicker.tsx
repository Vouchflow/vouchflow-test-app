import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { EnvName } from '../sdk/types';

interface Props {
  current: EnvName;
  onChange: (env: EnvName) => void;
}

const ENVS: { key: EnvName; label: string }[] = [
  { key: 'local', label: 'LOCAL' },
  { key: 'staging', label: 'STAGING' },
  { key: 'production', label: 'PROD' },
];

export function EnvPicker({ current, onChange }: Props) {
  return (
    <View style={styles.container}>
      {ENVS.map((env, idx) => {
        const isActive = env.key === current;
        return (
          <TouchableOpacity
            key={env.key}
            onPress={() => onChange(env.key)}
            activeOpacity={0.8}
            style={[
              styles.segment,
              isActive ? styles.segmentActive : null,
              idx === 0 ? styles.segmentFirst : null,
              idx === ENVS.length - 1 ? styles.segmentLast : null,
            ]}>
            <Text style={[styles.label, isActive ? styles.labelActive : null]}>
              {env.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.bg.border,
  },
  segmentFirst: {},
  segmentLast: {
    borderRightWidth: 0,
  },
  segmentActive: {
    backgroundColor: colors.brand.primary,
  },
  label: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  labelActive: {
    color: colors.bg.base,
    fontWeight: '700',
  },
});
