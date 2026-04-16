import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { DEBUG_CONFIG } from '../config/debug.config';

import { useLogger } from '../hooks/useLogger';
import { useDeviceState } from '../hooks/useDeviceState';
import { useSDKClient } from '../hooks/useSDKClient';

import { DeviceStatusBar } from '../components/DeviceStatusBar';
import { PanelBlock } from '../components/PanelBlock';
import { ActionButton } from '../components/ActionButton';
import { StatusBadge } from '../components/StatusBadge';
import { LiveLog } from '../components/LiveLog';
import { EnvPicker } from '../components/EnvPicker';
import { OTPInput } from '../components/OTPInput';

import type { Session, ReputationResult } from '../sdk/types';

export function HarnessScreen() {
  const { entries, log, clear, copyAll } = useLogger();
  const { client, env, setEnv, useMock, setUseMock, writeKey, setWriteKey, readKey, setReadKey } = useSDKClient(log);
  const { deviceInfo, refresh, setDeviceInfo } = useDeviceState();

  // Panel state
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [reputation, setReputation] = useState<ReputationResult | null>(null);
  const [graphOptedIn, setGraphOptedIn] = useState(false);
  const [tamperArmed, setTamperArmed] = useState(false);

  // Loading states
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [getDeviceLoading, setGetDeviceLoading] = useState(false);
  const [wipeLoading, setWipeLoading] = useState(false);
  const [createSessionLoading, setCreateSessionLoading] = useState(false);
  const [getSessionLoading, setGetSessionLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);
  const [reputationLoading, setReputationLoading] = useState(false);
  const [hammerLoading, setHammerLoading] = useState(false);

  // Input state
  const [userId, setUserId] = useState(DEBUG_CONFIG.defaultUserId);
  const [namespace, setNamespace] = useState(DEBUG_CONFIG.defaultNetworkNamespace);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [fallbackResult, setFallbackResult] = useState<{ otpToken: string; channel: string } | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ status: string; challengeId: string } | null>(null);
  const [hammerResults, setHammerResults] = useState<Array<{ attempt: number; statusCode: number }> | null>(null);

  // ─── Error helper ─────────────────────────────────────────────────────────
  // In real SDK mode, append the last few log entries to error alerts so
  // failures are self-contained and debuggable without checking the log panel.

  function errorAlert(title: string, e: any) {
    const base = `${e.code ? `[${e.code}] ` : ''}${e.message ?? String(e)}`;
    if (useMock || entries.length === 0) {
      Alert.alert(title, base);
      return;
    }
    const tail = entries.slice(-6).map(entry => {
      const t = new Date(entry.timestamp).toISOString().slice(11, 23);
      const status = entry.statusCode ? ` ${entry.statusCode}` : '';
      const detail = entry.error ?? (entry.response ? JSON.stringify(entry.response).slice(0, 80) : '');
      return `${t} ${entry.type.toUpperCase()}${status} ${entry.endpoint}${detail ? '\n  ' + detail : ''}`;
    }).join('\n');
    Alert.alert(title, `${base}\n\n── LOG (last 6) ──\n${tail}`);
  }

  // ─── Mock toggle ──────────────────────────────────────────────────────────

  function handleMockToggle(val: boolean) {
    setUseMock(val);
    setDeviceInfo(null);
    setActiveSession(null);
    setReputation(null);
    setGraphOptedIn(false);
    setTamperArmed(false);
    setVerifyResult(null);
    setFallbackResult(null);
    setOtpToken(null);
    setHammerResults(null);
  }

  // ─── Enrollment ──────────────────────────────────────────────────────────

  async function handleEnroll() {
    if (!client) return;
    setEnrollLoading(true);
    try {
      const info = await client.enroll();
      setDeviceInfo(info);
    } catch (e: any) {
      errorAlert('Enroll Failed', e);
    } finally {
      setEnrollLoading(false);
    }
  }

  async function handleGetDeviceInfo() {
    if (!client) return;
    setGetDeviceLoading(true);
    try {
      await refresh(client);
    } catch (e: any) {
      Alert.alert('Get Device Info Failed', e.message ?? String(e));
    } finally {
      setGetDeviceLoading(false);
    }
  }

  async function handleWipe() {
    if (!client) return;
    Alert.alert(
      'Wipe Device',
      'This will clear all device enrollment data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe',
          style: 'destructive',
          onPress: async () => {
            setWipeLoading(true);
            try {
              await client.wipeAndReset();
              setDeviceInfo(null);
              setActiveSession(null);
              setReputation(null);
              setGraphOptedIn(false);
            } catch (e: any) {
              Alert.alert('Wipe Failed', e.message ?? String(e));
            } finally {
              setWipeLoading(false);
            }
          },
        },
      ],
    );
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  async function handleCreateSession() {
    if (!client) return;
    setCreateSessionLoading(true);
    try {
      const session = await client.createSession(userId.trim() || DEBUG_CONFIG.defaultUserId);
      setActiveSession(session);
    } catch (e: any) {
      Alert.alert('Create Session Failed', e.message ?? String(e));
    } finally {
      setCreateSessionLoading(false);
    }
  }

  async function handleGetSession() {
    if (!client || !activeSession) return;
    setGetSessionLoading(true);
    try {
      const session = await client.getSession(activeSession.sessionId);
      setActiveSession(session);
    } catch (e: any) {
      Alert.alert('Get Session Failed', e.message ?? String(e));
    } finally {
      setGetSessionLoading(false);
    }
  }

  // ─── Verification ─────────────────────────────────────────────────────────

  async function handleVerify() {
    if (!client || !activeSession) return;
    setVerifyResult(null);

    if (useMock) {
      // Mock mode: simulate the biometric prompt with an alert
      Alert.alert(
        'Biometric Challenge (Mock)',
        'Simulate device biometric authentication',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              Alert.alert(
                'Biometric Cancelled',
                'User dismissed the prompt.\n\nIn production the SDK throws VouchflowError.biometricCancelled. Use Request Fallback to continue via email OTP.',
              );
            },
          },
          {
            text: 'Fail',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Biometric Failed',
                'Authentication rejected.\n\nIn production the SDK throws VouchflowError.biometricFailed. Use Request Fallback to continue via email OTP.',
              );
            },
          },
          {
            text: 'Approve',
            onPress: async () => {
              setVerifyLoading(true);
              try {
                const result = await client.verify(activeSession.sessionId);
                setVerifyResult({ status: result.status, challengeId: result.challengeId });
              } catch (e: any) {
                errorAlert('Verify Failed', e);
              } finally {
                setVerifyLoading(false);
              }
            },
          },
        ],
        { cancelable: false },
      );
    } else {
      // Real SDK: call verify directly — the SDK raises the device biometric prompt natively
      setVerifyLoading(true);
      try {
        const result = await client.verify(activeSession.sessionId);
        setVerifyResult({ status: result.status, challengeId: result.challengeId });
      } catch (e: any) {
        errorAlert('Verify Failed', e);
      } finally {
        setVerifyLoading(false);
      }
    }
  }

  async function handleRequestFallback() {
    if (!client || !activeSession) return;

    const email = fallbackEmail.trim();
    if (!email || !email.includes('@')) {
      Alert.alert('Email Required', 'Enter the email address to send the OTP to before requesting fallback.');
      return;
    }

    setFallbackLoading(true);
    setFallbackResult(null);
    try {
      const result = await client.requestFallback(activeSession.sessionId, email);
      setFallbackResult({ otpToken: result.otpToken, channel: result.channel });
      setOtpToken(result.otpToken);
    } catch (e: any) {
      errorAlert('Fallback Failed', e);
    } finally {
      setFallbackLoading(false);
    }
  }

  async function handleSubmitOTP(code: string) {
    if (!client || !otpToken) {
      Alert.alert('No OTP Token', 'Request a fallback first to get an OTP token.');
      return;
    }
    setOtpLoading(true);
    try {
      const result = await client.submitOTP(otpToken, code);
      if (result.verified) {
        Alert.alert('OTP Verified', `New session: ${result.sessionId}`);
      } else {
        Alert.alert('OTP Failed', 'Invalid code. Try a non-repeating 6-digit code.');
      }
    } catch (e: any) {
      errorAlert('OTP Submit Failed', e);
    } finally {
      setOtpLoading(false);
    }
  }

  // ─── Network Graph ────────────────────────────────────────────────────────

  async function handleOptIn() {
    if (!client) return;
    setOptInLoading(true);
    try {
      await client.optInToGraph(namespace.trim() || DEBUG_CONFIG.defaultNetworkNamespace);
      setGraphOptedIn(true);
    } catch (e: any) {
      Alert.alert('Opt-In Failed', e.message ?? String(e));
    } finally {
      setOptInLoading(false);
    }
  }

  async function handleQueryReputation() {
    if (!client) return;
    setReputationLoading(true);
    try {
      const result = await client.queryReputation(namespace.trim() || DEBUG_CONFIG.defaultNetworkNamespace);
      setReputation(result);
    } catch (e: any) {
      Alert.alert('Reputation Query Failed', e.message ?? String(e));
    } finally {
      setReputationLoading(false);
    }
  }

  // ─── Edge Cases ───────────────────────────────────────────────────────────

  function handleSimulateReinstall() {
    if (!client?.simulateReinstall) return;
    Alert.alert(
      'Simulate Reinstall',
      'This clears all device state as if the app was reinstalled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          style: 'destructive',
          onPress: () => {
            client.simulateReinstall?.();
            setDeviceInfo(null);
            setActiveSession(null);
            setReputation(null);
            setGraphOptedIn(false);
          },
        },
      ],
    );
  }

  function handleTamperToggle() {
    if (!client?.tamperNextSignature) return;
    if (!tamperArmed) {
      client.tamperNextSignature();
      setTamperArmed(true);
      Alert.alert('Tamper Armed', 'Next verify() call will return a 401 signature error.');
    } else {
      setTamperArmed(false);
      Alert.alert('Tamper Disarmed', 'Tamper flag cleared (note: if not yet consumed, it remains armed in the client).');
    }
  }

  function handleForceExpire() {
    if (!client?.forceExpireSession || !activeSession) {
      Alert.alert('No Session', 'Create a session first.');
      return;
    }
    client.forceExpireSession(activeSession.sessionId);
    setActiveSession(prev => prev ? { ...prev, status: 'EXPIRED' } : null);
  }

  async function handleHammer() {
    if (!client?.hammerRateLimit) return;
    setHammerLoading(true);
    setHammerResults(null);
    try {
      const results = await client.hammerRateLimit(15);
      setHammerResults(results);
    } catch (e: any) {
      Alert.alert('Hammer Failed', e.message ?? String(e));
    } finally {
      setHammerLoading(false);
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function renderScoreBar(score: number) {
    const filled = Math.round(score / 5); // 20 blocks
    const blocks = Array.from({ length: 20 }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.scoreBlock,
          i < filled
            ? score >= 70
              ? styles.scoreBlockGood
              : score >= 40
                ? styles.scoreBlockMid
                : styles.scoreBlockBad
            : styles.scoreBlockEmpty,
        ]}
      />
    ));
    return (
      <View style={styles.scoreBarRow}>
        <View style={styles.scoreBlocks}>{blocks}</View>
        <Text style={styles.scoreLabel}>{score}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Device status bar */}
      <DeviceStatusBar deviceInfo={deviceInfo} isSimulator={false} />

      {/* Env picker */}
      <View style={styles.envRow}>
        <Text style={styles.envLabel}>ENVIRONMENT</Text>
        <EnvPicker current={env} onChange={setEnv} />
        <View style={styles.mockToggleGroup}>
          <Text style={[styles.mockToggleLabel, useMock && styles.mockToggleLabelActive]}>
            MOCK
          </Text>
          <Switch
            value={useMock}
            onValueChange={handleMockToggle}
            trackColor={{ false: colors.bg.border, true: colors.status.pending + '66' }}
            thumbColor={useMock ? colors.status.pending : colors.text.tertiary}
          />
        </View>
      </View>

      {/* API config — only shown in real SDK mode */}
      {!useMock && (
        <View style={styles.apiConfigRow}>
          <View style={styles.apiConfigField}>
            <Text style={styles.apiConfigLabel}>WRITE KEY</Text>
            <TextInput
              style={styles.apiConfigInput}
              value={writeKey}
              onChangeText={setWriteKey}
              placeholder="vsk_live_…"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.apiConfigField}>
            <Text style={styles.apiConfigLabel}>READ KEY</Text>
            <TextInput
              style={styles.apiConfigInput}
              value={readKey}
              onChangeText={setReadKey}
              placeholder="vsk_read_…"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ─── Panel 01: ENROLLMENT ─────────────────────────────────────────── */}
        <PanelBlock title="ENROLLMENT" index={1} defaultExpanded>
          <View style={styles.row}>
            <ActionButton
              label="Enroll Device"
              onPress={handleEnroll}
              loading={enrollLoading}
              variant="primary"
              size="sm"
            />
            <ActionButton
              label="Get Info"
              onPress={handleGetDeviceInfo}
              loading={getDeviceLoading}
              variant="secondary"
              size="sm"
            />
            <ActionButton
              label="Wipe"
              onPress={handleWipe}
              loading={wipeLoading}
              variant="danger"
              size="sm"
            />
          </View>

          {deviceInfo ? (
            <View style={styles.infoBlock}>
              <Row label="Device ID" value={deviceInfo.deviceId} mono />
              <Row label="Platform" value={deviceInfo.platform} />
              <Row label="OS Version" value={deviceInfo.osVersion} />
              <Row label="App Version" value={deviceInfo.appVersion} />
              <Row label="Enrolled At" value={deviceInfo.enrolledAt ?? '—'} mono />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>STATUS</Text>
                <StatusBadge status={deviceInfo.enrolled ? 'enrolled' : 'unenrolled'} />
              </View>
            </View>
          ) : (
            <Text style={styles.hint}>Device not enrolled. Tap Enroll Device to begin.</Text>
          )}
        </PanelBlock>

        {/* ─── Panel 02: SESSION ───────────────────────────────────────────── */}
        <PanelBlock title="SESSION" index={2} defaultExpanded>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>USER ID</Text>
            <TextInput
              style={styles.textInput}
              value={userId}
              onChangeText={setUserId}
              placeholderTextColor={colors.text.tertiary}
              placeholder={DEBUG_CONFIG.defaultUserId}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.row}>
            <ActionButton
              label="Create Session"
              onPress={handleCreateSession}
              loading={createSessionLoading}
              variant="primary"
              size="sm"
              disabled={!deviceInfo}
            />
            <ActionButton
              label="Get Session"
              onPress={handleGetSession}
              loading={getSessionLoading}
              variant="secondary"
              size="sm"
              disabled={!activeSession}
            />
          </View>

          {!deviceInfo && (
            <Text style={styles.hint}>Enroll a device first.</Text>
          )}

          {activeSession ? (
            <View style={styles.infoBlock}>
              <Row label="Session ID" value={activeSession.sessionId} mono />
              <Row label="User ID" value={activeSession.userId} />
              <Row label="Created" value={new Date(activeSession.createdAt).toLocaleTimeString()} mono />
              <Row label="Expires" value={new Date(activeSession.expiresAt).toLocaleTimeString()} mono />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>STATUS</Text>
                <StatusBadge status={activeSession.status} />
              </View>
            </View>
          ) : deviceInfo ? (
            <Text style={styles.hint}>No active session. Tap Create Session.</Text>
          ) : null}
        </PanelBlock>

        {/* ─── Panel 03: VERIFICATION ──────────────────────────────────────── */}
        <PanelBlock title="VERIFICATION" index={3} defaultExpanded>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>FALLBACK EMAIL</Text>
            <TextInput
              style={styles.textInput}
              value={fallbackEmail}
              onChangeText={setFallbackEmail}
              placeholderTextColor={colors.text.tertiary}
              placeholder="user@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>
          <View style={styles.row}>
            <ActionButton
              label="Verify"
              onPress={handleVerify}
              loading={verifyLoading}
              variant="primary"
              size="sm"
              disabled={!activeSession || activeSession.status !== 'ACTIVE'}
            />
            <ActionButton
              label="Request Fallback"
              onPress={handleRequestFallback}
              loading={fallbackLoading}
              variant="secondary"
              size="sm"
              disabled={!activeSession}
            />
          </View>

          {!activeSession && (
            <Text style={styles.hint}>Create a session first.</Text>
          )}

          {verifyResult ? (
            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>RESULT</Text>
                <StatusBadge status={verifyResult.status} />
              </View>
              <Row label="Challenge ID" value={verifyResult.challengeId} mono />
            </View>
          ) : null}

          {fallbackResult ? (
            <View style={styles.infoBlock}>
              <Row label="OTP Token" value={fallbackResult.otpToken} mono />
              <Row label="Channel" value={fallbackResult.channel.toUpperCase()} />
              <Text style={styles.hint}>OTP token ready. Enter code below.</Text>
            </View>
          ) : null}

          {/* OTP Input */}
          <View style={styles.otpSection}>
            <OTPInput onComplete={handleSubmitOTP} />
            {otpLoading && <Text style={styles.hint}>Submitting OTP...</Text>}
            {!fallbackResult && (
              <Text style={styles.hint}>Enter email above, tap Request Fallback, then enter the 6-digit code sent to that address.</Text>
            )}
          </View>
        </PanelBlock>

        {/* ─── Panel 04: NETWORK GRAPH ─────────────────────────────────────── */}
        <PanelBlock title="NETWORK GRAPH" index={4} defaultExpanded>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>NAMESPACE</Text>
            <TextInput
              style={styles.textInput}
              value={namespace}
              onChangeText={setNamespace}
              placeholderTextColor={colors.text.tertiary}
              placeholder={DEBUG_CONFIG.defaultNetworkNamespace}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.row}>
            <ActionButton
              label={graphOptedIn ? 'Opted In ✓' : 'Opt In'}
              onPress={handleOptIn}
              loading={optInLoading}
              variant={graphOptedIn ? 'ghost' : 'primary'}
              size="sm"
            />
            <ActionButton
              label="Query Reputation"
              onPress={handleQueryReputation}
              loading={reputationLoading}
              variant="secondary"
              size="sm"
              disabled={!graphOptedIn}
            />
          </View>

          {!graphOptedIn && (
            <Text style={styles.hint}>Opt in to the namespace before querying reputation.</Text>
          )}

          {reputation ? (
            <View style={styles.infoBlock}>
              <Row label="Namespace" value={reputation.namespace} mono />
              <Row label="Peers" value={String(reputation.peerCount)} />
              <Row label="Computed" value={new Date(reputation.computedAt).toLocaleTimeString()} mono />

              <Text style={styles.subSection}>OVERALL SCORE</Text>
              {renderScoreBar(reputation.overallScore)}

              <Text style={styles.subSection}>SIGNALS</Text>
              {reputation.signals.map(signal => (
                <View key={signal.key} style={styles.signalRow}>
                  <Text style={styles.signalLabel}>{signal.label}</Text>
                  <View style={styles.signalBar}>
                    <View
                      style={[
                        styles.signalFill,
                        {
                          width: `${signal.score}%`,
                          backgroundColor:
                            signal.direction === 'positive'
                              ? colors.status.verified
                              : signal.direction === 'negative'
                                ? colors.status.failed
                                : colors.status.pending,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.signalScore}>{signal.score}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </PanelBlock>

        {/* ─── Panel 05: EDGE CASES ────────────────────────────────────────── */}
        <PanelBlock title="EDGE CASES" index={5} defaultExpanded={false}>
          <Text style={styles.edgeNote}>
            These controls simulate error conditions and stress scenarios.
          </Text>

          <View style={styles.edgeGrid}>
            <ActionButton
              label="Simulate Reinstall"
              onPress={handleSimulateReinstall}
              variant="danger"
              size="sm"
            />
            <ActionButton
              label={tamperArmed ? 'Tamper ARMED' : 'Arm Tamper'}
              onPress={handleTamperToggle}
              variant={tamperArmed ? 'danger' : 'secondary'}
              size="sm"
            />
            <ActionButton
              label="Force Expire Session"
              onPress={handleForceExpire}
              variant="danger"
              size="sm"
              disabled={!activeSession || activeSession.status === 'EXPIRED'}
            />
            <ActionButton
              label="Hammer Rate Limit (15x)"
              onPress={handleHammer}
              loading={hammerLoading}
              variant="secondary"
              size="sm"
            />
          </View>

          {hammerResults ? (
            <View style={styles.infoBlock}>
              <Text style={styles.subSection}>HAMMER RESULTS</Text>
              {hammerResults.map(r => (
                <View key={r.attempt} style={styles.hammerRow}>
                  <Text style={styles.hammerAttempt}>#{r.attempt}</Text>
                  <Text style={[styles.hammerStatus, { color: r.statusCode === 200 ? colors.log.response : colors.log.error }]}>
                    {r.statusCode}
                  </Text>
                </View>
              ))}
              <Text style={styles.hint}>
                {hammerResults.filter(r => r.statusCode === 429).length} of {hammerResults.length} requests rate limited
              </Text>
            </View>
          ) : null}
        </PanelBlock>

        {/* ─── Live Log ────────────────────────────────────────────────────── */}
        <LiveLog entries={entries} onClear={clear} onCopyAll={copyAll} />

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={mono ? styles.infoValueMono : styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  envRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
    backgroundColor: colors.bg.surface,
  },
  envLabel: {
    ...typography.sectionTitle,
    fontSize: 9,
  },
  mockToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  mockToggleLabel: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  mockToggleLabelActive: {
    color: colors.status.pending,
  },
  apiConfigRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
    backgroundColor: colors.bg.raised,
  },
  apiConfigField: {
    flex: 1,
    gap: 3,
  },
  apiConfigLabel: {
    ...typography.sectionTitle,
    fontSize: 8,
  },
  apiConfigInput: {
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    ...typography.mono,
    color: colors.text.primary,
    fontSize: 11,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inputRow: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.sectionTitle,
    fontSize: 9,
  },
  textInput: {
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.mono,
    color: colors.text.primary,
    fontSize: 13,
  },
  hint: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  infoBlock: {
    backgroundColor: colors.bg.raised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 22,
  },
  infoLabel: {
    ...typography.sectionTitle,
    fontSize: 9,
    flex: 0,
    minWidth: 80,
  },
  infoValue: {
    ...typography.label,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  infoValueMono: {
    ...typography.mono,
    color: colors.brand.primary,
    flex: 1,
    textAlign: 'right',
  },
  subSection: {
    ...typography.sectionTitle,
    fontSize: 9,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scoreBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreBlocks: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },
  scoreBlock: {
    flex: 1,
    height: 12,
    borderRadius: 2,
  },
  scoreBlockGood: {
    backgroundColor: colors.status.verified,
  },
  scoreBlockMid: {
    backgroundColor: colors.status.pending,
  },
  scoreBlockBad: {
    backgroundColor: colors.status.failed,
  },
  scoreBlockEmpty: {
    backgroundColor: colors.bg.border,
  },
  scoreLabel: {
    ...typography.mono,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 14,
    minWidth: 32,
    textAlign: 'right',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 20,
  },
  signalLabel: {
    ...typography.monoSmall,
    color: colors.text.secondary,
    width: 130,
    flexShrink: 0,
  },
  signalBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bg.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  signalFill: {
    height: '100%',
    borderRadius: 3,
  },
  signalScore: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    width: 28,
    textAlign: 'right',
  },
  edgeNote: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  edgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hammerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 2,
  },
  hammerAttempt: {
    ...typography.monoSmall,
    color: colors.text.tertiary,
    width: 30,
  },
  hammerStatus: {
    ...typography.monoSmall,
    fontWeight: '700',
  },
  otpSection: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
