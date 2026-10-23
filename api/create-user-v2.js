const admin = require("firebase-admin");

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT missing in Vercel");
  
  // محاولة قراءة المفتاح
  try {
    return JSON.parse(raw);
  } catch (e) {
    // إذا فشل، ربما هناك أسطر حقيقية بدل \n
    const fixed = raw.replace(/\n/g, "\\n");
    return JSON.parse(fixed);
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ✅ تحقق من البيانات
  const { username, password, parentName, swimmerName, coachId, coachName } = req.body || {};
  
  if (!username || !password || !parentName || !swimmerName || !coachId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // ✅ التهيئة
    if (!admin.apps.length) {
      const sa = getServiceAccount();
      admin.initializeApp({
        credential: admin.credential.cert(sa),
      });
    }

    const db = admin.firestore();
    const authEmail = `${username}@abha-swim.local`;

    // 1. إنشاء حساب Auth
    const parentRecord = await admin.auth().createUser({
      email: authEmail,
      password: password,
      displayName: parentName,
    });

    // 2. حفظ السباح
    const swimmerRef = db.collection("swimmers").doc();
    await swimmerRef.set({
      name: swimmerName,
      coachId: coachId,
      coachName: coachName || "",
      parentUid: parentRecord.uid,
      parentName: parentName,
      createdAt: new Date(),
    });

    // 3. حفظ ولي الأمر
    await db.collection("users").doc(parentRecord.uid).set({
      uid: parentRecord.uid,
      username: username,
      name: parentName,
      role: "parent",
      swimmerId: swimmerRef.id,
      swimmerName: swimmerName,
      coachId: coachId,
      needsAuthAccount: false, // ✅ تم التفعيل
      createdAt: new Date(),
    });

    // 4. تحديث السباح بربط ولي الأمر
    await swimmerRef.update({
      parentUid: parentRecord.uid
    });

    return res.status(200).json({
      success: true,
      message: "✅ Account created successfully",
      parentUid: parentRecord.uid,
    });

  } catch (error) {
    console.error("=== ERROR ===", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      code: error.code || null,
    });
  }
};