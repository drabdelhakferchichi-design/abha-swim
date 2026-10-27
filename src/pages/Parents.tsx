import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
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
          items.push({ id: d.id, name: data.name || "" });
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

  // ✅ تصدير CSV
  const handleExportCSV = () => {
    if (parents.length === 0) {
      setMsg({ type: "error", text: "لا يوجد أولياء أمور للتصدير" });
      return;
    }

    const BOM = "\uFEFF";
    const headers = ["#", "الاسم", "اسم المستخدم", "كلمة المرور", "الابن", "الحالة"];
    
    const rows = parents.map((p, idx) => [
      idx + 1,
      p.name,
      p.username,
      p.tempPassword,
      p.swimmerName || "-",
      p.needsAuthAccount ? "يحتاج تفعيل" : "مُفعّل",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `أولياء-الأمور-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setMsg({ type: "success", text: `✅ تم تصدير ${parents.length} ولي أمر` });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim() || !swimmerId) {
      setMsg({ type: "error", text: "املأ جميع الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    const selectedSwimmer = freeSwimmers.find((s) => s.id === swimmerId);
    const tempParentUid = `parent_${Date.now()}`;

    try {
      await setDoc(doc(db, "users", tempParentUid), {
        uid: tempParentUid,
        username: username.trim(),
        email: email.trim() || null,
        name: name.trim(),
        role: "parent",
        swimmerId,
        swimmerName: selectedSwimmer?.name || "",
        tempPassword: password,
        needsAuthAccount: true,
        createdBy: user?.uid || "",
      });

      if (selectedSwimmer) {
        await updateDoc(doc(db, "swimmers", swimmerId), {
          parentUid: tempParentUid,
          parentName: name.trim(),
        });
      }

      setMsg({
        type: "success",
        text: `✅ تم حفظ ولي الأمر وربطه بـ "${selectedSwimmer?.name}"\n⚠️ الحساب يحتاج تفعيل يدوياً في Firebase Auth`,
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
      setMsg({ type: "error", text: error.message || "خطأ في الحفظ" });
    }
    setLoading(false);
  };

  // ✅ الحذف الآمن — يتجاهل خطأ السباح المحذوف
  const handleDelete = async (parent: Parent) => {
    if (!confirm(`حذف ولي الأمر "${parent.name}" ؟\n\n⚠️ سيُحذف من Firestore (وAuth إن أمكن)`)) return;

    // 1️⃣ إزالة الربط من السباح (إذا كان موجوداً) — قد يفشل إذا السباح محذوف
    if (parent.swimmerId) {
      try {
        await updateDoc(doc(db, "swimmers", parent.swimmerId), {
          parentUid: "",
          parentName: "",
        });
      } catch (err) {
        // نتجاهل — السباح ربما محذوف من قبل
        console.log("Swimmer not found (skipped):", err);
      }
    }

    // 2️⃣ حذف وثيقة ولي الأمر — هذا يجب أن ينجح دائماً
    try {
      await deleteDoc(doc(db, "users", parent.uid));
    } catch (err) {
      console.error("Firestore delete failed:", err);
      setMsg({ type: "error", text: "❌ خطأ في الحذف من Firestore" });
      return;
    }

    // 3️⃣ محاولة حذف Auth — بدون كسر (فقط إذا وُجد حساب Auth)
    if (!parent.needsAuthAccount) {
      try {
        const response = await fetch("/api/delete-user-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: parent.uid }),
        });
        
        if (response.ok) {
          console.log("✅ Auth deleted");
        }
      } catch (err) {
        console.log("Auth delete skipped:", err);
      }
    }

    setMsg({ type: "success", text: `✅ تم حذف "${parent.name}"` });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const filtered = parents.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === "admin";

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-abha-green">👨‍👦 أولياء الأمور</h1>
        <div className="flex gap-2">
          {isAdmin && parents.length > 0 && (
            <button onClick={handleExportCSV} className="btn-gold text-sm">
              📊 تصدير Excel
            </button>
          )}
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
      </div>

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 mb-4 whitespace-pre-line ${
          msg.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      {freeSwimmers.length === 0 && !showForm && (
        <div className="card mb-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ لا يوجد سباحون بدون ولي أمر. أضف سباحين أولاً.
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
          </div>

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
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="🔍 ابحث..." />
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
    </Layout>
  );
}