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

interface Training {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  ageCategories: string[];  // ← مصفوفة !
  notes: string;
  coachName: string;
  groupId: string;           // ← لربط التمارين المنشأة معاً
  createdAt: Date | null;
}

const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ageCategories = ["7-8", "9-10", "11-12", "13-14", "15-17", "عمومي"];
const locations = ["المسبح الكبير", "المسبح الصغير", "الصالة الرياضية"];

export default function Trainings() {
  const { user } = useAuth();
  const [list, setList] = useState<Training[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [filterAge, setFilterAge] = useState("all");

  const [day, setDay] = useState(days[0]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [location, setLocation] = useState(locations[0]);
  const [selectedCats, setSelectedCats] = useState<string[]>(["7-8", "9-10", "11-12"]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const q = query(collection(db, "trainings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: Training[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          day: data.day || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          location: data.location || "",
          ageCategories: data.ageCategories || (data.ageCategory ? [data.ageCategory] : []),
          notes: data.notes || "",
          coachName: data.coachName || "",
          groupId: data.groupId || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });
      setList(items);
    });
    return () => unsub();
  }, []);

  const toggleCat = (cat: string) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const selectAll = () => setSelectedCats([...ageCategories]);
  const selectNone = () => setSelectedCats([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || selectedCats.length === 0) {
      setMsg({ type: "error", text: "اختر فئة واحدة على الأقل" });
      return;
    }
    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      await addDoc(collection(db, "trainings"), {
        day,
        startTime,
        endTime,
        location,
        ageCategories: selectedCats,
        notes: notes.trim(),
        coachName: user.name || user.email,
        createdBy: user.uid,
        groupId: `training_${Date.now()}`,
        createdAt: serverTimestamp(),
      });

      setMsg({ type: "success", text: `✅ تم إضافة التمرين لـ ${selectedCats.length} فئة` });
      setNotes("");

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
    if (!confirm("حذف هذا التمرين ؟")) return;
    try {
      await deleteDoc(doc(db, "trainings", id));
    } catch (err) {
      console.error(err);
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "coach";

  const filtered = filterAge === "all"
    ? list
    : list.filter((t) => t.ageCategories.includes(filterAge) || t.ageCategories.includes("عمومي"));

  const byDay: Record<string, Training[]> = {};
  days.forEach((d) => {
    const dayItems = filtered.filter((t) => t.day === d);
    if (dayItems.length > 0) byDay[d] = dayItems;
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">📅 جدول التمارين</h1>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "إلغاء" : "➕ إضافة تمرين"}
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-lg font-bold text-abha-green mb-3">📝 تمرين جديد</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">اليوم</label>
              <select value={day} onChange={(e) => setDay(e.target.value)} className="input">
                {days.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">المكان</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} className="input">
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">من</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" dir="ltr" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">إلى</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" dir="ltr" required />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">الفئات العمرية *</label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs text-abha-green hover:underline">تحديد الكل</button>
                <span className="text-gray-400">|</span>
                <button type="button" onClick={selectNone} className="text-xs text-red-600 hover:underline">إلغاء الكل</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ageCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    selectedCats.includes(cat)
                      ? "bg-abha-green text-white font-semibold"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {selectedCats.includes(cat) ? "✓ " : ""}{cat}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              محدد : {selectedCats.length} فئة — سيُضاف التمرين لكل الفئات المحددة
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">ملاحظات (اختياري)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
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
            <button type="submit" disabled={loading || selectedCats.length === 0} className="btn-primary disabled:opacity-50">
              {loading ? "جاري الحفظ..." : `✅ حفظ لـ ${selectedCats.length} فئة`}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="card mb-4">
        <label className="block text-sm font-semibold mb-2">عرض حسب الفئة :</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterAge("all")}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filterAge === "all" ? "bg-abha-green text-white" : "bg-gray-100"
            }`}
          >
            الكل
          </button>
          {ageCategories.map((c) => (
            <button
              key={c}
              onClick={() => setFilterAge(c)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                filterAge === c ? "bg-abha-green text-white" : "bg-gray-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(byDay).length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا يوجد تمارين مسجّلة حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((d) => {
            const items = byDay[d];
            if (!items) return null;
            return (
              <div key={d} className="card">
                <h3 className="text-lg font-bold text-abha-green mb-3 border-b pb-2">{d}</h3>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-abha-bg rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm font-bold text-abha-green" dir="ltr">
                            {t.startTime} → {t.endTime}
                          </span>
                          <span className="text-sm text-gray-700">📍 {t.location}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.ageCategories.map((cat) => (
                            <span key={cat} className="bg-abha-gold text-white px-2 py-0.5 rounded text-xs">
                              {cat}
                            </span>
                          ))}
                        </div>
                        {t.notes && <p className="text-xs text-gray-500 mt-1">📝 {t.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">👨‍🏫 {t.coachName}</p>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}