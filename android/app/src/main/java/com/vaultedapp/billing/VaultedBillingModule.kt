package com.vaultedapp.billing

import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Wraps Play Billing Library 8.0.0 directly for subscriptions, standing in for
 * react-native-iap on Android — that library only supports Billing 8+ via a
 * Nitro Modules rewrite that requires React Native's New Architecture, which
 * this app doesn't run. iOS purchases still go through react-native-iap/StoreKit
 * unchanged (see react-native.config.js and src/services/iap.ts).
 *
 * The JS-facing shape mirrors what react-native-iap already returned so
 * SubscriptionContext.tsx needed no logic changes.
 */
class VaultedBillingModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext),
  PurchasesUpdatedListener {

  private var billingClient: BillingClient? = null
  private val productDetailsCache = HashMap<String, ProductDetails>()

  override fun getName() = "VaultedBilling"

  // Required by RN's NativeEventEmitter (JS side) even though event dispatch
  // itself goes through RCTDeviceEventEmitter directly below — otherwise it
  // logs "was called with a non-null argument without the required
  // addListener/removeListeners method" on every construction.
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  private fun emit(eventName: String, params: Any?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private fun errorCodeFor(responseCode: Int): String = when (responseCode) {
    BillingClient.BillingResponseCode.USER_CANCELED -> "E_USER_CANCELLED"
    BillingClient.BillingResponseCode.DEVELOPER_ERROR -> "E_DEVELOPER_ERROR"
    else -> "E_UNKNOWN"
  }

  @ReactMethod
  fun initConnection(promise: Promise) {
    val existing = billingClient
    if (existing != null && existing.isReady) {
      promise.resolve(true)
      return
    }

    val client = BillingClient.newBuilder(reactContext)
      .setListener(this)
      .enablePendingPurchases(
        // Billing 8.0.0 requires this even for subscription-only apps —
        // it throws "Pending purchases for one-time products must be
        // supported" otherwise, regardless of whether one-time products
        // are actually sold.
        PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
      )
      .build()
    billingClient = client

    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
          promise.resolve(true)
        } else {
          promise.reject("E_UNKNOWN", billingResult.debugMessage)
        }
      }

      override fun onBillingServiceDisconnected() {
        // No-op: matches react-native-iap's fire-and-forget behavior. The
        // client reconnects on the next initConnection() call.
      }
    })
  }

  @ReactMethod
  fun endConnection(promise: Promise) {
    billingClient?.endConnection()
    billingClient = null
    productDetailsCache.clear()
    promise.resolve(true)
  }

  @ReactMethod
  fun getSubscriptions(skus: ReadableArray, promise: Promise) {
    val client = billingClient
    if (client == null || !client.isReady) {
      promise.reject("E_UNKNOWN", "Billing client not connected")
      return
    }

    val products = (0 until skus.size()).mapNotNull { i ->
      val productId = skus.getString(i) ?: return@mapNotNull null
      QueryProductDetailsParams.Product.newBuilder()
        .setProductId(productId)
        .setProductType(BillingClient.ProductType.SUBS)
        .build()
    }
    val params = QueryProductDetailsParams.newBuilder().setProductList(products).build()

    client.queryProductDetailsAsync(params) { billingResult, result ->
      if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
        promise.reject("E_UNKNOWN", billingResult.debugMessage)
        return@queryProductDetailsAsync
      }
      val array = Arguments.createArray()
      for (details in result.productDetailsList) {
        productDetailsCache[details.productId] = details
        array.pushMap(productDetailsToMap(details))
      }
      promise.resolve(array)
    }
  }

  private fun productDetailsToMap(details: ProductDetails): WritableMap {
    val map = Arguments.createMap()
    map.putString("productId", details.productId)
    map.putString("title", details.title)
    map.putString("description", details.description)

    val offers = Arguments.createArray()
    details.subscriptionOfferDetails?.forEach { offer ->
      val offerMap = Arguments.createMap()
      offerMap.putString("offerToken", offer.offerToken)
      offerMap.putString("basePlanId", offer.basePlanId)
      offers.pushMap(offerMap)
    }
    map.putArray("subscriptionOfferDetails", offers)
    return map
  }

  @ReactMethod
  fun requestSubscription(sku: String, offerToken: String, promise: Promise) {
    val client = billingClient
    if (client == null || !client.isReady) {
      promise.reject("E_UNKNOWN", "Billing client not connected")
      return
    }
    val details = productDetailsCache[sku]
    if (details == null) {
      promise.reject("E_DEVELOPER_ERROR", "No product details cached for $sku — call getSubscriptions first")
      return
    }
    val activity = currentActivity
    if (activity == null) {
      promise.reject("E_UNKNOWN", "No current activity")
      return
    }

    val offerParams = BillingFlowParams.ProductDetailsParams.newBuilder()
      .setProductDetails(details)
      .setOfferToken(offerToken)
      .build()
    val flowParams = BillingFlowParams.newBuilder()
      .setProductDetailsParamsList(listOf(offerParams))
      .build()

    val result = client.launchBillingFlow(activity, flowParams)
    if (result.responseCode != BillingClient.BillingResponseCode.OK) {
      promise.reject(errorCodeFor(result.responseCode), result.debugMessage)
      return
    }
    // The actual purchase result arrives asynchronously via onPurchasesUpdated
    // below, emitted to JS as "purchase-updated" — matches how
    // SubscriptionContext.tsx already expects Android purchases to resolve.
    promise.resolve(null)
  }

  override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
      for (purchase in purchases) {
        emit("purchase-updated", purchaseToMap(purchase))
      }
    } else {
      val errorMap = Arguments.createMap()
      errorMap.putString("code", errorCodeFor(billingResult.responseCode))
      errorMap.putString("message", billingResult.debugMessage)
      emit("purchase-error", errorMap)
    }
  }

  private fun purchaseToMap(purchase: Purchase): WritableMap {
    val map = Arguments.createMap()
    map.putString("productId", purchase.products.firstOrNull())
    map.putString("purchaseToken", purchase.purchaseToken)
    map.putString("transactionId", purchase.orderId ?: purchase.purchaseToken)
    map.putDouble("transactionDate", purchase.purchaseTime.toDouble())
    map.putInt("purchaseState", purchase.purchaseState)
    map.putBoolean("isAcknowledged", purchase.isAcknowledged)
    return map
  }

  @ReactMethod
  fun getAvailablePurchases(promise: Promise) {
    val client = billingClient
    if (client == null || !client.isReady) {
      promise.reject("E_UNKNOWN", "Billing client not connected")
      return
    }
    val params = QueryPurchasesParams.newBuilder()
      .setProductType(BillingClient.ProductType.SUBS)
      .build()
    client.queryPurchasesAsync(params) { billingResult, purchases ->
      if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
        promise.reject("E_UNKNOWN", billingResult.debugMessage)
        return@queryPurchasesAsync
      }
      val array = Arguments.createArray()
      purchases.forEach { array.pushMap(purchaseToMap(it)) }
      promise.resolve(array)
    }
  }

  @ReactMethod
  fun finishTransaction(purchaseToken: String, promise: Promise) {
    val client = billingClient
    if (client == null || !client.isReady) {
      promise.reject("E_UNKNOWN", "Billing client not connected")
      return
    }
    val params = AcknowledgePurchaseParams.newBuilder()
      .setPurchaseToken(purchaseToken)
      .build()
    client.acknowledgePurchase(params) { billingResult ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        promise.resolve(true)
      } else {
        promise.reject("E_UNKNOWN", billingResult.debugMessage)
      }
    }
  }
}
