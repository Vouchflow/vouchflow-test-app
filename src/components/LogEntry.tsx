import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { LogEntry as LogEntryType } from '../sdk/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  entry: LogEntryType;
}

function directionArrow(direction: LogEntryType['direction']): string {
  switch (direction) {
    case 'out': return '→';
    case 'in': return '←';
    case 'event': return '⚡';
  }
}

function statusColor(code?: number): string {
  if (!code) return colors.text.tertiary;
  if (code < 300) return colors.log.response;
  if (code < 400) return colors.log.warn;
  return colors.log.error;
}

function typeColor(type: LogEntryType['type']): string {
  return colors.log[type] ?? colors.log.info;
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function LogEntry({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }

  const arrow = directionArrow(entry.direction);
  const arrowColor = typeColor(entry.type);
  const hasDetail = !!(entry.request || entry.response || entry.error);

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.row}>
      {/* Direction arrow */}
      <Text style={[styles.arrow, { color: arrowColor }]}>{arrow}</Text>

      {/* Timestamp */}
      <Text style={styles.ts}>{formatTs(entry.timestamp)}</Text>

      {/* Method + endpoint */}
      <Text style={styles.method}>{entry.method}</Text>
      <Text style={styles.endpoint} numberOfLines={1}>{entry.endpoint}</Text>

      {/* Status + latency */}
      {entry.statusCode != null ? (
        <Text style={[styles.status, { color: statusColor(entry.statusCode) }]}>
          {entry.statusCode}
        </Text>
      ) : null}
      {entry.latencyMs != null ? (
        <Text style={styles.latency}>{entry.latencyMs}ms</Text>
      ) : null}

      {/* Expanded JSON */}
      {expanded && hasDetail ? (
        <View style={styles.detail}>
          {entry.error ? (
            <Text style={styles.errorText}>{entry.error}</Text>
          ) : null}
          {entry.request ? (
            <>
              <Text style={styles.detailLabel}>REQUEST</Text>
              <Text style={styles.detailJson}>
                {JSON.stringify(entry.request, null, 2)}
              </Text>
            </>
          ) : null}
          {entry.response ? (
            <>
              <Text style={styles.detailLabel}>RESPONSE</Text>
              <Text style={styles.detailJson}>
                {JSON.stringify(entry.response, null, 2)}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
    gap: 4,
  },
  arrow: {
    ...typography.monoSmall,
    fontSize: 11,
    width: 14,
    flexShrink: 0,
  },
  ts: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    flexShrink: 0,
  },
  method: {
    ...typography.monoSmall,
    color: colors.log.request,
    flexShrink: 0,
    fontWeight: '600',
  },
  endpoint: {
    ...typography.monoSmall,
    color: colors.text.secondary,
    flex: 1,
    minWidth: 80,
  },
  status: {
    ...typography.monoSmall,
    fontWeight: '700',
    flexShrink: 0,
  },
  latency: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    flexShrink: 0,
  },
  detail: {
    width: '100%',
    backgroundColor: colors.bg.base,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    gap: 4,
  },
  detailLabel: {
    ...typography.sectionTitle,
    fontSize: 9,
    marginTop: spacing.xs,
  },
  detailJson: {
    ...typography.monoSmall,
    color: colors.text.mono,
    lineHeight: 16,
  },
  errorText: {
    ...typography.monoSmall,
    color: colors.log.error,
    lineHeight: 16,
  },
});
