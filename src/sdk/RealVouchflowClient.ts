import { NativeModules } from 'react-native';
import type { IVouchflowClient, VouchflowClientConfig } from './VouchflowClient';
import type {
  DeviceInfo,
  Session,
  VerificationResult,
  FallbackResult,
  OTPResult,
  DeviceReputation,
  LogEntry,
  SDKError,
} from './types';

const { VouchflowBridge } = NativeModules;

function makeLogId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Real SDK client — delegates to the native VouchflowBridgeModule (Kotlin).
 * Biometric prompt is raised by the device OS. Email OTP is delivered via
 * the Vouchflow server (Resend).
 *
 * Sessions are managed internally by the SDK — the sessionId from verify()
 * is stored and reused for requestFallback() / submitFallbackOtp().
 */
export class RealVouchflowClient implements IVouchflowClient {
  private config: VouchflowClientConfig;
  private configured = false;
  private lastSessionId: string | null = null;

  constructor(config: VouchflowClientConfig) {
    this.config = config;
  }

  private log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    this.config.onLog?.({
      id: makeLogId(),
      timestamp: Date.now(),
      ...entry,
    });
  }

  private async ensureConfigured(): Promise<void> {
    if (this.configured) return;

    const { writeKey, baseUrl } = this.config;

    if (!writeKey || !writeKey.startsWith('vsk_')) {
      const err: SDKError = {
        code: 400,
        message: 'Write key is required and must start with "vsk_". Enter it in the API CONFIG section.',
      };
      throw err;
    }

    const env = baseUrl.includes('sandbox') ? 'sandbox' : 'production';
    await VouchflowBridge.configure(writeKey, env);
    this.configured = true;
  }

  // ── Enrollment ──────────────────────────────────────────────────────────────
  // Enrollment is automatic on the first verify() call in the real SDK.
  // This returns synthetic device info without triggering configure, so the
  // user can see device state before entering API credentials.

  async enroll(): Promise<DeviceInfo> {
    this.log({ type: 'info', direction: 'event', method: 'SDK', endpoint: '/internal/configure',
      response: { note: 'Real SDK: enrollment is automatic on first verify()' } });
    return {
      deviceId: 'real_device',
      platform: 'android',
      osVersion: String(require('react-native').Platform.Version),
      appVersion: '0.1.0',
      enrolled: false,
    };
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return this.enroll();
  }

  async wipeAndReset(): Promise<void> {
    this.configured = false;
    try {
      await VouchflowBridge.reset();
      this.log({ type: 'warn', direction: 'event', method: 'SDK', endpoint: '/internal/wipe',
        response: { note: 'Real SDK: Keystore key and AccountManager tokens cleared.' } });
    } catch (e: any) {
      this.log({ type: 'error', direction: 'event', method: 'SDK', endpoint: '/internal/wipe',
        error: `Native reset failed: ${e.message ?? String(e)}` });
    }
  }

  // ── Sessions ────────────────────────────────────────────────────────────────
  // Session lifecycle is managed internally by the SDK's VerificationManager.

  async createSession(userId: string): Promise<Session> {
    const sessionId = 'real_ses_' + Math.random().toString(36).slice(2);
    this.lastSessionId = sessionId;
    this.log({ type: 'info', direction: 'event', method: 'SDK', endpoint: '/internal/session',
      response: { note: 'Real SDK: session will be created by the SDK during verify()', userId } });
    const now = new Date();
    return {
      sessionId,
      userId,
      status: 'ACTIVE',
      createdAt: isoNow(),
      expiresAt: new Date(now.getTime() + 300_000).toISOString(),
      deviceId: 'real_device',
    };
  }

  async getSession(sessionId: string): Promise<Session> {
    return {
      sessionId,
      userId: 'real_user',
      status: 'ACTIVE',
      createdAt: isoNow(),
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      deviceId: 'real_device',
    };
  }

  // ── Verification ────────────────────────────────────────────────────────────

  async verify(_sessionId: string): Promise<VerificationResult> {
    await this.ensureConfigured();
    const startTime = Date.now();
    this.log({ type: 'request', direction: 'out', method: 'POST', endpoint: '/v1/verify',
      request: { note: 'Raising device biometric prompt…' } });

    try {
      const result = await VouchflowBridge.verify();
      const latencyMs = Date.now() - startTime;
      this.log({ type: 'response', direction: 'in', method: 'POST', endpoint: '/v1/verify/complete',
        statusCode: 200, latencyMs, response: result });
      return {
        status: result.verified ? 'verified' : 'failed',
        deviceToken: result.deviceToken ?? '',
        latencyMs,
        signatureValid: result.verified,
        attestationValid: true,
      };
    } catch (e: any) {
      const nativeCode: string = e.code ?? 'VERIFY_ERROR';
      const latencyMs = Date.now() - startTime;
      this.log({ type: 'error', direction: 'in', method: 'POST', endpoint: '/v1/verify',
        statusCode: (nativeCode === 'BIOMETRIC_CANCELLED' || nativeCode === 'BIOMETRIC_FAILED') ? 401 : 500,
        latencyMs, error: `[${nativeCode}] ${e.message}` });
      const err: SDKError = { code: nativeCode === 'BIOMETRIC_CANCELLED' ? 401 : 500, message: `[${nativeCode}] ${e.message ?? String(e)}` };
      throw err;
    }
  }

  // ── Fallback ────────────────────────────────────────────────────────────────

  async requestFallback(_sessionId: string, email: string): Promise<FallbackResult> {
    await this.ensureConfigured();
    const startTime = Date.now();

    // If no active session (e.g. verify succeeded and was not cancelled), initiate one now.
    // This lets the test harness exercise the fallback path without requiring a cancelled biometric.
    try {
      const init = await VouchflowBridge.initiateSessionForFallbackTest();
      this.log({ type: 'info', direction: 'event', method: 'SDK',
        endpoint: '/v1/verify',
        response: { note: 'Initiated verify session for fallback test', sessionId: init.sessionId } });
    } catch {
      // Session may already be pending (biometric was cancelled) — proceed.
    }

    this.log({ type: 'request', direction: 'out', method: 'POST',
      endpoint: '/v1/verify/{session_id}/fallback',
      request: { email: email.replace(/./g, '*').slice(0, 6) + '...' } });

    try {
      const result = await VouchflowBridge.requestFallback(email);
      this.log({ type: 'response', direction: 'in', method: 'POST',
        endpoint: '/v1/verify/{session_id}/fallback',
        statusCode: 200, latencyMs: Date.now() - startTime, response: { expiresAt: result.expiresAt } });
      return {
        otpToken: result.fallbackSessionId,
        expiresInSeconds: 300,
        channel: 'email',
      };
    } catch (e: any) {
      this.log({ type: 'error', direction: 'in', method: 'POST',
        endpoint: '/v1/verify/{session_id}/fallback',
        statusCode: 500, latencyMs: Date.now() - startTime, error: `[${e.code ?? 'FALLBACK_ERROR'}] ${e.message}` });
      const err: SDKError = { code: 500, message: e.message ?? String(e) };
      throw err;
    }
  }

  async submitOTP(otpToken: string, code: string): Promise<OTPResult> {
    await this.ensureConfigured();
    const startTime = Date.now();
    this.log({ type: 'request', direction: 'out', method: 'POST',
      endpoint: '/v1/verify/otp/submit', request: { codeLength: code.length } });

    try {
      const result = await VouchflowBridge.submitFallbackOtp(otpToken, code);
      this.log({ type: 'response', direction: 'in', method: 'POST',
        endpoint: '/v1/verify/otp/submit',
        statusCode: 200, latencyMs: Date.now() - startTime, response: result });
      return {
        verified: result.verified,
        sessionId: otpToken,
      };
    } catch (e: any) {
      this.log({ type: 'error', direction: 'in', method: 'POST',
        endpoint: '/v1/verify/otp/submit',
        statusCode: 400, latencyMs: Date.now() - startTime, error: e.message });
      const err: SDKError = { code: 400, message: e.message ?? String(e) };
      throw err;
    }
  }

  // ── Network graph ────────────────────────────────────────────────────────────
  // Not available via the current SDK bridge — log and no-op.

  async optInToGraph(namespace: string): Promise<void> {
    this.log({ type: 'info', direction: 'event', method: 'SDK', endpoint: '/internal/graph',
      response: { note: 'Network graph opt-in is a customer account setting, not a per-device call', namespace } });
  }

  // ── Device reputation ─────────────────────────────────────────────────────
  // Calls GET /v1/device/:token/reputation with the read-scoped key.
  // This is a server-side API call — never done in production mobile apps.
  // The test harness calls it here to exercise the full trust verification pattern.

  async queryReputation(deviceToken: string): Promise<DeviceReputation> {
    const { readKey, baseUrl } = this.config;
    if (!readKey || !readKey.startsWith('vsk_')) {
      const err: SDKError = { code: 400, message: 'Read key is required for reputation queries. Enter it in the API CONFIG section.' };
      throw err;
    }
    const endpoint = `/v1/device/${deviceToken}/reputation`;
    const startTime = Date.now();
    this.log({ type: 'request', direction: 'out', method: 'GET', endpoint,
      request: { note: 'Server-side reputation query (read-scoped key)' } });

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${readKey}`,
          'Vouchflow-API-Version': '2026-04-01',
        },
      });
      const latencyMs = Date.now() - startTime;
      const body = await response.json();

      if (!response.ok) {
        this.log({ type: 'error', direction: 'in', method: 'GET', endpoint,
          statusCode: response.status, latencyMs, error: body?.error?.message ?? `HTTP ${response.status}` });
        const err: SDKError = { code: response.status, message: body?.error?.message ?? `HTTP ${response.status}` };
        throw err;
      }

      this.log({ type: 'response', direction: 'in', method: 'GET', endpoint,
        statusCode: 200, latencyMs, response: body });
      return body as DeviceReputation;
    } catch (e: any) {
      if (e.code !== undefined) throw e;
      this.log({ type: 'error', direction: 'in', method: 'GET', endpoint,
        latencyMs: Date.now() - startTime, error: e.message ?? String(e) });
      const err: SDKError = { code: 500, message: e.message ?? String(e) };
      throw err;
    }
  }
}
