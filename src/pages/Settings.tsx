import { useState, type FormEvent } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, updateUsername, updateDisplayName, updatePassword } = useAuth();

  // اسم المستخدم
  const [username, setUsername] = useState(user?.username || "");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState({ type: "", text: "" });

  // الاسم الكامل
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState({ type: "", text: "" });

  // كلمة المرور
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: "", text: "" });

  if (!user) return null;

  // ─── تغيير اسم المستخدم ───
  const handleUsername = async (e: FormEvent) => {
    e.preventDefault();
    setUsernameMsg({ type: "", text: "" });
    setSavingUsername(true);
    try {
      await updateUsername(username);
      setUsernameMsg({ type: "success", text: "✅ تم تحديث اسم المستخدم بنجاح" });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setUsernameMsg({ type: "error", text: error.message || "خطأ في التحديث" });
    }
    setSavingUsername(false);
  };

  // ─── تغيير الاسم الكامل ───
  const handleName = async (e: FormEvent) => {
    e.preventDefault();
    setNameMsg({ type: "", text: "" });
    setSavingName(true);
    try {
      await updateDisplayName(name);
      setNameMsg({ type: "success", text: "✅ تم تحديث الاسم بنجاح" });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setNameMsg({ type: "error", text: error.message || "خطأ في التحديث" });
    }
    setSavingName(false);
  };

  // ─── تغيير كلمة المرور ───
  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassMsg({ type: "", text: "" });

    if (newPass !== confirmPass) {
      setPassMsg({ type: "error", text: "كلمتا المرور غير متطابقتين" });
      return;
    }

    setSavingPass(true);
    try {
      await updatePassword(currentPass, newPass);
      setPassMsg({ type: "success", text: "✅ تم تغيير كلمة المرور بنجاح" });
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      let msg = error.message || "خطأ في التحديث";

      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        msg = "كلمة المرور الحالية غير صحيحة";
      } else if (error.code === "auth/weak-password") {
        msg = "كلمة المرور الجديدة ضعيفة جداً";
      } else if (error.code === "auth/requires-recent-login") {
        msg = "الرجاء الخروج وتسجيل الدخول مجدداً قبل تغيير كلمة المرور";
      }

      setPassMsg({ type: "error", text: msg });
    }
    setSavingPass(false);
  };

  const MessageBanner = ({ msg }: { msg: { type: string; text: string } }) => {
    if (!msg.text) return null;
    return (
      <div
        className={`text-sm rounded-lg p-3 ${
          msg.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}
      >
        {msg.text}
      </div>
    );
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-abha-green mb-6">⚙️ الإعدادات</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── الملف الشخصي ─── */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-4">👤 الملف الشخصي</h2>

          {/* الاسم الكامل */}
          <form onSubmit={handleName} className="space-y-3 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </div>
            <MessageBanner msg={nameMsg} />
            <button type="submit" disabled={savingName} className="btn-primary disabled:opacity-50">
              {savingName ? "جاري الحفظ..." : "💾 حفظ الاسم"}
            </button>
          </form>

          {/* اسم المستخدم */}
          <form onSubmit={handleUsername} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="مثال : abu_nasser"
                dir="ltr"
              />
              <p className="text-xs text-gray-400 mt-1">
                بدون مسافات — أحرف إنجليزية وأرقام فقط
              </p>
            </div>
            <MessageBanner msg={usernameMsg} />
            <button type="submit" disabled={savingUsername} className="btn-primary disabled:opacity-50">
              {savingUsername ? "جاري الحفظ..." : "💾 حفظ اسم المستخدم"}
            </button>
          </form>

          {/* عرض الإيميل (قراءة فقط) */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <label className="block text-sm font-semibold mb-1 text-gray-500">
              البريد الإلكتروني (للاسترجاع)
            </label>
            <input type="email" value={user.email} className="input bg-gray-50" dir="ltr" disabled />
          </div>
        </div>

        {/* ─── كلمة المرور ─── */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-4">🔑 تغيير كلمة المرور</h2>

          <form onSubmit={handlePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">كلمة المرور الحالية</label>
              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="input"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="input"
                dir="ltr"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="input"
                dir="ltr"
                minLength={6}
                required
              />
            </div>
            <MessageBanner msg={passMsg} />
            <button type="submit" disabled={savingPass} className="btn-primary disabled:opacity-50">
              {savingPass ? "جاري التحديث..." : "🔐 تغيير كلمة المرور"}
            </button>
          </form>

          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
            ⚠️ إذا ظهر خطأ "requires recent login"، اخرج ثم سجّل الدخول مرة أخرى قبل المحاولة.
          </div>
        </div>
      </div>
    </Layout>
  );
}