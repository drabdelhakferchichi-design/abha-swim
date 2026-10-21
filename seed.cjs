const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const sa = require("./serviceAccountKey.json");

const app = initializeApp({
  credential: cert(sa),
});

const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  console.log("🔍 البحث عن مستخدمين يحتاجون تفعيل...\n");

  const snapshot = await db
    .collection("users")
    .where("needsAuthAccount", "==", true)
    .get();

  if (snapshot.empty) {
    console.log("✅ لا يوجد مستخدمون يحتاجون تفعيل !");
    process.exit(0);
  }

  console.log(`📋 وجد ${snapshot.size} مستخدم(ين)\n`);

  let ok = 0;
  let fail = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const oldUid = docSnap.id;
    const username = data.username || "";
    const password = data.tempPassword || "Abha2026";
    const email = data.email || `${username}@abha-swim.local`;
    const name = data.name || username;

    console.log(`\n👤 ${name} (${username})`);

    try {
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });

      console.log(`   ✅ Auth : ${userRecord.uid}`);

      const newData = { ...data, uid: userRecord.uid, needsAuthAccount: false };
      delete newData.tempPassword;

      await db.collection("users").doc(userRecord.uid).set(newData);
      console.log(`   ✅ Firestore`);

      if (data.swimmerId) {
        await db.collection("swimmers").doc(data.swimmerId).update({
          parentUid: userRecord.uid,
        });
        console.log(`   ✅ Swimmer`);
      }

      if (oldUid !== userRecord.uid) {
        await db.collection("users").doc(oldUid).delete();
        console.log(`   🗑️  Old deleted`);
      }

      ok++;
    } catch (err) {
      console.error(`   ❌ ${err.message}`);
      fail++;
    }
  }

  console.log(`\n✅ نجح : ${ok}  |  ❌ فشل : ${fail}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("خطأ :", err);
  process.exit(1);
});