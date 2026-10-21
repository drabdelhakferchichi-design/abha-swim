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
  coachId: string;
  parentUid: string;
}

interface Report {
  id: string;
  swimmerId: string;
  swimmerName: string;
  month: string;
  rating: string;
  notes: string;
  achievements: string;
  coachId: string;
  coachName: string;
  createdAt: Date | null;
}

const ratings = ["ممتاز", "جيد جداً", "جيد", "يحتاج تحسين"];
const months = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function Reports() {
  const { user } = useAuth();
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [filterSwimmer, setFilterSwimmer] = useState("all");

  const [swimmerId, setSwimmerId] = useState("");
  const [month, setMonth] = useState(months[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [rating, setRating] = useState(ratings[1]);
  const [notes, setNotes] = useState("");
  const [achievements, setAchievements] = useState("");

  // جلب السباحين حسب الدور
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "swimmers"), (snap) => {
      const items: Swimmer[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          ageCategory: data.ageCategory || "",
          coachId: data.coachId || "",
          parentUid: data.parentUid || "",
        };
      });

      let allowed = items;
      if (user?.role === "coach") {
        allowed = items.filter((s) => s.coachId === user.uid);
      } else if (user?.role === "parent") {
        allowed = items.filter((s) => s.parentUid === user.uid);
      }

      setSwimmers(allowed);
      if (allowed.length > 0 && !swimmerId) setSwimmerId(allowed[0].id);
    });
    return () => unsub();
  }, [user, swimmerId]);

  // جلب التقارير
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: Report[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          swimmerId: data.swimmerId || "",
          swimmerName: data.swimmerName || "",
          month: data.month || "",
          rating: data.rating || "",
          notes: data.notes || "",
          achievements: data.achievements || "",
          coachId: data.coachId || "",
          coachName: data.coachName || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });

      let allowed = items;
      if (user?.role === "coach") {
        allowed = items.filter((r) => r.coachId === user.uid);
      } else if (user?.role === "parent") {
        const myIds = swimmers.map((s) => s.id);
        allowed = items.filter((r) => myIds.includes(r.swimmerId));
      }

      setReports(allowed);
    });
    return () => unsub();
  }, [user, swimmers]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !swimmerId || !notes.trim()) {
      setMsg({ type: "error", text: "املأ الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    const swimmer = swimmers.find((s) => s.id === swimmerId);

    try {
      await addDoc(collection(db, "reports"), {
        swimmerId,
        swimmerName: swimmer?.name || "",
        month: `${month} ${year}`,
        rating,
        notes: notes.trim(),
        achievements: achievements.trim(),
        coachId: user.uid,
        coachName: user.name || user.email,
        createdAt: serverTimestamp(),
      });

      setMsg({ type: "success", text: "✅ تم حفظ التقرير" });
      setNotes("");
      setAchievements("");

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
    if (!confirm("حذف هذا التقرير ؟")) return;
    try {
      await deleteDoc(doc(db, "reports", id));
    } catch (err) {
      console.error(err);
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "coach";

  const filtered = reports.filter((r) => {
    return filterSwimmer === "all" || r.swimmerId === filterSwimmer;
  });

  const ratingColor = (r: string) => {
    if (r === "ممتاز") return "bg-green-100 text-green-700";
    if (r === "جيد جداً") return "bg-blue-100 text-blue-700";
    if (r === "جيد") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">📊 التقارير الشهرية</h1>
        {canEdit && swimmers.length > 0 && user?.role !== "admin" && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "إلغاء" : "➕ تقرير جديد"}
          </button>
        )}
        {canEdit && user?.role === "admin" && (
          <span className="text-sm text-gray-500">(يكتبها المدربون)</span>
        )}
      </div>

      {swimmers.length === 0 && user?.role === "parent" && (
        <div className="card mb-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ لا يوجد سباحون مرتبطون بك حالياً.
          </p>
        </div>
      )}

      {showForm && canEdit && user?.role !== "admin" && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-lg font-bold text-abha-green mb-3">📝 تقرير شهري</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">السباح *</label>
              <select value={swimmerId} onChange={(e) => setSwimmerId(e.target.value)} className="input" required>
                {swimmers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.ageCategory})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">التقييم العام</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)} className="input">
                {ratings.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">الشهر</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="input">
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">السنة</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="input" dir="ltr" min={2020} max={2099} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">الإنجازات (اختياري)</label>
            <textarea
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              className="input"
              rows={2}
              placeholder="مثال: حقق رقم شخصي جديد في 50م حرة"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">ملاحظات المدرب *</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={4}
              placeholder="مثال: تحسّن واضح في الأداء، يحتاج التركيز أكثر على تقنية النفس"
              required
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
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? "جاري الحفظ..." : "✅ حفظ التقرير"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {swimmers.length > 1 && (
        <div className="card mb-4">
          <label className="block text-sm font-semibold mb-2">فلترة حسب السباح :</label>
          <select value={filterSwimmer} onChange={(e) => setFilterSwimmer(e.target.value)} className="input">
            <option value="all">كل السباحين</option>
            {swimmers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا توجد تقارير مسجّلة حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-abha-green">{r.swimmerName}</h3>
                  <p className="text-sm text-gray-500">📅 {r.month}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${ratingColor(r.rating)}`}>
                    {r.rating}
                  </span>
                  {canEdit && (
                    <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                  )}
                </div>
              </div>

              {r.achievements && (
                <div className="mb-3 p-2 bg-yellow-50 border-r-4 border-abha-gold rounded">
                  <p className="text-xs font-semibold text-abha-gold mb-1">🏆 الإنجازات</p>
                  <p className="text-sm text-gray-700">{r.achievements}</p>
                </div>
              )}

              <div className="p-2 bg-abha-bg rounded">
                <p className="text-xs font-semibold text-gray-600 mb-1">📝 ملاحظات المدرب</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.notes}</p>
              </div>

              <p className="text-xs text-gray-400 mt-3">👨‍🏫 {r.coachName}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}