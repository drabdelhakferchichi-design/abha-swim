import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
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
  parentName: string;
  parentPhone: string;
  username: string;
  tempPassword: string;
  createdAt: Date | null;
}

const ageCategories = ["6-8", "9-10", "11-12", "13-14", "15-17", "18+"];

export default function Swimmers() {
  const { user } = useAuth();
  const [list, setList] = useState<Swimmer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // الحقول
  const [name, setName] = useState("");
  const [ageCategory, setAgeCategory] = useState(ageCategories[0]);
  const [team, setTeam] = useState("");
  const [points, setPoints] = useState(0);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  // قراءة realtime
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
          parentName: data.parentName || "",
          parentPhone: data.parentPhone || "",
          username: data.username || "",
          tempPassword: data.tempPassword || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });
      setList(items);
    });
    return () => unsub();
  }, []);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pass = "Abha@";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "swimmers"), {
        name: name.trim(),
        ageCategory,
        team: team.trim(),
        points,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        username: username.trim(),
        tempPassword: tempPassword.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      // إعادة تعيين
      setName("");
      setTeam("");
      setPoints(0);
      setParentName("");
      setParentPhone("");
      setUsername("");
      setTempPassword("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("خطأ في الحفظ");
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
        <form onSubmit={handleSubmit} className="card mb-6">
          <h2 className="text-lg font-bold text-abha-green mb-4">📝 بيانات السباح</h2>

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
              <label className="block text-sm font-semibold mb-1">الفريق</label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="input"
                placeholder="مثال : فريق الناشئين"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">النقاط</label>
              <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="input" min={0} />
            </div>
          </div>

          <h3 className="text-md font-bold text-abha-green mt-6 mb-3">👨‍👦 ولي الأمر</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">اسم ولي الأمر</label>
              <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} className="input" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">هاتف ولي الأمر</label>
              <input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} className="input" dir="ltr" />
            </div>
          </div>

          <h3 className="text-md font-bold text-abha-green mt-6 mb-3">🔐 بيانات الدخول (تُعطى للسباح)</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">اسم المستخدم</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input" dir="ltr" placeholder="swim_ahmed" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">كلمة مرور مؤقتة</label>
              <div className="flex gap-2">
                <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className="input" dir="ltr" />
                <button type="button" onClick={generatePassword} className="btn-gold whitespace-nowrap">🎲 توليد</button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? "جاري الحفظ..." : "✅ حفظ السباح"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
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
                    <span className="bg-abha-gold text-white px-2 py-1 rounded text-xs font-bold">
                      {s.points}
                    </span>
                  </td>
                  <td className="p-3">
                    {s.parentName || "-"}
                    {s.parentPhone && <div className="text-xs text-gray-400" dir="ltr">{s.parentPhone}</div>}
                  </td>
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