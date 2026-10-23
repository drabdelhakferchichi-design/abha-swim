import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

interface Parent {
  uid: string;
  username: string;
  name: string;
  email: string;
  swimmerId: string;
  swimmerName: string;
  tempPassword: string;
  needsAuthAccount: boolean;
}

interface Swimmer {
  id: string;
  name: string;
  ageCategory: string;
  coachId: string;
  coachName: string;
}

export default function Parents() {
  const { user } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [freeSwimmers, setFreeSwimmers] = useState<Swimmer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [swimmerId, setSwimmerId] = useState("");

  // جلب أولياء الأمور
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "parent"));
    const unsub = onSnapshot(q, (snap) => {
      const items: Parent[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          username: data.username || "",
          name: data.name || "",
          email: data.email || "",
          swimmerId: data.swimmerId || "",
          swimmerName: data.swimmerName || "",
          tempPassword: data.tempPassword || "",
          needsAuthAccount: data.needsAuthAccount || false,
        };
      });
      setParents(items);
    });
    return () => unsub();
  }, []);

  // جلب السباحين بدون ولي أمر
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "swimmers"), (snap) => {
      const items: Swimmer[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (!data.parentUid) {
          items.push({
            id: d.id,
            name: data.name || "",
            ageCategory: data.ageCategory || "",
            coachId: data.coachId || "",
            coachName: data.coachName || "",
          });
        }
      });
      setFreeSwimmers(items);
      if (items.length > 0 && !swimmerId) setSwimmerId(items[0].id);
    });
    return () => unsub();
  }, [swimmerId]);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pass = "Abha@";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || !username.trim() || !password.trim() || !swimmerId) {
      setMsg({ type: "error", text: "املأ جميع الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    const selectedSwimmer = freeSwimmers.find((s) => s.id === swimmerId);
    if (!selectedSwimmer) {
      setMsg({ type: "error", text: "لم يتم العثور على السباح" });
      setLoading(false);
      return;
    }

    try {
      // ✅ استخدام create-user-v2 (الذي يتعامل مع مشاكل JSON)
      const response = await fetch("/api/create-user-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          email: email.trim() || "",
          parentName: name.trim(),
          swimmerName: selectedSwimmer.name,
          coachId: selectedSwimmer.coachId || "",
          coachName: selectedSwimmer.coachName || "",
        }),
      });

      // ⚠️ معالجة الرد (قد يكون فارغاً)
      let data: { error?: string; success?: boolean } = {};
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("خطأ في استجابة السيرفر");
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `خطأ HTTP ${response.status}`);
      }

      setMsg({
        type: "success",
        text: `✅ تم إنشاء حساب ولي الأمر وربطه بـ "${selectedSwimmer.name}" تلقائياً`,
      });

      setName("");
      setUsername("");
      setPassword("");
      setEmail("");

      setTimeout(() => {
        setShowForm(false);
        setMsg({ type: "", text: "" });
      }, 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg({ type: "error", text: error.message || "خطأ في الاتصال" });
    }
    setLoading(false);
  };

  const handleDelete = async (parent: Parent) => {
    if (!confirm(`حذف ولي الأمر "${parent.name}" ؟`)) return;
    try {
      if (parent.swimmerId) {
        await updateDoc(doc(db, "swimmers", parent.swimmerId), {
          parentUid: "",
          parentName: "",
        });
      }
      await deleteDoc(doc(db, "users", parent.uid));
    } catch (err) {
      console.error(err);
      alert("خطأ في الحذف");
    }
  };

  const filtered = parents.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === "admin";

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">👨‍👦 أولياء الأمور</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
            disabled={freeSwimmers.length === 0 && !showForm}
          >
            {showForm ? "إلغاء" : "➕ إضافة ولي أمر"}
          </button>
        )}
      </div>

      {freeSwimmers.length === 0 && !showForm && (
        <div className="card mb-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ لا يوجد سباحون بدون ولي أمر. أضف سباحين أولاً من صفحة "السباحون".
          </p>
        </div>
      )}

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-lg font-bold text-abha-green mb-3">📝 بيانات ولي الأمر</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">الاسم الكامل *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">اسم المستخدم *</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input" dir="ltr" placeholder="ex: ahmed_dad" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">كلمة المرور المؤقتة *</label>
              <div className="flex gap-2">
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="input" dir="ltr" required />
                <button type="button" onClick={generatePassword} className="btn-gold whitespace-nowrap">🎲</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">الإيميل (اختياري)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" dir="ltr" placeholder="للاسترجاع" />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-semibold mb-2">🔗 اختر السباح (ابنه) *</label>
            <select value={swimmerId} onChange={(e) => setSwimmerId(e.target.value)} className="input" required>
              {freeSwimmers.length === 0 && <option value="">لا يوجد سباحون متاحون</option>}
              {freeSwimmers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              يظهر هنا فقط السباحون الذين ليس لهم ولي أمر بعد
            </p>
          </div>

          {msg.text && (
            <div className={`text-sm rounded-lg p-3 whitespace-pre-line ${
              msg.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {msg.text}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? "جاري الحفظ..." : "✅ حفظ وربط"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="card mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="🔍 ابحث بالاسم أو اسم المستخدم..." />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا يوجد أولياء أمور مسجلون حالياً</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-abha-green text-abha-green">
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">اسم المستخدم</th>
                <th className="text-right p-3">الابن</th>
                <th className="text-right p-3">كلمة المرور</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.uid} className="border-b border-gray-100 hover:bg-abha-bg">
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3 font-mono text-xs" dir="ltr">{p.username}</td>
                  <td className="p-3">{p.swimmerName || "-"}</td>
                  <td className="p-3 font-mono text-xs" dir="ltr">{p.tempPassword}</td>
                  <td className="p-3">
                    {p.needsAuthAccount ? (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">⚠️ يحتاج تفعيل</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">✅ مُفعّل</span>
                    )}
                  </td>
                  <td className="p-3">
                    {isAdmin && (
                      <button onClick={() => handleDelete(p)} className="text-red-500 hover:text-red-700">🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        ℹ️ <strong>مهم</strong> : يجب إنشاء حساب Firebase Auth يدوياً لكل ولي أمر من Firebase Console → Authentication إذا لم يُفعّل تلقائياً.
      </div>
    </Layout>
  );
}