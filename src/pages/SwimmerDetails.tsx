import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
  specialty1: string;
  specialty2: string;
}

interface TimeRecord {
  id: string;
  event: string;
  time: string;
  date: string;
}

const specialties = [
  "غير محدد",
  "50م حرة", "100م حرة", "200م حرة",
  "50م ظهر", "100م ظهر", "200م ظهر",
  "50م صدر", "100م صدر", "200م صدر",
  "50م فراشة", "100م فراشة",
  "200م متنوع",
];

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
  const [specialty1, setSpecialty1] = useState("غير محدد");
  const [specialty2, setSpecialty2] = useState("غير محدد");

  const canEdit =
    user?.role === "admin" ||
    (user?.role === "coach" && swimmer?.coachId === user.uid);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "swimmers", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
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
          specialty1: data.specialty1 || "غير محدد",
          specialty2: data.specialty2 || "غير محدد",
        };
        setSwimmer(s);
        setBirthDate(s.birthDate);
        setAchievements(s.achievements);
        setSpecialty1(s.specialty1);
        setSpecialty2(s.specialty2);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "times"),
      where("swimmerId", "==", id),
      orderBy("date", "asc")
    );
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

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await updateDoc(doc(db, "swimmers", id), {
        birthDate,
        achievements: achievements.trim(),
        specialty1,
        specialty2,
      });
      setMsg({ type: "success", text: "✅ تم الحفظ" });
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
            <label className="block text-sm font-semibold mb-1">التخصص الأول</label>
            <select
              value={specialty1}
              onChange={(e) => setSpecialty1(e.target.value)}
              className="input"
              disabled={!canEdit}
            >
              {specialties.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">التخصص الثاني</label>
            <select
              value={specialty2}
              onChange={(e) => setSpecialty2(e.target.value)}
              className="input"
              disabled={!canEdit}
            >
              {specialties.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
      </div>

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
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    reverse: true,
                    title: {
                      display: true,
                      text: "الزمن (ثواني)",
                    },
                  },
                  x: {
                    title: {
                      display: true,
                      text: "التاريخ",
                    },
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
                            isBest
                              ? "bg-abha-gold text-white font-bold"
                              : "bg-abha-bg"
                          }`}
                        >
                          <div className="font-mono text-lg" dir="ltr">
                            {t.time}
                          </div>
                          <div className="text-xs opacity-80">{t.date}</div>
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