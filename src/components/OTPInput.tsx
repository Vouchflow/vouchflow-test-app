import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';

const OTP_LENGTH = 6;

interface Props {
  onComplete: (code: string) => void;
}

export function OTPInput({ onComplete }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focused, setFocused] = useState<number>(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  function handleChange(text: string, index: number) {
    // Strip non-digits
    const digit = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      const next = index + 1;
      setFocused(next);
      inputs.current[next]?.focus();
    }

    // Auto-submit when all digits are filled
    if (digit && newDigits.every(d => d !== '')) {
      onComplete(newDigits.join(''));
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        const prev = index - 1;
        const newDigits = [...digits];
        newDigits[prev] = '';
        setDigits(newDigits);
        setFocused(prev);
        inputs.current[prev]?.focus();
      }
    }
  }

  function handleClear() {
    setDigits(Array(OTP_LENGTH).fill(''));
    setFocused(0);
    inputs.current[0]?.focus();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ENTER OTP CODE</Text>
      <View style={styles.boxes}>
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <TextInput
            key={i}
            ref={el => { inputs.current[i] = el; }}
            style={[
              styles.box,
              focused === i ? styles.boxFocused : null,
              digits[i] ? styles.boxFilled : null,
            ]}
            value={digits[i]}
            onChangeText={text => handleChange(text, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            onFocus={() => setFocused(i)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            caretHidden
          />
        ))}
      </View>
      <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
        <Text style={styles.clearText}>CLEAR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.sectionTitle,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  boxes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  box: {
    width: 40,
    height: 48,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    textAlign: 'center',
    ...typography.mono,
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '700',
  },
  boxFocused: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.dim,
  },
  boxFilled: {
    borderColor: colors.brand.primary + '66',
  },
  clearBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  clearText: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
  },
});
