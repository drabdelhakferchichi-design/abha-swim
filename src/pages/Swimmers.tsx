import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

interface Swimmer {
  id: string;
  name: string;
  ageCategory: string;
  team: string;
  points: number;
  coachId: string;
  coachName: string;
  parentUid: string;
  parentName: string;
  createdAt: Date | null;
}

interface Coach {
  uid: string;
  name: string;
}

const ageCategories = ["6-8", "9-10", "11-12", "13-14", "15-17", "18+"];

export default function Swimmers() {
  const { user } = useAuth();
  const [list, setList] = useState<Swimmer[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // ─── حقول السباح ───
  const [name, setName] = useState("");
  const [ageCategory, setAgeCategory] = useState(ageCategories[0]);
  const [team, setTeam] = useState("");
  const [points, setPoints] = useState(0);
  const [coachId, setCoachId] = useState("");

  // ─── حقول ولي الأمر ───
  const [parentName, setParentName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  // ─── جلب السباحين ───
  useEffect(() => {
    const q = query(collection(db, "swimmers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: Swimmer[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          ageCategory: data.ageCategory || "",
          team: data.team || "",
          points: data.points || 0,
          coachId: data.coachId || "",
          coachName: data.coachName || "",
          parentUid: data.parentUid || "",
          parentName: data.parentName || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });
      setList(items);
    });
    return () => unsub();
  }, []);

  // ─── جلب المدربين ───
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const items: Coach[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.role === "coach") {
          items.push({ uid: d.id, name: data.name || "" });
        }
      });
      setCoaches(items);
      if (items.length > 0 && !coachId) setCoachId(items[0].uid);
    });
    return () => unsub();
  }, [coachId]);

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
    if (!user || !name.trim() || !username.trim() || !password.trim() || !coachId) {
      setMsg({ type: "error", text: "املأ جميع الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    const selectedCoach = coaches.find((c) => c.uid === coachId);

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          email: parentEmail.trim(),
          parentName: parentName.trim() || `ولي أمر ${name.trim()}`,
          swimmerName: name.trim(),
          ageCategory,
          team: team.trim(),
          points,
          coachId,
          coachName: selectedCoach?.name || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطأ في الإنشاء");
      }

      setMsg({ type: "success", text: "✅ تم إنشاء السباح وحساب ولي الأمر بنجاح" });

      // إعادة تعيين
      setName("");
      setTeam("");
      setPoints(0);
      setParentName("");
      setUsername("");
      setPassword("");
      setParentEmail("");

      setTimeout(() => setShowForm(false), 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg({ type: "error", text: error.message || "خطأ في الإنشاء" });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا السباح ؟")) return;
    try {
      await deleteDoc(doc(db, "swimmers", id));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = list.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === "admin";

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">🏊 السباحون</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "إلغاء" : "➕ إضافة سباح"}
          </button>
        )}
      </div>

      {/* نموذج الإضافة */}
      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-6">
          {/* ─── بيانات السباح ─── */}
          <div>
            <h2 className="text-lg font-bold text-abha-green mb-3">🏊 بيانات السباح</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">الاسم الكامل *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">الفئة العمرية</label>
                <select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} className="input">
                  {ageCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">الفريق / النادي</label>
                <input type="text" value={team} onChange={(e) => setTeam(e.target.value)} className="input" placeholder="مثال : فريق الناشئين" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">النقاط</label>
                <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="input" min={0} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1">المدرب المسؤول *</label>
                <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className="input" required>
                  {coaches.map((c) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ─── حساب ولي الأمر ─── */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-bold text-abha-green mb-3">👨‍👦 حساب ولي الأمر</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">اسم ولي الأمر</label>
                <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className="input" placeholder="(اختياري — سيُولّد تلقائياً)" />
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
                <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="input" dir="ltr" placeholder="للاسترجاع" />
              </div>
            </div>
          </div>

          {/* رسالة */}
          {msg.text && (
            <div className={`text-sm rounded-lg p-3 ${
              msg.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {msg.text}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? "جاري الإنشاء..." : "✅ حفظ وإنشاء الحساب"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* البحث */}
      <div className="card mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          placeholder="🔍 ابحث عن سباح..."
        />
      </div>

      {/* القائمة */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا يوجد سباحون مسجّلون حالياً</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-abha-green text-abha-green">
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">الفئة</th>
                <th className="text-right p-3">الفريق</th>
                <th className="text-right p-3">النقاط</th>
                <th className="text-right p-3">المدرب</th>
                <th className="text-right p-3">ولي الأمر</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-abha-bg">
                  <td className="p-3 font-semibold">{s.name}</td>
                  <td className="p-3">{s.ageCategory}</td>
                  <td className="p-3">{s.team || "-"}</td>
                  <td className="p-3">
                    <span className="bg-abha-gold text-white px-2 py-1 rounded text-xs font-bold">{s.points}</span>
                  </td>
                  <td className="p-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{s.coachName || "-"}</span>
                  </td>
                  <td className="p-3">{s.parentName || "-"}</td>
                  <td className="p-3">
                    {isAdmin && (
                      <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700">🗑️</button>
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