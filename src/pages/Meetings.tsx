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

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  zoomUrl: string;
  audience: string;
  notes: string;
  createdByName: string;
  createdAt: Date | null;
}

const audiences = [
  "المدربون فقط",
  "المدربون + السباحون",
  "المدربون + أولياء الأمور",
  "أولياء الأمور فقط",
  "الجميع",
];

export default function Meetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [zoomUrl, setZoomUrl] = useState("");
  const [audience, setAudience] = useState(audiences[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const q = query(collection(db, "meetings"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: Meeting[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "",
          date: data.date || "",
          time: data.time || "",
          zoomUrl: data.zoomUrl || "",
          audience: data.audience || "",
          notes: data.notes || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });
      setMeetings(items);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !date || !time || !zoomUrl.trim()) {
      setMsg({ type: "error", text: "املأ الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      await addDoc(collection(db, "meetings"), {
        title: title.trim(),
        date,
        time,
        zoomUrl: zoomUrl.trim(),
        audience,
        notes: notes.trim(),
        createdBy: user.uid,
        createdByName: user.name || user.email,
        createdAt: serverTimestamp(),
      });

      setMsg({ type: "success", text: "✅ تم إنشاء الاجتماع" });
      setTitle("");
      setDate("");
      setTime("");
      setZoomUrl("");
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
    if (!confirm("حذف هذا الاجتماع ؟")) return;
    try {
      await deleteDoc(doc(db, "meetings", id));
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = user?.role === "admin";

  // فلترة حسب الدور
  const visibleMeetings = meetings.filter((m) => {
    if (user?.role === "admin") return true;
    if (user?.role === "coach") {
      return m.audience.includes("المدربون") || m.audience === "الجميع";
    }
    if (user?.role === "parent") {
      return m.audience.includes("أولياء الأمور") || m.audience === "الجميع";
    }
    if (user?.role === "swimmer") {
      return m.audience.includes("السباحون") || m.audience === "الجميع";
    }
    return false;
  });

  // تصنيف: قادمة / سابقة
  const today = new Date().toISOString().split("T")[0];
  const upcoming = visibleMeetings.filter((m) => m.date >= today);
  const past = visibleMeetings.filter((m) => m.date < today);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">📹 اجتماعات Zoom</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "إلغاء" : "➕ إنشاء اجتماع"}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-lg font-bold text-abha-green mb-3">📝 اجتماع جديد</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">عنوان الاجتماع *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="مثال: اجتماع شهري للمدربين"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">التاريخ *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" dir="ltr" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">الوقت *</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" dir="ltr" required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">رابط Zoom *</label>
              <input
                type="url"
                value={zoomUrl}
                onChange={(e) => setZoomUrl(e.target.value)}
                className="input"
                dir="ltr"
                placeholder="https://zoom.us/j/123456789"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">الجمهور المستهدف *</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input">
                {audiences.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
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
              {loading ? "جاري الإنشاء..." : "✅ إنشاء"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* الاجتماعات القادمة */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-3">📅 الاجتماعات القادمة</h2>
        {upcoming.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">لا توجد اجتماعات قادمة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <div key={m.id} className="card border-r-4 border-abha-green">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-abha-green">{m.title}</h3>
                    <p className="text-sm text-gray-600">
                      📅 {m.date} — 🕐 {m.time}
                    </p>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs mt-1 inline-block">
                      👥 {m.audience}
                    </span>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                  )}
                </div>
                {m.notes && (
                  <p className="text-sm text-gray-700 bg-abha-bg p-2 rounded mb-2">📝 {m.notes}</p>
                )}
                <a
                  href={m.zoomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  🎥 دخول الاجتماع
                </a>
                <p className="text-xs text-gray-400 mt-2">👤 {m.createdByName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الاجتماعات السابقة */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-500 mb-3">📁 الاجتماعات السابقة</h2>
          <div className="space-y-2">
            {past.map((m) => (
              <div key={m.id} className="card opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-700">{m.title}</h3>
                    <p className="text-xs text-gray-500">📅 {m.date} — {m.time}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}