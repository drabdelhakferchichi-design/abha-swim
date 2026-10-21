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

interface Competition {
  id: string;
  name: string;
  date: string;
  location: string;
  categories: string[];
  notes: string;
  createdByName: string;
  createdAt: Date | null;
}

const allCategories = ["7-8", "9-10", "11-12", "13-14", "15-17", "عمومي"];

export default function Competitions() {
  const { user } = useAuth();
  const [list, setList] = useState<Competition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const q = query(collection(db, "competitions"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: Competition[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          date: data.date || "",
          location: data.location || "",
          categories: data.categories || [],
          notes: data.notes || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });
      setList(items);
    });
    return () => unsub();
  }, []);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || !date || categories.length === 0) {
      setMsg({ type: "error", text: "املأ الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      await addDoc(collection(db, "competitions"), {
        name: name.trim(),
        date,
        location: location.trim(),
        categories,
        notes: notes.trim(),
        createdBy: user.uid,
        createdByName: user.name || user.email,
        createdAt: serverTimestamp(),
      });

      setMsg({ type: "success", text: "✅ تم إضافة البطولة" });
      setName("");
      setLocation("");
      setNotes("");
      setCategories([]);
      setDate("");

      setTimeout(() => {
        setShowForm(false);
        setMsg({ type: "", text: "" });
      }, 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg({ type: "error", text: error.message || "خطأ" });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه البطولة ؟")) return;
    try {
      await deleteDoc(doc(db, "competitions", id));
    } catch (err) {
      console.error(err);
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "coach";

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">🏆 البطولات</h1>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "إلغاء" : "➕ إضافة بطولة"}
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-lg font-bold text-abha-green mb-3">📝 تفاصيل البطولة</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">اسم البطولة *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="مثال: بطولة المملكة للناشئين"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">التاريخ *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                dir="ltr"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">المكان</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="مثال: مسبح الملك فهد - الرياض"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">الفئات المشاركة *</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${
                    categories.includes(c)
                      ? "bg-abha-green text-white font-semibold"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {categories.includes(c) ? "✓ " : ""}{c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="مثال: التجمع الساعة 8 صباحاً - إحضار الزي الرسمي"
            />
          </div>

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
            <button
              type="submit"
              disabled={loading || categories.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "✅ حفظ البطولة"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {list.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا توجد بطولات مسجّلة حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-abha-green">{c.name}</h3>
                  <p className="text-sm text-gray-500 mt-1" dir="ltr">
                    📅 {c.date} {c.location && `| 📍 ${c.location}`}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {c.categories.map((cat) => (
                  <span
                    key={cat}
                    className="bg-abha-gold text-white px-2 py-0.5 rounded text-xs font-semibold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              {c.notes && (
                <p className="text-sm text-gray-700 bg-abha-bg p-2 rounded mt-2">
                  📝 {c.notes}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">👤 أضافها : {c.createdByName}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}