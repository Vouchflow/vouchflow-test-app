import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { LogEntry } from './LogEntry';
import type { LogEntry as LogEntryType } from '../sdk/types';

interface Props {
  entries: LogEntryType[];
  onClear: () => void;
  onCopyAll: () => void;
}

const LOG_HEIGHT = Math.floor(Dimensions.get('window').height * 0.4);

export function LiveLog({ entries, onClear, onCopyAll }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (entries.length > 0) {
      // Use a slight timeout to allow layout to complete before scrolling
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [entries.length]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>LIVE LOG</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{entries.length}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onClear} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>CLEAR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCopyAll} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>COPY ALL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Log entries */}
      <ScrollView
        ref={scrollRef}
        style={styles.logArea}
        contentContainerStyle={styles.logContent}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ right: 1 }}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No log entries yet. Trigger an SDK call above.</Text>
          </View>
        ) : (
          entries.map(entry => (
            <LogEntry key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: LOG_HEIGHT,
    backgroundColor: colors.bg.surface,
    borderTopWidth: 2,
    borderTopColor: colors.brand.primary,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
    backgroundColor: colors.bg.raised,
    gap: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 10,
    color: colors.brand.primary,
    letterSpacing: 1.5,
  },
  countBadge: {
    backgroundColor: colors.brand.dim,
    borderWidth: 1,
    borderColor: colors.brand.glow,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countText: {
    ...typography.monoSmall,
    color: colors.brand.primary,
    fontSize: 9,
  },
  headerActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  headerBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.sm,
  },
  headerBtnText: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
  },
  logArea: {
    flex: 1,
  },
  logContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
