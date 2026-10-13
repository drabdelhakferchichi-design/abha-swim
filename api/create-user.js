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

  // ─── DEBUG LOGGING ───
  console.log("=== DEBUG INFO ===");
  console.log("ENV exists:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("ENV length:", process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0);
  console.log("Received body:", {
    username,
    password: password ? `${password.length} chars` : "MISSING",
    email,
    parentName,
    swimmerName,
    ageCategory,
    team,
    points,
    coachId,
    coachName,
  });

  // ─── تحقق ───
  if (!username || !password || !parentName || !swimmerName || !coachId) {
    console.log("Validation failed - missing fields");
    return res.status(400).json({
      error: "حقول مطلوبة ناقصة: username, password, parentName, swimmerName, coachId",
      received: { username, parentName, swimmerName, coachId, hasPassword: !!password },
    });
  }

  try {
    console.log("Step 1: Initializing admin...");
    ensureAdmin();
    console.log("Step 1: OK");

    const db = admin.firestore();

    // ─── 1. إنشاء حساب Firebase Auth لولي الأمر ───
    console.log("Step 2: Creating parent Auth account...");
    const authEmail = email && email.trim() !== ""
      ? email.trim()
      : `${username}@abha-swim.local`;

    const parentRecord = await admin.auth().createUser({
      email: authEmail,
      password,
      displayName: parentName,
    });
    console.log("Step 2: OK - UID:", parentRecord.uid);

    // ─── 2. إنشاء وثيقة السباح ───
    console.log("Step 3: Creating swimmer document...");
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
    console.log("Step 3: OK - ID:", swimmerRef.id);

    // ─── 3. إنشاء وثيقة ولي الأمر ───
    console.log("Step 4: Creating parent Firestore doc...");
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
    console.log("Step 4: OK");

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
    console.error("Stack:", error.stack);

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