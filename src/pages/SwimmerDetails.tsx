import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
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

function timeToSeconds(time: string): number {
  if (!time) return 0;
  const parts = time.split(":");
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(time);
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
  const [achievements, setAchievements] = useState("");
  const [specialties, setSpecialties] = useState<Specialty[]>([
    { stroke: "غير محدد", distance: "", percent: 0 },
    { stroke: "غير محدد", distance: "", percent: 0 },
    { stroke: "غير محدد", distance: "", percent: 0 },
    { stroke: "غير محدد", distance: "", percent: 0 },
  ]);

  const canEdit =
    user?.role === "admin" ||
    (user?.role === "coach" && swimmer?.coachId === user.uid);

  // جلب بيانات السباح
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

        // ضمان 4 عناصر
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
        };
        setSwimmer(s);
        setBirthDate(s.birthDate);
        setAchievements(s.achievements);
        setSpecialties(s.specialties);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  // جلب الأزمنة
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

      // إذا تغير النوع، نصفر المسافة
      if (field === "stroke") {
        updated[index].distance = "";
      }

      return updated;
    });
  };

  const totalPercent = specialties.reduce((sum, s) => sum + (s.percent || 0), 0);

  const handleSave = async () => {
    if (!id) return;

    // فلترة التخصصات الفعلية (نوع محدد + نسبة > 0)
    const validSpecialties = specialties.filter(
      (s) => s.stroke !== "غير محدد" && s.percent > 0
    );

    // التحقق: مجموع النسب يجب أن يكون 100% أو 0
    if (validSpecialties.length > 0) {
      const sum = validSpecialties.reduce((acc, s) => acc + s.percent, 0);
      if (sum !== 100) {
        setMsg({
          type: "error",
          text: `⚠️ مجموع النسب يجب أن يكون 100% (الحالي: ${sum}%)`,
        });
        return;
      }
    }

    setSaving(true);
    setMsg({ type: "", text: "" });

    try {
      await updateDoc(doc(db, "swimmers", id), {
        birthDate,
        achievements: achievements.trim(),
        specialties: validSpecialties,
      });
      setMsg({ type: "success", text: "✅ تم الحفظ بنجاح" });
      setTimeout(() => setMsg({ type: "", text: "" }), 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg({ type: "error", text: error.message || "خطأ" });
    }
    setSaving(false);
  };

  const timesByEvent: Record<string, TimeRecord[]> = {};
  times.forEach((t) => {
    if (!timesByEvent[t.event]) timesByEvent[t.event] = [];
    timesByEvent[t.event].push(t);
  });

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

  // ألوان الرسم الدائري
  const chartColors = ["#1B5E20", "#C9A227", "#0288D1", "#7B1FA2"];

  return (
    <Layout>
      <div className="mb-6">
        <button
          onClick={() => navigate("/swimmers")}
          className="text-sm text-gray-500 hover:text-abha-green mb-1"
        >
          ← رجوع للسباحين
        </button>
        <h1 className="text-2xl font-bold text-abha-green">🏊 {swimmer.name}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl mb-1">📅</div>
          <div className="text-2xl font-bold text-abha-green">
            {age !== null ? `${age} سنة` : "-"}
          </div>
          <div className="text-xs text-gray-500 mt-1">العمر</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">🏊</div>
          <div className="text-2xl font-bold text-abha-green">{swimmer.ageCategory}</div>
          <div className="text-xs text-gray-500 mt-1">الفئة</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">👥</div>
          <div className="text-xl font-bold text-blue-600">{swimmer.team || "-"}</div>
          <div className="text-xs text-gray-500 mt-1">الفريق</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-abha-gold">{swimmer.points}</div>
          <div className="text-xs text-gray-500 mt-1">النقاط</div>
        </div>
      </div>

      {/* البيانات التفصيلية */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-4">📋 البيانات التفصيلية</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">تاريخ الميلاد</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="input"
              dir="ltr"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">المدرب</label>
            <input
              type="text"
              value={swimmer.coachName || "-"}
              className="input bg-gray-50"
              disabled
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-1">الإنجازات</label>
          <textarea
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
            className="input"
            rows={3}
            placeholder="رقم شخصي في 50م حرة، المركز الأول في بطولة..."
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* التخصصات */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-abha-green mb-4">
          🎯 التخصصات (4 كحد أقصى)
        </h2>

        {canEdit && (
          <div className="space-y-3 mb-4">
            {specialties.map((spec, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-end p-3 bg-abha-bg rounded-lg"
              >
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">
                    التخصص {idx + 1} — النوع
                  </label>
                  <select
                    value={spec.stroke}
                    onChange={(e) => updateSpecialty(idx, "stroke", e.target.value)}
                    className="input text-sm"
                  >
                    {strokeTypes.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">
                    المسافة
                  </label>
                  <select
                    value={spec.distance}
                    onChange={(e) => updateSpecialty(idx, "distance", e.target.value)}
                    className="input text-sm"
                    disabled={spec.stroke === "غير محدد"}
                  >
                    <option value="">-</option>
                    {(distancesByStroke[spec.stroke] || []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-xs font-semibold mb-1 text-gray-600">
                    النسبة %
                  </label>
                  <input
                    type="number"
                    value={spec.percent || ""}
                    onChange={(e) =>
                      updateSpecialty(idx, "percent", Number(e.target.value) || 0)
                    }
                    className="input text-sm"
                    min={0}
                    max={100}
                    disabled={spec.stroke === "غير محدد"}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}

            <div
              className={`p-3 rounded-lg text-sm font-semibold ${
                totalPercent === 100
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-yellow-50 text-yellow-700 border border-yellow-200"
              }`}
            >
              مجموع النسب : <strong>{totalPercent}%</strong>
              {totalPercent !== 100 && totalPercent > 0 && (
                <span className="mr-2">(يجب أن يكون 100%)</span>
              )}
            </div>
          </div>
        )}

        {canEdit && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ البيانات"}
            </button>
            {msg.text && (
              <span
                className={`text-sm ${
                  msg.type === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {msg.text}
              </span>
            )}
          </div>
        )}

        {/* عرض التخصصات (لكل الأدوار) */}
        {hasSpecialties && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="mx-auto" style={{ maxHeight: "320px", maxWidth: "320px" }}>
              <Doughnut
                data={{
                  labels: actualSpecialties.map(
                    (s) => `${s.stroke} ${s.distance} (${s.percent}%)`
                  ),
                  datasets: [
                    {
                      data: actualSpecialties.map((s) => s.percent),
                      backgroundColor: chartColors.slice(0, actualSpecialties.length),
                      borderColor: "#ffffff",
                      borderWidth: 3,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: "bottom",
                      rtl: true,
                      labels: {
                        font: { size: 12 },
                        padding: 12,
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="space-y-2">
              {actualSpecialties.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg text-white"
                  style={{ backgroundColor: chartColors[idx] }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-80">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🏅"}{" "}
                        التخصص {idx + 1}
                      </p>
                      <p className="font-bold">
                        {s.stroke} {s.distance}
                      </p>
                    </div>
                    <div className="text-2xl font-bold">{s.percent}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* الأزمنة والتطور */}
      <div className="card">
        <h2 className="text-lg font-bold text-abha-green mb-4">⏱️ الأزمنة والتطور</h2>

        {times.length === 0 ? (
          <p className="text-gray-500 text-center py-6">لا توجد أزمنة مسجّلة بعد</p>
        ) : (
          <div className="space-y-8">
            {Object.keys(timesByEvent).map((event) => {
              const eventTimes = timesByEvent[event];
              const bestTime = Math.min(...eventTimes.map((t) => timeToSeconds(t.time)));

              const sortedForChart = [...eventTimes].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
              );

              const chartData = {
                labels: sortedForChart.map((t) => t.date),
                datasets: [
                  {
                    label: event,
                    data: sortedForChart.map((t) => timeToSeconds(t.time)),
                    borderColor: "#1B5E20",
                    backgroundColor: "rgba(27, 94, 32, 0.2)",
                    tension: 0.3,
                    pointBackgroundColor: "#C9A227",
                    pointBorderColor: "#1B5E20",
                    pointRadius: 5,
                    pointHoverRadius: 8,
                  },
                ],
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    reverse: true,
                    title: { display: true, text: "الزمن (ثواني)" },
                  },
                  x: {
                    title: { display: true, text: "التاريخ" },
                  },
                },
              };

              return (
                <div key={event} className="border-b pb-6 last:border-b-0">
                  <h3 className="font-bold text-abha-green mb-2">🏅 {event}</h3>

                  {sortedForChart.length > 1 && (
                    <div className="bg-white p-3 rounded mb-4" style={{ maxHeight: "300px" }}>
                      <Line data={chartData} options={chartOptions} />
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
                          {isBest && <div className="text-xs mt-1">🏆 أفضل رقم</div>}
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