// scripts/create-accounts.js
// يستخدم Firebase Admin SDK المحلي
// لإنشاء حسابات Auth لكل من needsAuthAccount: true

const admin = require("firebase-admin");
const path = require("path");

// ─── تهيئة Firebase Admin ───
const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function createAllAccounts() {
  console.log("🔍 البحث عن مستخدمين يحتاجون تفعيل...\n");

  const usersRef = db.collection("users");
  const snapshot = await usersRef.where("needsAuthAccount", "==", true).get();

  if (snapshot.empty) {
    console.log("✅ لا يوجد مستخدمون يحتاجون تفعيل !");
    process.exit(0);
  }

  console.log(`📋 وجد ${snapshot.size} مستخدم(ين) يحتاجون تفعيل\n`);
  console.log("─".repeat(60));

  let successCount = 0;
  let errorCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const oldUid = docSnap.id;
    const username = data.username || "";
    const password = data.tempPassword || "Abha2026";
    const email = data.email || `${username}@abha-swim.local`;
    const name = data.name || username;

    console.log(`\n👤 معالجة : ${name} (${username})`);

    try {
      // 1. إنشاء حساب Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      console.log(`   ✅ Auth created : ${userRecord.uid}`);

      // 2. نسخ الوثيقة إلى UID الجديد
      const newData = {
        ...data,
        uid: userRecord.uid,
        needsAuthAccount: false, // ✅ تم التفعيل
        authUid: userRecord.uid,
        activatedAt: new Date(),
      };
      delete newData.tempPassword; // حذف كلمة المرور المؤقتة

      await db.collection("users").doc(userRecord.uid).set(newData);
      console.log(`   ✅ Firestore : ${userRecord.uid}`);

      // 3. تحديث السباح (إن وجد) بـ parentUid الجديد
      if (data.swimmerId) {
        await db.collection("swimmers").doc(data.swimmerId).update({
          parentUid: userRecord.uid,
        });
        console.log(`   ✅ Swimmer updated`);
      }

      // 4. حذف الوثيقة القديمة
      if (oldUid !== userRecord.uid) {
        await db.collection("users").doc(oldUid).delete();
        console.log(`   🗑️  Deleted old: ${oldUid}`);
      }

      successCount++;
    } catch (err) {
      console.error(`   ❌ خطأ : ${err.message}`);
      if (err.code === "auth/email-already-exists") {
        console.error(`   💡 الحساب موجود مسبقاً في Auth`);
      }
      errorCount++;
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`✅ نجح : ${successCount}`);
  console.log(`❌ فشل : ${errorCount}`);
  console.log("═".repeat(60));

  process.exit(0);
}

createAllAccounts().catch((err) => {
  console.error("❌ خطأ عام :", err);
  process.exit(1);
});