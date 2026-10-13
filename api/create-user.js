const admin = require("firebase-admin");

// ─── تهيئة Firebase Admin (مرة واحدة) ───
let adminInitialized = false;
function ensureAdmin() {
  if (adminInitialized) return;
  if (admin.apps.length > 0) {
    adminInitialized = true;
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
  }

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
    email, password, username, name, role,
    ageCategory, team, points, parentUid,
  } = req.body || {};

  if (!email || !password || !name || !role) {
    return res.status(400).json({
      error: "Missing required fields: email, password, name, role",
    });
  }

  try {
    ensureAdmin();

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const userData = {
      uid: userRecord.uid,
      email,
      username: username || null,
      name,
      role,
      createdAt: new Date(),
    };

    if (role === "swimmer") {
      userData.ageCategory = ageCategory || null;
      userData.team = team || null;
      userData.points = points || 0;
      userData.parentUid = parentUid || null;
    }

    if (role === "parent" && parentUid) {
      userData.swimmerUid = parentUid;
    }

    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error:", error);

    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    }
    if (error.code === "auth/invalid-password") {
      return res.status(400).json({ error: "كلمة المرور ضعيفة جداً (6 أحرف على الأقل)" });
    }

    return res.status(500).json({
      error: error.message || "خطأ في إنشاء المستخدم",
    });
  }
};