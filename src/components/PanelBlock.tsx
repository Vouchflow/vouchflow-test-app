import React, { useState, useRef } from 'react';
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  title: string;
  index: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function PanelBlock({ title, index, children, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }

  const indexStr = String(index).padStart(2, '0') + '.';

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggle} style={styles.header} activeOpacity={0.8}>
        <Text style={styles.index}>{indexStr}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.body}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.brand.primary,
    borderWidth: 1,
    borderColor: colors.bg.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  index: {
    ...typography.monoSmall,
    color: colors.brand.primary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  title: {
    ...typography.sectionTitle,
    flex: 1,
    fontSize: 12,
    color: colors.text.secondary,
    letterSpacing: 1.2,
  },
  chevron: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    fontSize: 9,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
});
