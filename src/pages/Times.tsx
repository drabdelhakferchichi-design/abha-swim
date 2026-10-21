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

interface TimeRecord {
  id: string;
  swimmerId: string;
  swimmerName: string;
  event: string;
  time: string;
  date: string;
  notes: string;
  coachName: string;
  createdAt: Date | null;
}

const events = [
  "50م حرة", "100م حرة", "200م حرة",
  "50م ظهر", "100م ظهر", "200م ظهر",
  "50م صدر", "100م صدر", "200م صدر",
  "50م فراشة", "100م فراشة",
  "200م متنوع",
];

export default function Times() {
  const { user } = useAuth();
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [times, setTimes] = useState<TimeRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [search, setSearch] = useState("");
  const [filterSwimmer, setFilterSwimmer] = useState("all");

  const [swimmerId, setSwimmerId] = useState("");
  const [event, setEvent] = useState(events[0]);
  const [time, setTime] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

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

  useEffect(() => {
    const q = query(collection(db, "times"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: TimeRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          swimmerId: data.swimmerId || "",
          swimmerName: data.swimmerName || "",
          event: data.event || "",
          time: data.time || "",
          date: data.date || "",
          notes: data.notes || "",
          coachName: data.coachName || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });

      let allowed = items;
      if (user?.role === "coach" || user?.role === "parent") {
        const myIds = swimmers.map((s) => s.id);
        allowed = items.filter((t) => myIds.includes(t.swimmerId));
      }

      setTimes(allowed);
    });
    return () => unsub();
  }, [user, swimmers]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !swimmerId || !time.trim()) {
      setMsg({ type: "error", text: "املأ الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    const swimmer = swimmers.find((s) => s.id === swimmerId);

    try {
      await addDoc(collection(db, "times"), {
        swimmerId,
        swimmerName: swimmer?.name || "",
        event,
        time: time.trim(),
        date,
        notes: notes.trim(),
        coachName: user.name || user.email,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      setMsg({ type: "success", text: "✅ تم تسجيل الزمن" });
      setTime("");
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
    if (!confirm("حذف هذا الزمن ؟")) return;
    try {
      await deleteDoc(doc(db, "times", id));
    } catch (err) {
      console.error(err);
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "coach";

  const filtered = times.filter((t) => {
    const matchSearch = t.swimmerName.toLowerCase().includes(search.toLowerCase()) ||
                        t.event.toLowerCase().includes(search.toLowerCase());
    const matchSwimmer = filterSwimmer === "all" || t.swimmerId === filterSwimmer;
    return matchSearch && matchSwimmer;
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">⏱️ الأزمنة</h1>
        {canEdit && swimmers.length > 0 && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "إلغاء" : "➕ تسجيل زمن"}
          </button>
        )}
      </div>

      {swimmers.length === 0 && (
        <div className="card mb-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ لا يوجد سباحون مرتبطون بك حالياً.
          </p>
        </div>
      )}

      {showForm && canEdit && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-lg font-bold text-abha-green mb-3">📝 زمن جديد</h2>

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
              <label className="block text-sm font-semibold mb-1">نوع السباق *</label>
              <select value={event} onChange={(e) => setEvent(e.target.value)} className="input">
                {events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">الزمن *</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
                dir="ltr"
                placeholder="1:23.45 أو 45.67"
                required
              />
              <p className="text-xs text-gray-400 mt-1">دقائق:ثواني.مئات</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">التاريخ</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">ملاحظات (اختياري)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
            </div>
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
              {loading ? "جاري الحفظ..." : "✅ حفظ"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="card mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          placeholder="🔍 ابحث بالاسم أو نوع السباق..."
        />
        {swimmers.length > 1 && (
          <select value={filterSwimmer} onChange={(e) => setFilterSwimmer(e.target.value)} className="input">
            <option value="all">جميع السباحين</option>
            {swimmers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا توجد أزمنة مسجّلة حالياً</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-abha-green text-abha-green">
                <th className="text-right p-3">السباح</th>
                <th className="text-right p-3">السباق</th>
                <th className="text-right p-3">الزمن</th>
                <th className="text-right p-3">التاريخ</th>
                <th className="text-right p-3">المدرب</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-abha-bg">
                  <td className="p-3 font-semibold">{t.swimmerName}</td>
                  <td className="p-3">{t.event}</td>
                  <td className="p-3">
                    <span className="bg-abha-green text-white px-2 py-1 rounded text-xs font-bold font-mono" dir="ltr">
                      {t.time}
                    </span>
                  </td>
                  <td className="p-3 text-xs" dir="ltr">{t.date}</td>
                  <td className="p-3 text-xs text-gray-500">{t.coachName}</td>
                  <td className="p-3">
                    {canEdit && (
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700">🗑️</button>
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