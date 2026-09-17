package com.vaultedapp.update

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * Wraps Google Play's official In-App Updates API to check whether a newer
 * version is live on the Play Store, without needing a custom backend. Used
 * for the dismissible "update available" prompt (see src/services/updateCheck.ts) —
 * iOS does the equivalent via the public App Store lookup API on the JS side,
 * since Apple has no native equivalent to this.
 */
class VaultedUpdateModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "VaultedUpdate"

  @ReactMethod
  fun checkForUpdate(promise: Promise) {
    val appUpdateManager = AppUpdateManagerFactory.create(reactContext)
    appUpdateManager.appUpdateInfo
      .addOnSuccessListener { info ->
        val result = Arguments.createMap()
        result.putBoolean(
          "updateAvailable",
          info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE,
        )
        result.putInt("availableVersionCode", info.availableVersionCode())
        promise.resolve(result)
      }
      .addOnFailureListener { e ->
        promise.reject("E_UPDATE_CHECK_FAILED", e.message, e)
      }
  }
}
