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

  const {
    username,
    password,
    email,
    parentName,
    swimmerName,
    ageCategory,
    team,
    points,
    coachId,
    coachName,
  } = req.body || {};

  // ─── DEBUG ───
  console.log("=== DEBUG INFO ===");
  console.log("ENV exists:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("ENV length:", process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0);
  console.log("Body:", { username, parentName, swimmerName, coachId, hasPass: !!password });

  if (!username || !password || !parentName || !swimmerName || !coachId) {
    return res.status(400).json({
      error: "حقول مطلوبة ناقصة",
      received: { username, parentName, swimmerName, coachId, hasPass: !!password },
    });
  }

  try {
    ensureAdmin();
    const db = admin.firestore();

    const authEmail = email && email.trim() !== ""
      ? email.trim()
      : `${username}@abha-swim.local`;

    const parentRecord = await admin.auth().createUser({
      email: authEmail,
      password,
      displayName: parentName,
    });

    const swimmerRef = db.collection("swimmers").doc();
    await swimmerRef.set({
      name: swimmerName,
      ageCategory: ageCategory || "",
      team: team || "",
      points: points || 0,
      coachId,
      coachName: coachName || "",
      parentUid: parentRecord.uid,
      parentName,
      createdAt: new Date(),
    });

    await db.collection("users").doc(parentRecord.uid).set({
      uid: parentRecord.uid,
      username,
      email: email && email.trim() !== "" ? email.trim() : null,
      name: parentName,
      role: "parent",
      swimmerId: swimmerRef.id,
      swimmerName,
      coachId,
      mustChangePassword: true,
      createdAt: new Date(),
    });

    console.log("=== SUCCESS ===");
    return res.status(200).json({
      success: true,
      parentUid: parentRecord.uid,
      swimmerId: swimmerRef.id,
      message: "تم إنشاء الحساب والسباح بنجاح",
    });

  } catch (error) {
    console.error("=== ERROR ===");
    console.error("Message:", error.message);
    console.error("Code:", error.code);

    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ error: "اسم المستخدم أو الإيميل مستخدم بالفعل" });
    }
    if (error.code === "auth/invalid-password") {
      return res.status(400).json({ error: "كلمة المرور ضعيفة (6 أحرف على الأقل)" });
    }

    return res.status(500).json({
      error: error.message || "خطأ في إنشاء الحساب",
      code: error.code || null,
    });
  }
};