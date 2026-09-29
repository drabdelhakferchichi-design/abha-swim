import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ─── تهيئة Firebase Admin (مرة واحدة فقط) ───
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
  );
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ✅ CORS للسماح للواجهة بالاتصال
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ─── التحقق من المدخلات ───
  const {
    email,
    password,
    username,
    name,
    role,
    // حقول إضافية (للسباح)
    ageCategory,
    team,
    points,
    parentUid,
  } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({
      error: "Missing required fields: email, password, name, role",
    });
  }

  try {
    // ─── 1. إنشاء المستخدم في Firebase Auth ───
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // ─── 2. إضافة وثيقة في Firestore ───
    const userData: Record<string, unknown> = {
      uid: userRecord.uid,
      email,
      username: username || null,
      name,
      role,
      createdAt: new Date(),
    };

    // حقول خاصة بالسباح
    if (role === "swimmer") {
      userData.ageCategory = ageCategory || null;
      userData.team = team || null;
      userData.points = points || 0;
      userData.parentUid = parentUid || null;
    }

    // ربط ولي الأمر بالسباح
    if (role === "parent" && parentUid) {
      userData.swimmerUid = parentUid;
    }

    await getFirestore().collection("users").doc(userRecord.uid).set(userData);

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      message: "User created successfully",
    });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const err = error as { code?: string; message?: string };

    // رسائل خطأ واضحة
    if (err.code === "auth/email-already-exists") {
      return res.status(400).json({
        error: "البريد الإلكتروني مستخدم بالفعل",
      });
    }
    if (err.code === "auth/invalid-password") {
      return res.status(400).json({
        error: "كلمة المرور ضعيفة جداً (6 أحرف على الأقل)",
      });
    }

    return res.status(500).json({
      error: err.message || "خطأ في إنشاء المستخدم",
    });
  }
}