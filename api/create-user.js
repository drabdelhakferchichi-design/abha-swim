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
    // بيانات ولي الأمر (الحساب)
    username,
    password,
    email,          // اختياري
    parentName,

    // بيانات السباح
    swimmerName,
    ageCategory,
    team,
    points,
    coachId,        // UID المدرب (حسن أو علاء)
    coachName,
  } = req.body || {};

  // ─── تحقق ───
  if (!username || !password || !parentName || !swimmerName || !coachId) {
    return res.status(400).json({
      error: "حقول مطلوبة ناقصة: username, password, parentName, swimmerName, coachId",
    });
  }

  try {
    ensureAdmin();
    const db = admin.firestore();

    // ─── 1. إنشاء حساب Firebase Auth لولي الأمر ───
    // نستخدم username كإيميل داخلي
    const authEmail = email && email.trim() !== ""
      ? email.trim()
      : `${username}@abha-swim.local`;

    const parentRecord = await admin.auth().createUser({
      email: authEmail,
      password,
      displayName: parentName,
    });

    // ─── 2. إنشاء وثيقة السباح في Firestore ───
    const swimmerRef = db.collection("swimmers").doc();
    const swimmerData = {
      name: swimmerName,
      ageCategory: ageCategory || "",
      team: team || "",
      points: points || 0,
      coachId,
      coachName: coachName || "",
      parentUid: parentRecord.uid,
      parentName,
      createdAt: new Date(),
    };
    await swimmerRef.set(swimmerData);

    // ─── 3. إنشاء وثيقة ولي الأمر في Firestore ───
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

    return res.status(200).json({
      success: true,
      parentUid: parentRecord.uid,
      swimmerId: swimmerRef.id,
      message: "تم إنشاء الحساب والسباح بنجاح",
    });

  } catch (error) {
    console.error("Error:", error);

    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ error: "اسم المستخدم أو الإيميل مستخدم بالفعل" });
    }
    if (error.code === "auth/invalid-password") {
      return res.status(400).json({ error: "كلمة المرور ضعيفة (6 أحرف على الأقل)" });
    }

    return res.status(500).json({
      error: error.message || "خطأ في إنشاء الحساب",
    });
  }
};