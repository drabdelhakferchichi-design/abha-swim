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
  updateDoc,
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

interface Qualifying {
  id: string;
  championship: string;
  ageCategory: string;
  event: string;
  requiredTime: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date | null;
  // الترشيحات (سباقات تأهل فيها السباح)
  qualified: Array<{ swimmerId: string; swimmerName: string }>;
}

const ageCategories = ["7-8", "9-10", "11-12", "13-14", "15-17", "عمومي"];

const events = [
  "50م حرة", "100م حرة", "200م حرة", "400م حرة", "1500م حرة",
  "50م ظهر", "100م ظهر", "200م ظهر",
  "50م صدر", "100م صدر", "200م صدر",
  "50م فراشة", "100م فراشة", "200م فراشة",
  "200م متنوع", "400م متنوع",
];

export default function Qualifying() {
  const { user } = useAuth();
  const [list, setList] = useState<Qualifying[]>([]);
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [filterChampionship, setFilterChampionship] = useState("all");

  const [championship, setChampionship] = useState("");
  const [ageCategory, setAgeCategory] = useState(ageCategories[0]);
  const [event, setEvent] = useState(events[0]);
  const [requiredTime, setRequiredTime] = useState("");

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
    });
    return () => unsub();
  }, [user]);

  // جلب الأرقام التأهيلية
  useEffect(() => {
    const q = query(collection(db, "qualifying"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: Qualifying[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          championship: data.championship || "",
          ageCategory: data.ageCategory || "",
          event: data.event || "",
          requiredTime: data.requiredTime || "",
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt?.toDate() || null,
          qualified: data.qualified || [],
        };
      });
      setList(items);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !championship.trim() || !requiredTime.trim()) {
      setMsg({ type: "error", text: "املأ الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      await addDoc(collection(db, "qualifying"), {
        championship: championship.trim(),
        ageCategory,
        event,
        requiredTime: requiredTime.trim(),
        createdBy: user.uid,
        createdByName: user.name || user.email,
        qualified: [],
        createdAt: serverTimestamp(),
      });

      setMsg({ type: "success", text: "✅ تم إضافة الرقم التأهيلي" });
      setChampionship("");
      setRequiredTime("");

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
    if (!confirm("حذف هذا الرقم التأهيلي ؟")) return;
    try {
      await deleteDoc(doc(db, "qualifying", id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleQualified = async (record: Qualifying, swimmer: Swimmer) => {
    const isQualified = record.qualified.some((q) => q.swimmerId === swimmer.id);
    let newQualified;

    if (isQualified) {
      newQualified = record.qualified.filter((q) => q.swimmerId !== swimmer.id);
    } else {
      newQualified = [...record.qualified, { swimmerId: swimmer.id, swimmerName: swimmer.name }];
    }

    try {
      await updateDoc(doc(db, "qualifying", record.id), {
        qualified: newQualified,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const canEdit = user?.role === "admin" || user?.role === "coach";

  // البطولات الفريدة
  const championships = Array.from(new Set(list.map((q) => q.championship)));

  const filtered = filterChampionship === "all"
    ? list
    : list.filter((q) => q.championship === filterChampionship);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">🏆 الأرقام التأهيلية</h1>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "إلغاء" : "➕ إضافة رقم تأهيلي"}
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-lg font-bold text-abha-green mb-3">📝 رقم تأهيلي جديد</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">اسم البطولة *</label>
              <input
                type="text"
                value={championship}
                onChange={(e) => setChampionship(e.target.value)}
                className="input"
                placeholder="مثال: بطولة المملكة للناشئين 2026"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">الفئة العمرية *</label>
              <select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} className="input">
                {ageCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">نوع السباق *</label>
              <select value={event} onChange={(e) => setEvent(e.target.value)} className="input">
                {events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold mb-1">الرقم التأهيلي المطلوب *</label>
              <input
                type="text"
                value={requiredTime}
                onChange={(e) => setRequiredTime(e.target.value)}
                className="input"
                dir="ltr"
                placeholder="مثال : 1:23.45"
                required
              />
              <p className="text-xs text-gray-400 mt-1">دقائق:ثواني.مئات</p>
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

      {championships.length > 1 && (
        <div className="card mb-4">
          <label className="block text-sm font-semibold mb-2">فلترة حسب البطولة :</label>
          <select value={filterChampionship} onChange={(e) => setFilterChampionship(e.target.value)} className="input">
            <option value="all">كل البطولات</option>
            {championships.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا توجد أرقام تأهيلية مسجّلة حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => (
            <div key={rec.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-abha-green">🏆 {rec.championship}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="bg-abha-gold text-white px-2 py-0.5 rounded text-xs mr-2">{rec.ageCategory}</span>
                    {rec.event}
                  </p>
                </div>
                {canEdit && (
                  <button onClick={() => handleDelete(rec.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                )}
              </div>

              <div className="bg-abha-bg p-3 rounded mb-3">
                <p className="text-xs text-gray-500 mb-1">الرقم التأهيلي المطلوب :</p>
                <p className="text-2xl font-bold text-abha-green font-mono" dir="ltr">{rec.requiredTime}</p>
              </div>

              {/* قائمة السباحين المؤهلين */}
              {rec.qualified.length > 0 && (
                <div className="bg-green-50 border border-green-200 p-2 rounded mb-3">
                  <p className="text-xs font-semibold text-green-700 mb-1">✅ تأهل :</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.qualified.map((q) => (
                      <span key={q.swimmerId} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                        {q.swimmerName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* للمدرب: تحديد المؤهلين */}
              {user?.role === "coach" && swimmers.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-abha-green cursor-pointer hover:underline">
                    🎯 تحديد السباحين المؤهلين
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {swimmers.filter((s) => s.ageCategory === rec.ageCategory || rec.ageCategory === "عمومي").map((s) => {
                      const isQualified = rec.qualified.some((q) => q.swimmerId === s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleQualified(rec, s)}
                          className={`px-2 py-1 rounded text-xs ${
                            isQualified
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isQualified ? "✓ " : ""}{s.name}
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}

              <p className="text-xs text-gray-400 mt-3">👨‍🏫 {rec.createdByName}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}