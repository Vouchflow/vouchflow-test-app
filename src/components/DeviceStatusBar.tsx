import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { DeviceInfo } from '../sdk/types';

interface Props {
  deviceInfo: DeviceInfo | null;
  isSimulator: boolean;
}

export function DeviceStatusBar({ deviceInfo, isSimulator }: Props) {
  const enrolled = deviceInfo?.enrolled ?? false;
  const deviceId = deviceInfo?.deviceId ?? 'Not enrolled';

  function handleCopyDeviceId() {
    if (deviceInfo?.deviceId) {
      Clipboard.setString(deviceInfo.deviceId);
    }
  }

  return (
    <View style={styles.container}>
      {/* Device ID */}
      <TouchableOpacity onPress={handleCopyDeviceId} style={styles.idRow} activeOpacity={0.7}>
        <Text style={styles.idLabel}>DEVICE</Text>
        <Text style={styles.idValue} numberOfLines={1}>
          {deviceId}
        </Text>
        {deviceInfo?.deviceId ? (
          <Text style={styles.copyIcon}> ⎘</Text>
        ) : null}
      </TouchableOpacity>

      {/* Right side badges */}
      <View style={styles.badges}>
        {/* Platform badge */}
        <View style={styles.platformBadge}>
          <Text style={styles.platformText}>{Platform.OS.toUpperCase()}</Text>
        </View>

        {/* Enrollment status dot */}
        <View style={[styles.statusDot, { backgroundColor: enrolled ? colors.status.enrolled : colors.status.unenrolled }]} />

        {/* Simulator warning */}
        {isSimulator ? (
          <View style={styles.simBadge}>
            <Text style={styles.simText}>SIM</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  idRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  idLabel: {
    ...typography.sectionTitle,
    fontSize: 9,
    marginRight: spacing.xs,
  },
  idValue: {
    ...typography.mono,
    flex: 1,
    color: colors.brand.primary,
  },
  copyIcon: {
    ...typography.mono,
    color: colors.text.tertiary,
    fontSize: 12,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  platformBadge: {
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  platformText: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  simBadge: {
    backgroundColor: colors.status.pending + '22',
    borderWidth: 1,
    borderColor: colors.status.pending + '44',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  simText: {
    ...typography.monoSmall,
    color: colors.status.pending,
    letterSpacing: 0.8,
  },
});
