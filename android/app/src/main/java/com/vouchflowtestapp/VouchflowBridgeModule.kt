package com.vouchflowtestapp

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import com.vouchflow.sdk.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class VouchflowBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "VouchflowBridge"

    // ── configure ─────────────────────────────────────────────────────────────

    @ReactMethod
    fun configure(apiKey: String, environment: String, promise: Promise) {
        try {
            val env = if (environment == "sandbox") VouchflowEnvironment.SANDBOX
                      else VouchflowEnvironment.PRODUCTION
            Vouchflow.configure(VouchflowConfig(apiKey = apiKey, environment = env))
            promise.resolve(null)
        } catch (e: VouchflowError.InvalidApiKey) {
            promise.reject("INVALID_API_KEY", "API key must start with 'vsk_'.", e)
        } catch (e: Exception) {
            promise.reject("CONFIG_ERROR", e.message ?: "Configure failed", e)
        }
    }

    // ── reset ─────────────────────────────────────────────────────────────────

    @ReactMethod
    fun reset(promise: Promise) {
        try {
            Vouchflow.reset()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RESET_ERROR", e.message ?: "Reset failed", e)
        }
    }

    // ── verify ────────────────────────────────────────────────────────────────

    @ReactMethod
    fun verify(promise: Promise) {
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity available")
            return
        }
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val result = Vouchflow.shared.verify(activity, VerificationContext.LOGIN)
                val map = Arguments.createMap().apply {
                    putBoolean("verified", result.verified)
                    putString("confidence", result.confidence.name.lowercase())
                    putString("deviceToken", result.deviceToken)
                    putInt("deviceAgeDays", result.deviceAgeDays)
                    putInt("networkVerifications", result.networkVerifications)
                }
                promise.resolve(map)
            } catch (e: VouchflowError.BiometricCancelled) {
                // sessionId is needed by requestFallback — pass it in userInfo
                val userInfo = Arguments.createMap().apply { putString("sessionId", e.sessionId) }
                promise.reject("BIOMETRIC_CANCELLED", "User cancelled biometric prompt", e, userInfo)
            } catch (e: VouchflowError.BiometricFailed) {
                val userInfo = Arguments.createMap().apply { putString("sessionId", e.sessionId) }
                promise.reject("BIOMETRIC_FAILED", "Biometric authentication failed", e, userInfo)
            } catch (e: VouchflowError.BiometricUnavailable) {
                promise.reject("BIOMETRIC_UNAVAILABLE", "No biometrics enrolled on this device", e)
            } catch (e: VouchflowError.EnrollmentFailed) {
                // enrollmentCause may be a ServerError whose .message is null; format it explicitly.
                val cause = e.enrollmentCause
                val msg = when (cause) {
                    is VouchflowError.ServerError ->
                        "[${cause.statusCode}] ${cause.code ?: "server_error"}: ${cause.serverMessage ?: "no detail"}"
                    else -> cause?.message ?: "Device enrollment failed"
                }
                promise.reject("ENROLLMENT_FAILED", msg, e)
            } catch (e: VouchflowError.ServerError) {
                val msg = "[${e.statusCode}] ${e.code ?: "server_error"}: ${e.serverMessage ?: "no detail"}"
                promise.reject("SERVER_ERROR", msg, e)
            } catch (e: VouchflowError.NetworkUnavailable) {
                promise.reject("NETWORK_UNAVAILABLE", "No network connection", e)
            } catch (e: VouchflowError.PinningFailure) {
                promise.reject("PINNING_FAILURE", "TLS certificate pinning failed", e)
            } catch (e: Exception) {
                promise.reject("VERIFY_ERROR", e.message ?: "Verification failed", e)
            }
        }
    }

    // ── requestFallback ───────────────────────────────────────────────────────

    @ReactMethod
    fun requestFallback(sessionId: String, email: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = Vouchflow.shared.requestFallback(
                    sessionId = sessionId,
                    email = email,
                    reason = FallbackReason.BIOMETRIC_FAILED
                )
                val map = Arguments.createMap().apply {
                    putString("fallbackSessionId", result.fallbackSessionId)
                    putString("expiresAt", result.expiresAt.toString())
                }
                promise.resolve(map)
            } catch (e: VouchflowError.ServerError) {
                val msg = "[${e.statusCode}] ${e.code ?: "server_error"}: ${e.serverMessage ?: "no detail"}"
                promise.reject("SERVER_ERROR", msg, e)
            } catch (e: Exception) {
                promise.reject("FALLBACK_ERROR", e.message ?: "Fallback request failed", e)
            }
        }
    }

    // ── submitFallbackOtp ─────────────────────────────────────────────────────

    @ReactMethod
    fun submitFallbackOtp(sessionId: String, otp: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = Vouchflow.shared.submitFallbackOtp(sessionId = sessionId, otp = otp)
                val map = Arguments.createMap().apply {
                    putBoolean("verified", result.verified)
                    putString("confidence", result.confidence.name.lowercase())
                }
                promise.resolve(map)
            } catch (e: VouchflowError.ServerError) {
                val msg = "[${e.statusCode}] ${e.code ?: "server_error"}: ${e.serverMessage ?: "no detail"}"
                promise.reject("SERVER_ERROR", msg, e)
            } catch (e: Exception) {
                promise.reject("OTP_ERROR", e.message ?: "OTP submission failed", e)
            }
        }
    }
}
