// functions/index.js
// dotenv only used for local development; secrets come from Secret Manager in production
if (process.env.FUNCTIONS_EMULATOR) {
  require("dotenv").config();
}
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");
const {google} = require("googleapis");

// ---------------------------------------------------------------------------
// Subscription constants
// ---------------------------------------------------------------------------
const FREE_TIER_ITEM_LIMIT = 10;
const APPLE_VERIFY_URL_PROD = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_VERIFY_URL_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt";
const BUNDLE_ID = "com.vaulted.dev";

// Lazy-initialized so the module loads cleanly during Firebase CLI analysis
let _openai = null;
const getOpenAI = () => {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
};

// node-fetch v3 is ESM-only. Use dynamic import:
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

admin.initializeApp();
const db = admin.firestore();

exports.exportInventoryToExcel = functions.runWith({ secrets: ["SMTP_USER", "SMTP_PASS"] }).https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  const tokenEmail = context.auth?.token?.email;
  const isRelayEmail = !!(tokenEmail && tokenEmail.endsWith("@privaterelay.appleid.com"));

  // Use override email if the token email is a relay address or missing
  const overrideEmail = data?.overrideEmail?.trim() || null;
  const userEmail = (isRelayEmail || !tokenEmail) ? overrideEmail : tokenEmail;

  console.log("[exportInventoryToExcel] tokenEmail:", tokenEmail, "isRelay:", isRelayEmail, "overrideEmail:", overrideEmail, "resolved userEmail:", userEmail);

  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  if (!userEmail) {
    throw new functions.https.HttpsError("unauthenticated", "User email not found.");
  }

  // Basic email format validation for override emails
  if (overrideEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(overrideEmail)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid email address provided.");
  }

  try {
    const snapshot = await db
      .collection("inventory")
      .where("userId", "==", uid)
      .get();

    if (snapshot.empty) {
      throw new Error("No inventory found for this user.");
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventory");

    sheet.columns = [
      { header: "Brand", key: "brand", width: 15 },
      { header: "Silhouette", key: "silhouette", width: 25 },
      { header: "Name", key: "name", width: 35 },
      { header: "Size", key: "size", width: 5 },
      { header: "Color", key: "color", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Release Date", key: "releaseDate", width: 15 },
      { header: "Retail Value", key: "retailValue", width: 10 },
      { header: "Image", key: "imageUrl", width: 30 },
    ];
    for (const doc of snapshot.docs) {
      const item = doc.data();
      const {
        name,
        size,
        color,
        quantity,
        releaseDate,
        brand,
        silhouette,
        retailValue,
        imageUrl,
      } = item;

      const retailValueDisplay =
        retailValue === undefined || retailValue === null || retailValue === ""
          ? ""
          : typeof retailValue === "number"
            ? `$${retailValue.toFixed(2)}`
            : `$${retailValue}`;

      const row = sheet.addRow({
        brand,
        silhouette,
        name,
        size,
        color,
        quantity,
        releaseDate,
        retailValue: retailValueDisplay,
        imageUrl: "",
      });

      const rowIndex = row.number;

      // ✅ fixed variable name
      if (imageUrl && imageUrl.startsWith("https")) {
        try {
          let imageDownloadUrl = imageUrl;
          // if (imageDownloadUrl.includes('.firebasestorage.app')) {
          //   imageDownloadUrl = imageDownloadUrl.replace(
          //     '.firebasestorage.app',
          //     '.appspot.com'
          //   );
          // }
          console.log('Image Download URL:', imageDownloadUrl);
          const response = await fetch(imageDownloadUrl);
          const buffer = Buffer.from(await response.arrayBuffer());

          console.log('Fetching image-1:', imageDownloadUrl);
          console.log('Response status-2:', response.status);
          console.log('Content-Type-3:', response.headers.get('content-type'));
            
          const imageId = workbook.addImage({
            buffer,
            extension: "jpeg",
          });

          sheet.addImage(imageId, {
            tl: { col: 8, row: rowIndex - 1 },
            ext: { width: 40, height: 40 },
          });

          sheet.getRow(rowIndex).height = 40;
          
        } catch (err) {
          console.warn(`Image fetch failed for ${name}:`, err.message);
        }
      }
    }

    // ✅ Write to buffer (works in Node 20+)
    const buffer = await workbook.xlsx.writeBuffer();
    // const base64Excel = buffer.toString("base64");
    
    // console.log('Base64 Excel:', base64Excel);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("SMTP credentials are not configured in environment variables.");
    }

    const transporter = nodemailer.createTransport({
      host: "mail.vaulted-app.com",
      port: 465,
      secure: true,
      authMethod: "LOGIN",
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim(),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"Vaulted App" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: "Your Vaulted Export Is Ready",
      text: `Hello,\n\nAttached is your exported inventory report from Vaulted.\n\nThis export includes all your items with images and details.\n\nEnjoy!\nThe Vaulted Team\nsupport@vaulted-app.com`,
      attachments: [
        {
          filename: `vaulted_inventory_${Date.now()}.xlsx`,
          content: buffer,
        },
      ],
    };
    try {
      await transporter.sendMail(mailOptions);
      return { success: true, message: "Email sent successfully!" };
    } catch (error) {
      console.error("Error sending email:", error);
      throw new functions.https.HttpsError("unknown", error.message);
    }
    // return {
    //   success: true,
    //   fileName: `inventory_${Date.now()}.xlsx`,
    //   fileData: base64Excel,
    // };
  } catch (error) {
    console.error("Error exporting inventory:", error);
    throw new functions.https.HttpsError("unknown", error.message);
  }
});

const normalizeRetailValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeQuantity = (value) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }
  return 1;
};

const normalizeReleaseDate = (value) => {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }
  return undefined;
};

const pruneUndefined = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};

const normalizeMetadataFields = (metadata = {}) => {
  const normalized = {};
  Object.keys(metadata).forEach((key) => {
    if (!key) {
      return;
    }
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    normalized[normalizedKey] = metadata[key];
  });
  return normalized;
};

const buildInventoryDocFromMetadata = (metadata, imageUrl, uid, index) => {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const canonical = normalizeMetadataFields(metadata);
  const getField = (...keys) => {
    for (const key of keys) {
      const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (canonical[normalizedKey] !== undefined && canonical[normalizedKey] !== null) {
        return canonical[normalizedKey];
      }
    }
    return undefined;
  };

  const name = getField("name", "model") || metadata.name || metadata.model || `AI Item ${index + 1}`;
  const brand = getField("brand") || metadata.brand || "Unknown Brand";
  if (!name || !brand) {
    return null;
  }

  const retailValueRaw = getField("retailvalue") ?? metadata.retailValue;
  const retailValue = normalizeRetailValue(retailValueRaw);
  const quantity = normalizeQuantity(getField("quantity") ?? metadata.quantity);
  const sizeField = getField("size");
  const silhouetteField = getField("silhouette", "model");
  const styleIdField = getField("styleid", "style id");
  const colorField = getField("color");
  const releaseDateField = getField("releasedate", "release date");
  const conditionField = getField("condition");
  const flawsField = getField("anyflawsordamage", "flaws", "notes");

  return pruneUndefined({
    name: name.trim(),
    brand: brand.trim(),
    silhouette: silhouetteField || metadata.silhouette || metadata.model || "",
    styleId: styleIdField || metadata.styleId || "",
    size: sizeField ? String(sizeField) : metadata.size ? String(metadata.size) : "N/A",
    color: colorField || metadata.color || "Unknown",
    quantity,
    value: retailValue,
    retailValue,
    releaseDate: normalizeReleaseDate(releaseDateField ?? metadata.releaseDate),
    condition: conditionField || metadata.condition || undefined,
    notes: flawsField || metadata.flaws || undefined,
    imageUrl: metadata.imageUrl || imageUrl,
    userId: uid,
    source: "ai",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const persistMetadataDocs = async (docs) => {
  if (!docs.length) {
    return;
  }

  const batch = db.batch();
  docs.forEach((doc) => {
    const ref = db.collection("inventory").doc();
    batch.set(ref, doc);
  });
  await batch.commit();
};

exports.analyzeShoeMetadata = functions.runWith({ secrets: ["OPENAI_API_KEY"] }).https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const imageUris = Array.isArray(data?.imageUris)
    ? data.imageUris.filter((uri) => typeof uri === "string" && uri.trim().length > 0)
    : [];

  if (imageUris.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "No image URIs provided.");
  }

  if (imageUris.length > 10) {
    throw new functions.https.HttpsError("invalid-argument", "A maximum of 10 images is supported.");
  }

  const shoeSize = typeof data?.shoeSize === "string" ? data.shoeSize.trim() : undefined;

  console.log('imageUris=====', imageUris);

  try {
    const aiResponse = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "These are shoe images. For each image, extract the following fields and return a JSON object with an \"items\" array containing one object per image (in order):\n" +
                "- brand: the manufacturer company name only (e.g. Nike, Adidas, Jordan, New Balance, Puma). Never use the silhouette or model name as the brand.\n" +
                "- model: the specific model name (e.g. Air Force 1, Yeezy 350, Dunk Low)\n" +
                "- name: full descriptive name combining brand + model + colorway (e.g. Nike Air Force 1 Low White)\n" +
                "- size: shoe size if visible, otherwise null\n" +
                "- color: primary colorway\n" +
                "- releaseDate: release date in YYYY-MM-DD format if known, otherwise null\n" +
                "- retailValue: original retail price in USD as a number, otherwise null\n" +
                "- styleId: style code/SKU if visible or known (e.g. 315122-111), otherwise null\n" +
                "- silhouette: the shoe silhouette or model line (e.g. Air Force 1, Dunk, Yeezy Boost 350)\n" +
                "- condition: one of New / Like New / Used\n" +
                "- flaws: any visible flaws or damage, otherwise null\n" +
                "If an image is not a shoe or cannot be identified, still include an entry with as many fields as possible.\n" +
                "Example response: {\"items\": [{\"brand\": \"Nike\", \"model\": \"Air Force 1\", ...}]}",
            },
            ...imageUris.map((url) => ({
              type: "image_url",
              image_url: { url: url }
            })),
          ],
        },
      ],
    });

    const metadataContent = aiResponse.choices[0]?.message?.content;
    console.log("OpenAI raw response:", metadataContent);

    let parsed;
    try {
      parsed = JSON.parse(metadataContent || "{}");
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw content:", metadataContent);
      throw new Error("Unable to parse AI metadata response.");
    }

    // Support both {items:[...]} and a bare array (fallback)
    const metadata = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : null;

    if (!metadata) {
      throw new Error("AI response did not contain a valid items array.");
    }

    const docsToSave = metadata
      .map((entry, index) => {
        const doc = buildInventoryDocFromMetadata(entry, imageUris[index], uid, index);
        if (doc && shoeSize) {
          doc.size = shoeSize;
        }
        return doc;
      })
      .filter(Boolean);

    await persistMetadataDocs(docsToSave);

    return {
      success: true,
      metadata,
      queuedCount: docsToSave.length,
    };
  } catch (error) {
    console.error("AI metadata error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Lookup product details by barcode using BarcodeSpider API
 * @param {string} data.barcode - The barcode/UPC to lookup
 * @returns {Object} Product information including title, brand, model, image, etc.
 */
exports.lookupbarcode = functions.runWith({ secrets: ["BARCODE_SPIDER_TOKEN"] }).https.onCall(async (data, context) => {
  console.log("🔥 lookupbarcode HIT");
  const uid = context.auth?.uid;
  console.log('uid =====', uid);
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const barcode = data?.barcode;
  if (!barcode || typeof barcode !== "string" || barcode.trim().length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Barcode is required and must be a non-empty string."
    );
  }

  // Clean the barcode (remove spaces, dashes)
  const cleanBarcode = barcode.replace(/[\s-]/g, "").trim();
  
  if (cleanBarcode.length < 8) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid barcode format. Barcode must be at least 8 characters."
    );
  }

  // Get API token from environment variable
  const apiToken = process.env.BARCODE_SPIDER_TOKEN;
  if (!apiToken) {
    console.error("BARCODE_SPIDER_TOKEN environment variable is not set");
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Barcode lookup service is not configured. Please contact support."
    );
  }

  try {
    const apiUrl = `https://api.barcodespider.com/v1/lookup?token=${apiToken}&upc=${cleanBarcode}`;
    
    console.log(`Looking up barcode: ${cleanBarcode}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`BarcodeSpider API error: ${response.status} ${response.statusText}`);
      throw new functions.https.HttpsError(
        "internal",
        `Barcode lookup service returned an error: ${response.status}`
      );
    }

    const apiData = await response.json();

    console.log({apiData});
    // Check if API returned an error
    if (apiData.item_response && apiData.item_response.code !== 200) {
      console.log(`No product found for barcode: ${cleanBarcode}`);
      return {
        success: false,
        barcode: cleanBarcode,
        message: apiData.item_response.message || "Product not found",
      };
    }

    // Extract product information from API response
    const itemAttributes = apiData.item_attributes || {};
    
    // Download and upload image to Firebase Storage if image URL exists
    let imageUrl = itemAttributes.image || undefined;
    if (imageUrl) {
      console.log(`📷 Image URL found, uploading to Firebase Storage: ${imageUrl}`);
      const uploadedImageUrl = await downloadAndUploadImageToStorage(imageUrl, uid);
      if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
        console.log(`✅ Image uploaded to Firebase Storage: ${imageUrl}`);
      } else {
        console.warn(`⚠️ Failed to upload image, keeping original URL: ${imageUrl}`);
      }
    }
    
    // Map API response to our format
    const productInfo = {
      success: true,
      barcode: cleanBarcode,
      name: itemAttributes.title || itemAttributes.description || undefined,
      brand: itemAttributes.brand || undefined,
      model: itemAttributes.model || undefined,
      mpn: itemAttributes.mpn || undefined,
      manufacturer: itemAttributes.manufacturer || undefined,
      category: itemAttributes.category || itemAttributes.parent_category || undefined,
      imageUrl: imageUrl,
      description: itemAttributes.description || undefined,
      color: itemAttributes.color || undefined,
      size: itemAttributes.size || undefined,
      weight: itemAttributes.weight || undefined,
      // Extract style ID from model or MPN if available
      styleId: itemAttributes.mpn || itemAttributes.model || extractStyleId(itemAttributes.title || ""),
      // Use lowest price as retail value estimate
      retailValue: itemAttributes.lowest_price 
        ? parseFloat(itemAttributes.lowest_price) 
        : undefined,
      // Store additional info
      stores: apiData.Stores || [],
      lowestPrice: itemAttributes.lowest_price ? parseFloat(itemAttributes.lowest_price) : undefined,
      highestPrice: itemAttributes.highest_price ? parseFloat(itemAttributes.highest_price) : undefined,
      asin: itemAttributes.asin || undefined,
      ean: itemAttributes.ean || undefined,
    };

    console.log(`Product found for barcode ${cleanBarcode}:`, productInfo.name);
    
    return productInfo;
  } catch (error) {
    console.error("Error in barcode lookup:", error);
    
    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      "internal",
      `Failed to lookup barcode: ${error.message}`
    );
  }
});

// ===========================================================================
// SUBSCRIPTION FUNCTIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// Helper: write/update the subscription document in Firestore
// ---------------------------------------------------------------------------
async function upsertSubscription(uid, {isActive, productId, expiresAt, platform, originalTransactionId}) {
  await db.collection("subscriptions").doc(uid).set({
    isActive,
    productId: productId || null,
    expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
    platform,
    originalTransactionId: originalTransactionId || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
}

// ---------------------------------------------------------------------------
// Helper: validate receipt with Apple's servers
// Returns the latest receipt info or null
// ---------------------------------------------------------------------------
async function verifyAppleReceipt(receiptData, sharedSecret) {
  const body = JSON.stringify({"receipt-data": receiptData, password: sharedSecret});
  // Try production first; fall back to sandbox for status 21007
  let res = await fetch(APPLE_VERIFY_URL_PROD, {method: "POST", body, headers: {"Content-Type": "application/json"}});
  let json = await res.json();
  if (json.status === 21007) {
    res = await fetch(APPLE_VERIFY_URL_SANDBOX, {method: "POST", body, headers: {"Content-Type": "application/json"}});
    json = await res.json();
  }
  // Status 21002 = malformed receipt — this happens with StoreKit Configuration File (Xcode local testing).
  // These are JWS tokens that the legacy /verifyReceipt endpoint cannot parse.
  // Return a sentinel so the caller can grant a test subscription.
  if (json.status === 21002) {
    return {_xcodeTestReceipt: true};
  }
  if (json.status !== 0) {
    throw new Error(`Apple receipt validation failed with status ${json.status}`);
  }
  // Return latest_receipt_info sorted by expires_date descending
  const infos = json.latest_receipt_info || [];
  infos.sort((a, b) => Number(b.expires_date_ms) - Number(a.expires_date_ms));
  return infos[0] || null;
}

// ---------------------------------------------------------------------------
// validateAppleReceipt — called from the app after a purchase
// ---------------------------------------------------------------------------
exports.validateAppleReceipt = functions.runWith({secrets: ["APPLE_SHARED_SECRET"]}).https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

  const receiptData = data?.receiptData;
  if (!receiptData || typeof receiptData !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "receiptData is required.");
  }
  const clientProductId = data?.productId || null;
  console.log("validateAppleReceipt: received productId from client:", clientProductId);

  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) throw new functions.https.HttpsError("failed-precondition", "Apple shared secret not configured.");

  try {
    const latestInfo = await verifyAppleReceipt(receiptData, sharedSecret);
    if (!latestInfo) throw new Error("No receipt info returned by Apple.");

    // Xcode StoreKit Configuration File produces JWS receipts that Apple's legacy
    // /verifyReceipt endpoint cannot parse (status 21002). Grant a 1-year test subscription.
    if (latestInfo._xcodeTestReceipt) {
      console.log("validateAppleReceipt: Xcode test receipt detected — granting test subscription for uid:", uid, "productId:", clientProductId);
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await upsertSubscription(uid, {
        isActive: true,
        productId: clientProductId || "vaulted_premium_annual",
        expiresAt,
        platform: "ios",
        isTest: true,
      });
      return {success: true, isActive: true, expiresAt: expiresAt.toISOString(), isTest: true};
    }

    if (latestInfo.bundle_id && latestInfo.bundle_id !== BUNDLE_ID) {
      throw new Error(`Bundle ID mismatch: expected ${BUNDLE_ID}, got ${latestInfo.bundle_id}`);
    }

    const expiresAt = new Date(Number(latestInfo.expires_date_ms));
    const isActive = expiresAt > new Date();

    await upsertSubscription(uid, {
      isActive,
      productId: latestInfo.product_id,
      expiresAt,
      platform: "ios",
      originalTransactionId: latestInfo.original_transaction_id,
    });

    return {success: true, isActive, expiresAt: expiresAt.toISOString()};
  } catch (err) {
    console.error("validateAppleReceipt error:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// ---------------------------------------------------------------------------
// validateGooglePurchase — called from the app after a purchase
// Requires a Google service account JSON stored as GOOGLE_SERVICE_ACCOUNT secret
// ---------------------------------------------------------------------------
exports.validateGooglePurchase = functions.runWith({secrets: ["GOOGLE_SERVICE_ACCOUNT"]}).https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

  const {purchaseToken, productId} = data || {};
  if (!purchaseToken || !productId) {
    throw new functions.https.HttpsError("invalid-argument", "purchaseToken and productId are required.");
  }

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) throw new functions.https.HttpsError("failed-precondition", "Google service account not configured.");

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidpublisher = google.androidpublisher({version: "v3", auth});
    const packageName = serviceAccount.project_id || "com.vaultapp"; // fallback
    const response = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });

    const purchase = response.data;
    const expiresAt = new Date(Number(purchase.expiryTimeMillis));
    const isActive = purchase.paymentState === 1 && expiresAt > new Date();

    await upsertSubscription(uid, {
      isActive,
      productId,
      expiresAt,
      platform: "android",
      originalTransactionId: purchaseToken,
    });

    return {success: true, isActive, expiresAt: expiresAt.toISOString()};
  } catch (err) {
    console.error("validateGooglePurchase error:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// ---------------------------------------------------------------------------
// handleAppleWebhook — Apple App Store Server Notifications (HTTP endpoint)
// Set this URL in App Store Connect → App → Subscriptions → Server URL
// ---------------------------------------------------------------------------
exports.handleAppleWebhook = functions.runWith({secrets: ["APPLE_SHARED_SECRET"]}).https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) {
    console.error("APPLE_SHARED_SECRET not configured");
    res.status(500).send("Server misconfiguration");
    return;
  }

  try {
    const payload = req.body;
    const notificationType = payload.notification_type;
    const unifiedReceipt = payload.unified_receipt;
    const latestReceiptInfo = unifiedReceipt?.latest_receipt_info || [];
    latestReceiptInfo.sort((a, b) => Number(b.expires_date_ms) - Number(a.expires_date_ms));
    const latest = latestReceiptInfo[0];

    if (!latest) {
      console.warn("Apple webhook: no receipt info", notificationType);
      res.status(200).send("OK");
      return;
    }

    // Find the user by originalTransactionId
    const originalTxId = latest.original_transaction_id;
    const snap = await db.collection("subscriptions")
      .where("originalTransactionId", "==", originalTxId)
      .limit(1)
      .get();

    if (snap.empty) {
      console.warn("Apple webhook: no user found for transaction", originalTxId);
      res.status(200).send("OK");
      return;
    }

    const uid = snap.docs[0].id;
    const expiresAt = new Date(Number(latest.expires_date_ms));
    const cancelledAt = latest.cancellation_date_ms ? new Date(Number(latest.cancellation_date_ms)) : null;
    const isActive = !cancelledAt && expiresAt > new Date();

    await upsertSubscription(uid, {
      isActive,
      productId: latest.product_id,
      expiresAt,
      platform: "ios",
      originalTransactionId: originalTxId,
    });

    console.log(`Apple webhook [${notificationType}] uid=${uid} isActive=${isActive}`);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Apple webhook error:", err);
    res.status(500).send("Internal error");
  }
});

// ---------------------------------------------------------------------------
// handleGoogleWebhook — Google Play RTDN via Pub/Sub
// Set up a Pub/Sub subscription in Google Cloud Console pointing to this function
// ---------------------------------------------------------------------------
exports.handleGoogleWebhook = functions.runWith({secrets: ["GOOGLE_SERVICE_ACCOUNT"]}).pubsub
  .topic("play-billing-notifications")
  .onPublish(async (message) => {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      console.error("GOOGLE_SERVICE_ACCOUNT not configured");
      return;
    }

    try {
      const data = message.json;
      const {subscriptionNotification, packageName} = data;
      if (!subscriptionNotification) return;

      const {purchaseToken, subscriptionId, notificationType} = subscriptionNotification;
      // notificationType 1 = SUBSCRIPTION_RECOVERED
      // notificationType 2 = SUBSCRIPTION_RENEWED
      // notificationType 3 = SUBSCRIPTION_CANCELED
      // notificationType 4 = SUBSCRIPTION_PURCHASED
      // notificationType 13 = SUBSCRIPTION_EXPIRED

      const serviceAccount = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });
      const androidpublisher = google.androidpublisher({version: "v3", auth});
      const response = await androidpublisher.purchases.subscriptions.get({
        packageName: packageName || serviceAccount.project_id,
        subscriptionId,
        token: purchaseToken,
      });

      const purchase = response.data;
      const expiresAt = new Date(Number(purchase.expiryTimeMillis));
      const isActive = purchase.paymentState === 1 && expiresAt > new Date();

      // Look up user by purchaseToken
      const snap = await db.collection("subscriptions")
        .where("originalTransactionId", "==", purchaseToken)
        .limit(1)
        .get();

      if (snap.empty) {
        console.warn("Google webhook: no user found for token", purchaseToken);
        return;
      }

      const uid = snap.docs[0].id;
      await upsertSubscription(uid, {
        isActive,
        productId: subscriptionId,
        expiresAt,
        platform: "android",
        originalTransactionId: purchaseToken,
      });

      console.log(`Google webhook [type=${notificationType}] uid=${uid} isActive=${isActive}`);
    } catch (err) {
      console.error("Google webhook error:", err);
    }
  });

// ---------------------------------------------------------------------------
// getSubscriptionStatus — called on app launch to sync status
// ---------------------------------------------------------------------------
exports.getSubscriptionStatus = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

  const doc = await db.collection("subscriptions").doc(uid).get();
  if (!doc.exists) return {isActive: false};

  const d = doc.data();
  const expiresAt = d.expiresAt?.toDate();
  const isActive = d.isActive === true && (expiresAt ? expiresAt > new Date() : false);

  // Auto-heal: if Firestore says active but expiry passed, mark inactive
  if (d.isActive && !isActive) {
    await db.collection("subscriptions").doc(uid).update({isActive: false});
  }

  return {
    isActive,
    productId: d.productId || null,
    expiresAt: expiresAt?.toISOString() || null,
    platform: d.platform || null,
  };
});

// ===========================================================================
// END SUBSCRIPTION FUNCTIONS
// ===========================================================================

/**
 * Helper function to extract style ID from product title
 */
function extractStyleId(title) {
  if (!title) return undefined;
  
  // Look for patterns like: Style: XXX-XXX, SKU: XXX, Style ID: XXX
  const stylePatterns = [
    /style[:\s]+([A-Z0-9-]+)/i,
    /sku[:\s]+([A-Z0-9-]+)/i,
    /style\s*id[:\s]+([A-Z0-9-]+)/i,
  ];

  for (const pattern of stylePatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Helper function to download image from URL and upload to Firebase Storage
 * @param {string} imageUrl - The image URL to download
 * @param {string} userId - The user ID to organize the storage path
 * @returns {Promise<string|undefined>} Firebase Storage URL or undefined if upload fails
 */
async function downloadAndUploadImageToStorage(imageUrl, userId) {
  try {
    if (!imageUrl || !userId) {
      console.warn('Missing imageUrl or userId');
      return undefined;
    }

    // Clean the image URL (remove trailing quotes if any)
    const cleanImageUrl = imageUrl.trim().replace(/['"]+$/, '').replace(/^['"]+/, '');
    
    console.log(`Downloading image from URL: ${cleanImageUrl}`);
    
    // Download the image
    const response = await fetch(cleanImageUrl);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status} ${response.statusText}`);
      return undefined;
    }

    // Get the image as buffer (node-fetch v3 uses arrayBuffer)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Check file size (8MB limit)
    const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
    if (buffer.length > MAX_IMAGE_BYTES) {
      console.warn(`Image too large: ${buffer.length} bytes`);
      return undefined;
    }

    // Get content type from response or default to jpeg
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Generate storage path
    const timestamp = Date.now();
    const fileName = `barcode_image_${timestamp}.jpg`;
    const storagePath = `inventory/${userId}/${timestamp}_${fileName}`;

    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    // Upload the image
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
      },
    });

    // Make the file publicly accessible (matches existing pattern in client code)
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    
    console.log(`Image uploaded to Firebase Storage: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Error downloading and uploading image to Storage:', error);
    return undefined;
  }
}
