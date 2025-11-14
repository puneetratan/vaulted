// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");

// node-fetch v3 is ESM-only. Use dynamic import:
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

admin.initializeApp();
const db = admin.firestore();

exports.exportInventoryToExcel = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
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

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "puneetratan83@gmail.com",
        pass: ""
        
      },
    });

    const mailOptions = {
      from: "puneetratan83@gmail.com",
      to: "puneetsiet@gmail.com",
      subject: "Your Inventory Export",
      text: "Attached is your exported inventory report.",
      attachments: [
        {
          filename: `inventory_${Date.now()}.xlsx`,
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
