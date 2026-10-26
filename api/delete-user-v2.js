const admin = require("firebase-admin");

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
  try {
    return JSON.parse(raw);
  } catch (e) {
    const fixed = raw.replace(/\n/g, "\\n");
    return JSON.parse(fixed);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID مطلوب" });

  try {
    if (!admin.apps.length) {
      const sa = getServiceAccount();
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    }
    const db = admin.firestore();

    try {
      const snap = await db.collection("swimmers").where("parentUid", "==", uid).get();
      for (const d of snap.docs) {
        await d.ref.update({ parentUid: "", parentName: "" });
      }
      await db.collection("users").doc(uid).delete();
    } catch (dbErr) { console.error("Firestore:", dbErr); }

    try {
      await admin.auth().deleteUser(uid);
    } catch (authErr) {
      if (authErr.code !== "auth/user-not-found") throw authErr;
    }

    return res.status(200).json({ success: true, message: "تم الحذف" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message || "خطأ" });
  }
};