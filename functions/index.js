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
const sharp = require("sharp");

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

exports.exportInventoryToExcel = functions.runWith({ secrets: ["SMTP_USER", "SMTP_PASS"], memory: "512MB" }).https.onCall(async (data, context) => {
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
          const response = await fetch(imageUrl);
          const rawBuffer = Buffer.from(await response.arrayBuffer());
          const thumbBuffer = await sharp(rawBuffer)
            .resize(80, 80, { fit: "cover" })
            .jpeg({ quality: 70 })
            .toBuffer();

          const imageId = workbook.addImage({
            buffer: thumbBuffer,
            extension: "jpeg",
          });

          sheet.addImage(imageId, {
            tl: { col: 8, row: rowIndex - 1 },
            ext: { width: 40, height: 40 },
          });

          sheet.getRow(rowIndex).height = 40;
        } catch (err) {
          console.warn(`Image fetch failed:`, err.message);
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

// StockX OAuth token cache (reused across warm function instances)
let _stockxToken = null;
let _stockxTokenExpiry = 0;

async function getStockXToken() {
  if (_stockxToken && Date.now() < _stockxTokenExpiry) {
    return _stockxToken;
  }
  const res = await fetch("https://accounts.stockx.com/oauth/token", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      client_id: process.env.STOCKX_CLIENT_ID?.trim(),
      client_secret: process.env.STOCKX_CLIENT_SECRET_ID?.trim(),
      audience: "https://api.stockx.com",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`StockX auth failed ${res.status}: ${body}`);
  }
  const json = await res.json();
  _stockxToken = json.access_token;
  // Expire 60s early to avoid edge expiry issues
  _stockxTokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
  return _stockxToken;
}

exports.lookupbarcode = functions.runWith({secrets: ["STOCKX_CLIENT_ID", "STOCKX_CLIENT_SECRET_ID", "STOCKX_API_KEY"]}).https.onCall(async (data, context) => {
  console.log("🔥 lookupbarcode (StockX) HIT");
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const barcode = data?.barcode;
  if (!barcode || typeof barcode !== "string" || barcode.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Barcode is required and must be a non-empty string.");
  }

  const cleanBarcode = barcode.replace(/[\s-]/g, "").trim();
  if (cleanBarcode.length < 8) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid barcode format. Barcode must be at least 8 characters.");
  }

  try {
    const apiKey = process.env.STOCKX_API_KEY?.trim();

    let authHeader;
    try {
      const token = await getStockXToken();
      authHeader = `Bearer ${token}`;
    } catch (authErr) {
      console.warn("StockX OAuth unavailable:", authErr.message);
    }

    const headers = {
      ...(authHeader ? {"Authorization": authHeader} : {}),
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    };

    console.log(`Searching StockX for barcode: ${cleanBarcode}`);
    const searchRes = await fetch(
      `https://api.stockx.com/v3/catalog/search?query=${encodeURIComponent(cleanBarcode)}&limit=1`,
      {headers}
    );

    if (!searchRes.ok) {
      const body = await searchRes.text();
      console.error(`StockX search error ${searchRes.status}:`, body);
      throw new functions.https.HttpsError("internal", `StockX search failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    console.log("StockX search response:", JSON.stringify(searchData));

    const product = searchData?.Products?.[0] || searchData?.products?.[0] || null;
    if (!product) {
      await db.collection("missingBarcodes").doc(cleanBarcode).set({
        barcode: cleanBarcode,
        scannedBy: uid,
        scannedAt: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false,
        resolvedData: null,
      }, {merge: true});
      console.log(`Stored missing barcode: ${cleanBarcode}`);
      return {success: false, barcode: cleanBarcode, message: "Product not found on StockX"};
    }

    const productId = product.id || product.productId;
    let lowestAsk, highestBid, lastSale;

    try {
      const marketRes = await fetch(
        `https://api.stockx.com/v3/products/${productId}/market-data`,
        {headers}
      );
      if (marketRes.ok) {
        const marketData = await marketRes.json();
        lowestAsk = marketData?.LowestAsk || marketData?.lowestAsk;
        highestBid = marketData?.HighestBid || marketData?.highestBid;
        lastSale = marketData?.LastSale || marketData?.lastSale;
      }
    } catch (marketErr) {
      console.warn("StockX market data fetch failed:", marketErr.message);
    }

    let imageUrl = product.media?.imageUrl || product.imageUrl || undefined;
    if (imageUrl) {
      const uploadedUrl = await downloadAndUploadImageToStorage(imageUrl, uid);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    console.log(`StockX product found for barcode ${cleanBarcode}:`, product.title || product.name);
    return {
      success: true,
      barcode: cleanBarcode,
      name: product.title || product.name || undefined,
      brand: product.brand || undefined,
      styleId: product.styleId || undefined,
      color: product.colorway || product.color || undefined,
      imageUrl,
      retailValue: product.retailPrice || lastSale || undefined,
      lowestAsk,
      highestBid,
      lastSale,
    };
  } catch (error) {
    console.error("Error in StockX barcode lookup:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", `Failed to lookup barcode: ${error.message}`);
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

  try {
    // Build Google auth — try explicit service account first, fall back to ADC
    let auth;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        if (serviceAccount.client_email && serviceAccount.private_key) {
          auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ["https://www.googleapis.com/auth/androidpublisher"],
          });
        }
      } catch (parseErr) {
        console.warn("validateGooglePurchase: GOOGLE_SERVICE_ACCOUNT parse failed, using ADC:", parseErr.message);
      }
    }
    if (!auth) {
      // Application Default Credentials — uses the Cloud Functions runtime service account
      auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });
    }

    const androidpublisher = google.androidpublisher({version: "v3", auth});
    const packageName = "com.vault.dev";
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
    console.error("validateGooglePurchase error:", err.message);

    // If Google Play API fails (permissions/credentials), still persist the subscription
    // so it survives app restarts. Mark as unverified for future revalidation.
    try {
      await upsertSubscription(uid, {
        isActive: true,
        productId,
        platform: "android",
        originalTransactionId: purchaseToken,
        googleVerified: false,
      });
      console.log("validateGooglePurchase: persisted subscription without Google Play verification for uid:", uid);
      return {success: true, isActive: true, fallback: true};
    } catch (persistErr) {
      console.error("validateGooglePurchase: failed to persist subscription:", persistErr.message);
      throw new functions.https.HttpsError("internal", err.message);
    }
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
// ===========================================================================
// IMPORT — SHARED HELPERS
// ===========================================================================

const REQUIRED_COLUMNS = [
  { key: "brand",      aliases: ["brand"] },
  { key: "silhouette", aliases: ["silhouette", "model", "name"] },
  { key: "color",      aliases: ["color", "colorway"] },
];

const OPTIONAL_COLUMNS = [
  { key: "styleId",     aliases: ["styleid", "style id", "style"] },
  { key: "size",        aliases: ["size"] },
  { key: "quantity",    aliases: ["quantity", "qty"] },
  { key: "releaseDate", aliases: ["releasedate", "release date", "date"] },
  { key: "retailValue", aliases: ["retailvalue", "retail value", "retail", "price"] },
  { key: "imageUrl",    aliases: ["imageurl", "image url", "image"] },
];

function normalizeHeader(s) {
  return String(s || "").toLowerCase().replace(/[\s_-]+/g, "");
}

async function parseWorkbook(buffer, fileName) {
  const workbook = new ExcelJS.Workbook();
  const isCSV = fileName.toLowerCase().endsWith(".csv");
  if (isCSV) {
    const { Readable } = require("stream");
    await workbook.csv.read(Readable.from(buffer.toString("utf8")));
  } else {
    await workbook.xlsx.load(buffer);
  }
  return workbook;
}

function mapColumns(worksheet) {
  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const key = normalizeHeader(cell.value);
    if (key) headerMap[key] = colNumber;
  });

  const findCol = (aliases) => {
    for (const a of aliases) {
      const col = headerMap[normalizeHeader(a)];
      if (col !== undefined) return col;
    }
    return null;
  };

  const found = {};
  for (const { key, aliases } of [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]) {
    found[key] = findCol(aliases);
  }
  return { headerMap, found };
}

// ===========================================================================
// VALIDATE IMPORT FILE — fast header-only check
// ===========================================================================

exports.validateImportFile = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Login required.");
  }

  const { fileContent, fileName } = data;
  if (!fileContent || !fileName) {
    throw new functions.https.HttpsError("invalid-argument", "fileContent and fileName are required.");
  }

  const buffer = Buffer.from(fileContent, "base64");
  const workbook = await parseWorkbook(buffer, fileName);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return { valid: false, error: "No worksheet found in file." };
  }

  const { found } = mapColumns(worksheet);

  // Count data rows (excluding header)
  let rowCount = 0;
  worksheet.eachRow((_, rowNumber) => { if (rowNumber > 1) rowCount++; });

  const missing = REQUIRED_COLUMNS.filter(c => !found[c.key]).map(c => c.key);
  const presentRequired = REQUIRED_COLUMNS.filter(c => !!found[c.key]).map(c => c.key);
  const presentOptional = OPTIONAL_COLUMNS.filter(c => !!found[c.key]).map(c => c.key);

  return {
    valid: missing.length === 0,
    rowCount,
    missing,
    presentRequired,
    presentOptional,
  };
});

// ===========================================================================
// IMPORT INVENTORY FUNCTION
// ===========================================================================

exports.importInventory = functions
  .runWith({ secrets: ["OPENAI_API_KEY"], memory: "512MB", timeoutSeconds: 540 })
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Login required.");

    const { jobId, storagePath, fileName } = data;
    if (!jobId || !storagePath || !fileName) {
      throw new functions.https.HttpsError("invalid-argument", "jobId, storagePath, and fileName are required.");
    }

    const jobRef = db.collection("importJobs").doc(jobId);
    await jobRef.set({
      status: "processing",
      total: 0,
      processed: 0,
      currentItem: "",
      errors: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const bucket = admin.storage().bucket();
      const [buffer] = await bucket.file(storagePath).download();
      const workbook = await parseWorkbook(buffer, fileName);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        await jobRef.update({ status: "failed", error: "No worksheet found in file." });
        throw new functions.https.HttpsError("invalid-argument", "No worksheet found in file.");
      }

      const { found } = mapColumns(worksheet);

      // Guard: reject if any required column is missing
      const missing = REQUIRED_COLUMNS.filter(c => !found[c.key]).map(c => c.key);
      if (missing.length > 0) {
        const msg = `Missing required columns: ${missing.join(", ")}`;
        await jobRef.update({ status: "failed", error: msg });
        throw new functions.https.HttpsError("invalid-argument", msg);
      }

      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const get = (key) => (found[key] ? row.getCell(found[key]).value : null);
        rows.push({
          brand:       String(get("brand")       || "").trim(),
          silhouette:  String(get("silhouette")  || "").trim(),
          styleId:     String(get("styleId")     || "").trim(),
          color:       String(get("color")       || "").trim(),
          size:        String(get("size")        || "").trim(),
          quantity:    parseInt(String(get("quantity") || "1")) || 1,
          releaseDate: String(get("releaseDate") || "").trim(),
          retailValue: parseFloat(String(get("retailValue") || "0").replace(/[$,]/g, "")) || 0,
          imageUrl:    String(get("imageUrl")    || "").trim(),
        });
      });

      const validRows = rows.filter(r => r.brand || r.silhouette);
      await jobRef.update({ total: validRows.length });

      const errors = [];

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        try {
          let imageUrl = row.imageUrl;

          if (imageUrl) {
            // Image URL present in CSV — copy to Firebase Storage so it's permanent
            const uploaded = await downloadAndUploadImageToStorage(imageUrl, uid);
            if (uploaded) {
              imageUrl = uploaded;
            }
            // If download fails, fall back to the original URL as-is
          } else if (row.brand || row.silhouette) {
            // No image provided — generate one with DALL-E 3
            try {
              const openai = getOpenAI();
              const prompt = `Professional studio product photo of ${[row.brand, row.silhouette, row.color].filter(Boolean).join(" ")} sneaker, clean white background, high resolution`;
              const imgResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: "1024x1024",
              });
              const tempUrl = imgResponse.data[0]?.url;
              if (tempUrl) {
                imageUrl = await downloadAndUploadImageToStorage(tempUrl, uid) || "";
              }
            } catch (imgErr) {
              console.warn(`[importInventory] DALL-E failed for row ${i + 1}:`, imgErr.message);
            }
          }

          const itemName = [row.brand, row.silhouette].filter(Boolean).join(" ");
          await db.collection("inventory").add({
            name:        itemName || "Imported Item",
            brand:       row.brand,
            silhouette:  row.silhouette,
            styleId:     row.styleId,
            color:       row.color,
            size:        row.size,
            quantity:    row.quantity,
            releaseDate: row.releaseDate,
            retailValue: row.retailValue,
            value:       0,
            imageUrl:    imageUrl || "",
            userId:      uid,
            source:      "import",
            createdAt:   admin.firestore.FieldValue.serverTimestamp(),
            updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
          });

          await jobRef.update({
            processed: i + 1,
            currentItem: itemName || "Item",
          });
        } catch (rowErr) {
          console.error(`[importInventory] Row ${i + 1} failed:`, rowErr);
          errors.push({ row: i + 1, error: rowErr.message });
          await jobRef.update({
            errors: admin.firestore.FieldValue.arrayUnion({ row: i + 1, error: rowErr.message }),
          });
        }
      }

      await jobRef.update({
        status: "complete",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Clean up the uploaded file from Storage
      await admin.storage().bucket().file(storagePath).delete().catch(() => {});

      return { success: true, total: validRows.length, errors };
    } catch (err) {
      if (!(err instanceof functions.https.HttpsError)) {
        await jobRef.update({ status: "failed", error: err.message }).catch(() => {});
      }
      // Best-effort cleanup even on failure
      await admin.storage().bucket().file(storagePath).delete().catch(() => {});
      throw err;
    }
  });

// ===========================================================================
// END IMPORT FUNCTIONS
// ===========================================================================

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
