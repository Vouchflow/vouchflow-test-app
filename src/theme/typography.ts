import { Platform } from 'react-native';
import { colors } from './colors';

const monoFont = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const sansFont = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export const typography = {
  display: { fontFamily: sansFont, fontSize: 20, color: colors.text.primary, letterSpacing: -0.3, fontWeight: '700' as const },
  sectionTitle: { fontFamily: sansFont, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: colors.text.tertiary, fontWeight: '600' as const },
  label: { fontFamily: sansFont, fontSize: 13, color: colors.text.secondary, fontWeight: '500' as const },
  mono: { fontFamily: monoFont, fontSize: 11, color: colors.text.mono, letterSpacing: 0.3 },
  monoSmall: { fontFamily: monoFont, fontSize: 10, color: colors.text.tertiary },
} as const;
