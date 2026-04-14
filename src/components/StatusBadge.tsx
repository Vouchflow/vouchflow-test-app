import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';

type StatusKey = keyof typeof colors.status;

interface Props {
  status: string;
  colorKey?: StatusKey;
}

const STATUS_COLOR_MAP: Record<string, StatusKey> = {
  verified: 'verified',
  ACTIVE: 'verified',
  enrolled: 'enrolled',
  pending: 'pending',
  PENDING: 'pending',
  failed: 'failed',
  EXPIRED: 'failed',
  REVOKED: 'failed',
  unenrolled: 'unenrolled',
  UNENROLLED: 'unenrolled',
};

export function StatusBadge({ status, colorKey }: Props) {
  const key = colorKey ?? STATUS_COLOR_MAP[status] ?? 'unenrolled';
  const color = colors.status[key];

  return (
    <View style={[styles.pill, { borderColor: color + '44', backgroundColor: color + '18' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontFamily: typography.mono.fontFamily,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '600',
  },
});
