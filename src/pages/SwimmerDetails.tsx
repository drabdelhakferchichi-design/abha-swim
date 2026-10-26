import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Specialty {
  stroke: string;
  distance: string;
  percent: number;
}

interface VideoLink {
  title: string;
  url: string;
}

interface CompetitionEntry {
  id: string;
  competitionName: string;
  date: string;
  races: string[];
  gold: number;
  silver: number;
  bronze: number;
  points: number;
}

interface Swimmer {
  id: string;
  name: string;
  ageCategory: string;
  team: string;
  points: number;
  coachId: string;
  coachName: string;
  birthDate: string;
  achievements: string;
  specialties: Specialty[];
  videos: VideoLink[];
  competitions?: CompetitionEntry[];
}

interface TimeRecord {
  id: string;
  event: string;
  time: string;
  date: string;
}

const strokeTypes = ["غير محدد", "حرة", "ظهر", "صدر", "فراشة", "متنوع"];

const distancesByStroke: Record<string, string[]> = {
  "غير محدد": [""],
  "حرة": ["50م", "100م", "200م", "400م", "800م", "1500م"],
  "ظهر": ["50م", "100م", "200م"],
  "صدر": ["50م", "100م", "200م"],
  "فراشة": ["50م", "100م", "200م"],
  "متنوع": ["200م", "400م"],
};

const ageCategoriesList = ["7-8", "9-10", "11-12", "13-14", "15-17", "عمومي"];

const ratings = ["ممتاز", "جيد جداً", "جيد", "يحتاج تحسين"];
const months = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const allRaces = [
  "50م حرة", "100م حرة", "200م حرة", "400م حرة", "1500م حرة",
  "50م ظهر", "100م ظهر", "200م ظهر",
  "50م صدر", "100م صدر", "200م صدر",
  "50م فراشة", "100م فراشة", "200م فراشة",
  "200م متنوع", "400م متنوع",
];

function timeToSeconds(time: string): number {
  if (!time) return 0;
  const parts = time.split(":");
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(time);
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function SwimmerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [swimmer, setSwimmer] = useState<Swimmer | null>(null);
  const [times, setTimes] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [birthDate, setBirthDate] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [achievements, setAchievements] = useState("");
  const [specialties, setSpecialties] = useState<Specialty[]>([
    { stroke: "غير محدد", distance: "", percent: 0 },
    { stroke: "غير محدد", distance: "", percent: 0 },
    { stroke: "غير محدد", distance: "", percent: 0 },
    { stroke: "غير محدد", distance: "", percent: 0 },
  ]);
  const [videos, setVideos] = useState<VideoLink[]>([]);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  const [competitions, setCompetitions] = useState<CompetitionEntry[]>([]);
  const [newCompetitionName, setNewCompetitionName] = useState("");
  const [newCompetitionDate, setNewCompetitionDate] = useState("");

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportMonth, setReportMonth] = useState(months[new Date().getMonth()]);
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportRating, setReportRating] = useState(ratings[1]);
  const [reportNotes, setReportNotes] = useState("");
  const [reportAchievements, setReportAchievements] = useState("");
  const [reportSaving, setReportSaving] = useState(false);

  // ✅ المدرب فقط يمكنه التعديل (وليس أبو ناصر)
  const canEdit =
    user?.role === "coach" && swimmer?.coachId === user.uid;

  // ✅ أبو ناصر يرى فقط (بدون تعديل)
  const isReadOnly = user?.role === "admin";

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "swimmers", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const loadedSpecialties: Specialty[] =
          data.specialties && data.specialties.length > 0
            ? data.specialties
            : [
                { stroke: "غير محدد", distance: "", percent: 0 },
                { stroke: "غير محدد", distance: "", percent: 0 },
                { stroke: "غير محدد", distance: "", percent: 0 },
                { stroke: "غير محدد", distance: "", percent: 0 },
              ];
        const padded = [...loadedSpecialties];
        while (padded.length < 4) {
          padded.push({ stroke: "غير محدد", distance: "", percent: 0 });
        }

        const s: Swimmer = {
          id: snap.id,
          name: data.name || "",
          ageCategory: data.ageCategory || "",
          team: data.team || "",
          points: data.points || 0,
          coachId: data.coachId || "",
          coachName: data.coachName || "",
          birthDate: data.birthDate || "",
          achievements: data.achievements || "",
          specialties: padded.slice(0, 4),
          videos: data.videos || [],
          competitions: data.competitions || [],
        };
        setSwimmer(s);
        setBirthDate(s.birthDate);
        setAgeCategory(s.ageCategory || "7-8");
        setAchievements(s.achievements);
        setSpecialties(s.specialties);
        setVideos(s.videos);
        setCompetitions(s.competitions || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "times"), where("swimmerId", "==", id));
    const unsub = onSnapshot(q, (snap) => {
      const items: TimeRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          event: data.event || "",
          time: data.time || "",
          date: data.date || "",
        };
      });
      setTimes(items);
    });
    return () => unsub();
  }, [id]);

  const updateSpecialty = (
    index: number,
    field: keyof Specialty,
    value: string | number
  ) => {
    setSpecialties((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "stroke") updated[index].distance = "";
      return updated;
    });
  };

  const handleSave = async () => {
    if (!id) return;

    const validSpecialties = specialties.filter(
      (s) => s.stroke !== "غير محدد" && s.percent > 0
    );

    if (validSpecialties.length > 0) {
      const sum = validSpecialties.reduce((acc, s) => acc + s.percent, 0);
      if (sum !== 100) {
        setMsg({ type: "error", text: `⚠️ مجموع النسب = ${sum}% (يجب 100%)` });
        return;
      }
    }

    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await updateDoc(doc(db, "swimmers", id), {
        birthDate,
        ageCategory,
        achievements: achievements.trim(),
        specialties: validSpecialties,
        videos,
        competitions,
      });
      setMsg({ type: "success", text: "✅ تم الحفظ" });
      setTimeout(() => setMsg({ type: "", text: "" }), 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg({ type: "error", text: error.message || "خطأ" });
    }
    setSaving(false);
  };

  const handleAddVideo = () => {
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) return;
    const ytId = extractYouTubeId(newVideoUrl.trim());
    if (!ytId) {
      setMsg({ type: "error", text: "⚠️ رابط YouTube غير صالح" });
      return;
    }
    setVideos([...videos, { title: newVideoTitle.trim(), url: newVideoUrl.trim() }]);
    setNewVideoTitle("");
    setNewVideoUrl("");
    setMsg({ type: "", text: "" });
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const handleSaveReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !swimmer || !reportNotes.trim()) {
      setMsg({ type: "error", text: "املأ الملاحظات" });
      return;
    }

    setReportSaving(true);
    try {
      await addDoc(collection(db, "reports"), {
        swimmerId: swimmer.id,
        swimmerName: swimmer.name,
        month: `${reportMonth} ${reportYear}`,
        rating: reportRating,
        notes: reportNotes.trim(),
        achievements: reportAchievements.trim(),
        coachId: user.uid,
        coachName: user.name || user.email,
        createdAt: serverTimestamp(),
      });
      setMsg({ type: "success", text: "✅ تم حفظ التقرير" });
      setReportNotes("");
      setReportAchievements("");
      setShowReportForm(false);
      setTimeout(() => setMsg({ type: "", text: "" }), 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg({ type: "error", text: error.message || "خطأ" });
    }
    setReportSaving(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </Layout>
    );
  }

  if (!swimmer) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-500">السباح غير موجود</p>
          <button onClick={() => navigate("/swimmers")} className="btn-primary mt-4">
            رجوع
          </button>
        </div>
      </Layout>
    );
  }

  if (user?.role === "coach" && swimmer.coachId !== user.uid) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-500">🔒 غير مصرح لك بعرض هذا السباح</p>
          <button onClick={() => navigate("/swimmers")} className="btn-primary mt-4">
            رجوع
          </button>
        </div>
      </Layout>
    );
  }

  const age = swimmer.birthDate
    ? Math.floor(
        (Date.now() - new Date(swimmer.birthDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const actualSpecialties = swimmer.specialties.filter(
    (s) => s.stroke !== "غير محدد" && s.percent > 0
  );
  const hasSpecialties = actualSpecialties.length > 0;

  const chartColors = ["#1B5E20", "#C9A227", "#0288D1", "#7B1FA2"];

  const timesByEvent: Record<string, TimeRecord[]> = {};
  times.forEach((t) => {
    if (!timesByEvent[t.event]) timesByEvent[t.event] = [];
    timesByEvent[t.event].push(t);
  });

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <button
            onClick={() => navigate("/swimmers")}
            className="text-sm text-gray-500 hover:text-abha-green mb-1"
          >
            ← رجوع
          </button>
          <h1 className="text-2xl font-bold text-abha-green">🏊 {swimmer.name}</h1>
          {isReadOnly && (
            <p className="text-xs text-gray-500 mt-1">👁️ عرض فقط (كما أدخله المدرب)</p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="btn-primary text-sm"
          >
            {showReportForm ? "إلغاء" : "➕ تقرير شهري"}
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 mb-4 ${
          msg.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      {showReportForm && canEdit && (
        <form onSubmit={handleSaveReport} className="card mb-6 space-y-3">
          <h2 className="text-lg font-bold text-abha-green">📝 تقرير شهري</h2>

          <div className="grid grid-cols-2 gap-3">
            <select value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="input">
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="input" dir="ltr" />
            <select value={reportRating} onChange={(e) => setReportRating(e.target.value)} className="input col-span-2">
              {ratings.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <input
            type="text"
            value={reportAchievements}
            onChange={(e) => setReportAchievements(e.target.value)}
            className="input"
            placeholder="الإنجازات (اختياري)"
          />

          <textarea
            value={reportNotes}
            onChange={(e) => setReportNotes(e.target.value)}
            className="input"
            rows={4}
            placeholder="ملاحظات المدرب..."
            required
          />

          <button type="submit" disabled={reportSaving} className="btn-primary disabled:opacity-50">
            {reportSaving ? "جاري الحفظ..." : "✅ حفظ التقرير"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl mb-1">📅</div>
          <div className="text-2xl font-bold text-abha-green">{age !== null ? `${age} سنة` : "-"}</div>
          <div className="text-xs text-gray-500">العمر</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">🏊</div>
          <div className="text-2xl font-bold text-abha-green">{swimmer.ageCategory}</div>
          <div className="text-xs text-gray-500">الفئة</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">👥</div>
          <div className="text-xl font-bold text-blue-600">{swimmer.team || "-"}</div>
          <div className="text-xs text-gray-500">الفريق</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-abha-gold">{swimmer.points}</div>
          <div className="text-xs text-gray-500">النقاط</div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-4">📋 البيانات</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">تاريخ الميلاد</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input" dir="ltr" disabled={!canEdit} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">الفئة العمرية</label>
            <select value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)} className="input" disabled={!canEdit}>
              {ageCategoriesList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">المدرب</label>
          <input type="text" value={swimmer.coachName || "-"} className="input bg-gray-50" disabled />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">الإنجازات</label>
          <textarea
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
            className="input"
            rows={3}
            disabled={!canEdit}
            placeholder="رقم شخصي، بطولات..."
          />
        </div>
      </div>

      {/* ✅ قسم الإحصائيات */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-4">📊 إحصائيات سريعة</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-abha-bg rounded-lg">
            <div className="text-3xl mb-1">⏱️</div>
            <div className="text-2xl font-bold text-abha-green">{times.length}</div>
            <div className="text-xs text-gray-500">زمن مسجّل</div>
          </div>
          <div className="text-center p-3 bg-abha-bg rounded-lg">
            <div className="text-3xl mb-1">🏅</div>
            <div className="text-2xl font-bold text-abha-gold">{Object.keys(timesByEvent).length}</div>
            <div className="text-xs text-gray-500">نوع سباق</div>
          </div>
          <div className="text-center p-3 bg-abha-bg rounded-lg">
            <div className="text-3xl mb-1">🎯</div>
            <div className="text-2xl font-bold text-blue-600">{actualSpecialties.length}</div>
            <div className="text-xs text-gray-500">تخصص</div>
          </div>
          <div className="text-center p-3 bg-abha-bg rounded-lg">
            <div className="text-3xl mb-1">⭐</div>
            <div className="text-2xl font-bold text-purple-600">{swimmer.points}</div>
            <div className="text-xs text-gray-500">نقطة</div>
          </div>
        </div>

        {Object.keys(timesByEvent).length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-abha-green mb-2">🏆 أفضل الأرقام الشخصية</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.keys(timesByEvent).map((event) => {
                const eventTimes = timesByEvent[event];
                const bestTime = Math.min(...eventTimes.map((t) => timeToSeconds(t.time)));
                const bestRecord = eventTimes.find((t) => timeToSeconds(t.time) === bestTime);
                return (
                  <div key={event} className="flex items-center justify-between p-2 bg-yellow-50 border-r-4 border-abha-gold rounded">
                    <div>
                      <p className="text-sm font-semibold">{event}</p>
                      <p className="text-xs text-gray-500">{bestRecord?.date || ""}</p>
                    </div>
                    <span className="bg-abha-gold text-white px-2 py-1 rounded font-mono font-bold text-sm">
                      {bestRecord?.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {actualSpecialties.length > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-br from-abha-green/10 to-abha-gold/10 rounded-lg">
            <p className="text-sm text-gray-600">🎯 التخصص الأساسي :</p>
            <p className="text-lg font-bold text-abha-green">
              {actualSpecialties[0].stroke} {actualSpecialties[0].distance}
              <span className="text-sm mr-2">({actualSpecialties[0].percent}%)</span>
            </p>
          </div>
        )}
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-4">🎯 التخصصات</h2>

        {canEdit && (
          <div className="space-y-2 mb-4">
            {specialties.map((spec, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 bg-abha-bg rounded">
                <div className="col-span-5">
                  <label className="block text-xs mb-1">النوع {idx + 1}</label>
                  <select value={spec.stroke} onChange={(e) => updateSpecialty(idx, "stroke", e.target.value)} className="input text-sm">
                    {strokeTypes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs mb-1">المسافة</label>
                  <select value={spec.distance} onChange={(e) => updateSpecialty(idx, "distance", e.target.value)} className="input text-sm" disabled={spec.stroke === "غير محدد"}>
                    <option value="">-</option>
                    {(distancesByStroke[spec.stroke] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs mb-1">%</label>
                  <input type="number" value={spec.percent || ""} onChange={(e) => updateSpecialty(idx, "percent", Number(e.target.value) || 0)} className="input text-sm" min={0} max={100} disabled={spec.stroke === "غير محدد"} />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasSpecialties && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="mx-auto" style={{ maxHeight: "300px", maxWidth: "300px" }}>
              <Doughnut
                data={{
                  labels: actualSpecialties.map((s) => `${s.stroke} ${s.distance} (${s.percent}%)`),
                  datasets: [{
                    data: actualSpecialties.map((s) => s.percent),
                    backgroundColor: chartColors.slice(0, actualSpecialties.length),
                    borderColor: "#fff",
                    borderWidth: 3,
                  }],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { position: "bottom", rtl: true, labels: { font: { size: 11 } } } },
                }}
              />
            </div>
            <div className="space-y-2">
              {actualSpecialties.map((s, idx) => (
                <div key={idx} className="p-2 rounded text-white text-sm" style={{ backgroundColor: chartColors[idx] }}>
                  {s.stroke} {s.distance} — <strong>{s.percent}%</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🏆 البطولات */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-4">🏆 البطولات والنتائج</h2>

        {canEdit && (
          <div className="bg-abha-bg p-3 rounded-lg mb-4">
            <h3 className="text-sm font-semibold mb-2">➕ إضافة بطولة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                value={newCompetitionName}
                onChange={(e) => setNewCompetitionName(e.target.value)}
                className="input text-sm sm:col-span-2"
                placeholder="اسم البطولة (مثلاً: بطولة المملكة 2026)"
              />
              <input
                type="date"
                value={newCompetitionDate}
                onChange={(e) => setNewCompetitionDate(e.target.value)}
                className="input text-sm"
                dir="ltr"
              />
            </div>
            <button
              onClick={() => {
                if (!newCompetitionName.trim()) return;
                const newComp: CompetitionEntry = {
                  id: `comp_${Date.now()}`,
                  competitionName: newCompetitionName.trim(),
                  date: newCompetitionDate,
                  races: [],
                  gold: 0,
                  silver: 0,
                  bronze: 0,
                  points: 0,
                };
                setCompetitions([...competitions, newComp]);
                setNewCompetitionName("");
                setNewCompetitionDate("");
              }}
              className="btn-gold text-sm"
            >
              ➕ إضافة بطولة
            </button>
          </div>
        )}

        {competitions.length === 0 ? (
          <p className="text-center text-gray-500 py-4">لا توجد بطولات مسجّلة</p>
        ) : (
          <div className="space-y-3">
            {competitions.map((comp, cIdx) => (
              <div key={comp.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-abha-green">{comp.competitionName}</h3>
                    {comp.date && (
                      <p className="text-xs text-gray-500" dir="ltr">📅 {comp.date}</p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => {
                        if (!confirm("حذف هذه البطولة ؟")) return;
                        setCompetitions(competitions.filter((_, i) => i !== cIdx));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {/* السباقات المشارك فيها */}
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">🏊 السباقات:</p>
                  <div className="flex flex-wrap gap-1">
                    {allRaces.map((race) => (
                      <button
                        key={race}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          const updated = [...competitions];
                          const races = [...updated[cIdx].races];
                          if (races.includes(race)) {
                            updated[cIdx].races = races.filter((r) => r !== race);
                          } else {
                            updated[cIdx].races = [...races, race];
                          }
                          setCompetitions(updated);
                        }}
                        className={`px-2 py-1 rounded text-xs ${
                          comp.races.includes(race)
                            ? "bg-abha-green text-white"
                            : "bg-gray-100 text-gray-600"
                        } ${!canEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {comp.races.includes(race) ? "✓ " : ""}{race}
                      </button>
                    ))}
                  </div>
                </div>

                {/* الميداليات والنقاط */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">🥇 ذهبية</label>
                    <input
                      type="number"
                      value={comp.gold || ""}
                      onChange={(e) => {
                        const updated = [...competitions];
                        updated[cIdx].gold = Number(e.target.value) || 0;
                        setCompetitions(updated);
                      }}
                      className="input text-sm"
                      disabled={!canEdit}
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">🥈 فضية</label>
                    <input
                      type="number"
                      value={comp.silver || ""}
                      onChange={(e) => {
                        const updated = [...competitions];
                        updated[cIdx].silver = Number(e.target.value) || 0;
                        setCompetitions(updated);
                      }}
                      className="input text-sm"
                      disabled={!canEdit}
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">🥉 برونزية</label>
                    <input
                      type="number"
                      value={comp.bronze || ""}
                      onChange={(e) => {
                        const updated = [...competitions];
                        updated[cIdx].bronze = Number(e.target.value) || 0;
                        setCompetitions(updated);
                      }}
                      className="input text-sm"
                      disabled={!canEdit}
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">⭐ نقاط</label>
                    <input
                      type="number"
                      value={comp.points || ""}
                      onChange={(e) => {
                        const updated = [...competitions];
                        updated[cIdx].points = Number(e.target.value) || 0;
                        setCompetitions(updated);
                      }}
                      className="input text-sm"
                      disabled={!canEdit}
                      min={0}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-4">🎥 فيديوهات تعليمية</h2>

        {canEdit && (
          <div className="bg-abha-bg p-3 rounded-lg mb-4">
            <h3 className="text-sm font-semibold mb-2">➕ إضافة فيديو YouTube</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input type="text" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} className="input text-sm" placeholder="عنوان الفيديو..." />
              <input type="url" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} className="input text-sm" dir="ltr" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <button onClick={handleAddVideo} className="btn-gold text-sm">➕ إضافة</button>
          </div>
        )}

        {videos.length === 0 ? (
          <p className="text-center text-gray-500 py-4">لا توجد فيديوهات</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((v, idx) => {
              const ytId = extractYouTubeId(v.url);
              return (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  {ytId && (
                    <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full aspect-video" allowFullScreen title={v.title} />
                  )}
                  <div className="p-2 flex items-center justify-between bg-abha-bg">
                    <p className="text-sm font-semibold">{v.title}</p>
                    {canEdit && (
                      <button onClick={() => handleRemoveVideo(idx)} className="text-red-500 hover:text-red-700">🗑️</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

            {canEdit && (
        <div className="mb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "💾 حفظ جميع التعديلات"}
          </button>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-bold text-abha-green mb-4">
          ⏱️ الأزمنة والتطور
        </h2>

        {times.length === 0 ? (
          <p className="text-gray-500 text-center py-6">لا توجد أزمنة مسجّلة</p>
        ) : (
          <div className="space-y-8">
            {Object.keys(timesByEvent).map((event) => {
              const eventTimes = timesByEvent[event];
              const bestTime = Math.min(...eventTimes.map((t) => timeToSeconds(t.time)));
              const sortedForChart = [...eventTimes].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
              );

              return (
                <div key={event} className="border-b pb-6 last:border-b-0">
                  <h3 className="font-bold text-abha-green mb-2">🏅 {event}</h3>

                  {sortedForChart.length > 1 && (
                    <div className="bg-white p-3 rounded mb-4" style={{ maxHeight: "300px" }}>
                      <Line
                        data={{
                          labels: sortedForChart.map((t) => t.date),
                          datasets: [
                            {
                              label: event,
                              data: sortedForChart.map((t) => timeToSeconds(t.time)),
                              borderColor: "#1B5E20",
                              backgroundColor: "rgba(27, 94, 32, 0.2)",
                              tension: 0.3,
                              pointBackgroundColor: "#C9A227",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: {
                            y: {
                              reverse: true,
                              title: { display: true, text: "الزمن (ثواني)" },
                            },
                          },
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {eventTimes.map((t) => {
                      const isBest = timeToSeconds(t.time) === bestTime;
                      return (
                        <div
                          key={t.id}
                          className={`p-2 rounded text-center ${
                            isBest ? "bg-abha-gold text-white font-bold" : "bg-abha-bg"
                          }`}
                        >
                          <div className="font-mono text-lg" dir="ltr">
                            {t.time}
                          </div>
                          <div className="text-xs opacity-80">{t.date || "-"}</div>
                          {isBest && <div className="text-xs mt-1">🏆</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}