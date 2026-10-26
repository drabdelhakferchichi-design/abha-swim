const admin = require("firebase-admin");

let adminInitialized = false;
function ensureAdmin() {
  if (adminInitialized) return;
  if (admin.apps.length > 0) {
    adminInitialized = true;
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  adminInitialized = true;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid } = req.body || {};

  if (!uid) {
    return res.status(400).json({ error: "UID مطلوب" });
  }

  try {
    ensureAdmin();
    const db = admin.firestore();

    // 1. حذف من Firestore أولاً
    try {
      // إزالة parentUid من السباح المرتبط
      const swimmerSnap = await db
        .collection("swimmers")
        .where("parentUid", "==", uid)
        .get();
      
      for (const docSnap of swimmerSnap.docs) {
        await docSnap.ref.update({
          parentUid: "",
          parentName: "",
        });
      }

      // حذف وثيقة ولي الأمر
      await db.collection("users").doc(uid).delete();
      console.log("✅ Firestore deleted");
    } catch (dbErr) {
      console.error("Firestore delete error:", dbErr);
      // نكمل على أي حال — ربما الوثيقة غير موجودة
    }

    // 2. حذف من Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
      console.log("✅ Auth deleted");
    } catch (authErr) {
      // إذا لم يكن موجوداً في Auth — نتجاهل
      if (authErr.code === "auth/user-not-found") {
        console.log("Auth user not found (already deleted)");
      } else {
        throw authErr;
      }
    }

    return res.status(200).json({
      success: true,
      message: "تم حذف الحساب من كل مكان",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message || "خطأ في الحذف",
    });
  }
};