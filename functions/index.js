// functions/index.js
require("dotenv").config();
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");
// const { onCall } = require("firebase-functions/v2/https");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// node-fetch v3 is ESM-only. Use dynamic import:
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

admin.initializeApp();
const db = admin.firestore();

exports.exportInventoryToExcel = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  const userEmail = context.auth?.token?.email;

  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  if (!userEmail) {
    throw new functions.https.HttpsError("unauthenticated", "User email not found.");
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
      { header: "Name", key: "name", width: 35 },
      { header: "Size", key: "size", width: 5 },
      { header: "Color", key: "color", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Release Date", key: "releaseDate", width: 15 },
      { header: "Brand", key: "brand", width: 15 },
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
        name,
        size,
        color,
        quantity,
        releaseDate,
        brand,
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
            tl: { col: 7, row: rowIndex - 1 },
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
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Your Inventory Export - Vaulted",
      text: `Hello,\n\nAttached is your exported inventory report from Vaulted.\n\nThis export includes all your items with images and details.\n\nBest regards,\nThe Vaulted Team`,
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

exports.analyzeShoeMetadata = functions.https.onCall(async (data, context) => {
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
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "These are shoe images. For each image, extract the following fields:\n" +
                "- Brand\n" +
                "- Model\n" +
                "- Name\n" +
                "- Size\n" +
                "- Color\n" +
                "- Release Date\n" +
                "- Retail Value\n" +
                "- StyleId\n" +
                "- Silhouette\n" +
                "- Condition (New / Like New / Used)\n" +
                "- Any flaws or damage\n" +
                "- Estimated resale value range (USD)\n" +
                "Return a JSON array with one object per image, maintaining order.",
            },
            ...imageUris.map((url) => ({
              type: "image_url",
              image_url: { url: url }
            })),
          ],
        },
      ],
    });

    let metadataContent = aiResponse.choices[0]?.message?.content;
    let metadata = metadataContent;
    if (typeof metadataContent === "string") {
      const tryParse = (text) => {
        try {
          return JSON.parse(text);
        } catch (err) {
          return null;
        }
      };

      let cleaned = metadataContent.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      }

      metadata = tryParse(cleaned);
      
      if (!metadata) {
        const firstBracket = cleaned.indexOf("[");
        const lastBracket = cleaned.lastIndexOf("]");
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          const possibleJson = cleaned.slice(firstBracket, lastBracket + 1);
          metadata = tryParse(possibleJson);
        }
      }

      if (!metadata) {
        throw new Error("Unable to parse AI metadata response.");
      }
    }

    if (!Array.isArray(metadata)) {
      throw new Error("Metadata response is not an array.");
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

    persistMetadataDocs(docsToSave).catch((err) => {
      console.error("Failed to persist AI metadata docs:", err);
    });

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
exports.lookupbarcode = functions.https.onCall(async (data, context) => {
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
