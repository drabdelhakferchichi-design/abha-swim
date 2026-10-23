import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { db } from "../lib/firebase";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const greetings: Record<string, string> = {
  admin:   "يمكنك إدارة المدربين والسباحين والمستجدات والتقارير.",
  coach:   "يمكنك تسجيل أرقام السباحين، أهدافهم، والبرنامج الأسبوعي.",
  swimmer: "اطّلع على أرقامك، تمارينك، والبطولات القادمة.",
  parent:  "اطّلع على تقارير ابنك، أزمنته، وأرسل استفساراتك.",
};

const ageCategories = ["7-8", "9-10", "11-12", "13-14", "15-17", "عمومي"];

export default function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    swimmers: 0,
    coaches: 0,
    parents: 0,
    news: 0,
  });
  const [swimmersByAge, setSwimmersByAge] = useState<Record<string, number>>({});
  const [swimmersByCoach, setSwimmersByCoach] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const u1 = onSnapshot(collection(db, "swimmers"), (s) => {
      setCounts((c) => ({ ...c, swimmers: s.size }));

      const ageMap: Record<string, number> = {};
      const coachMap: Record<string, number> = {};

      s.forEach((d) => {
        const data = d.data();
        const age = data.ageCategory || "غير محدد";
        ageMap[age] = (ageMap[age] || 0) + 1;
        const coach = data.coachName || "غير محدد";
        coachMap[coach] = (coachMap[coach] || 0) + 1;
      });

      setSwimmersByAge(ageMap);
      setSwimmersByCoach(coachMap);
    });

    const u2 = onSnapshot(collection(db, "news"), (s) =>
      setCounts((c) => ({ ...c, news: s.size }))
    );

    const u3 = onSnapshot(collection(db, "users"), (s) => {
      let coaches = 0;
      let parents = 0;

      s.forEach((d) => {
        const data = d.data();
        if (data.role === "coach") coaches++;
        if (data.role === "parent") parents++;
      });

      setCounts((c) => ({ ...c, coaches, parents }));
    });

    return () => {
      u1();
      u2();
      u3();
    };
  }, [user]);

  if (!user) return null;

  const adminStats = [
    { icon: "🏊", label: "السباحون", value: counts.swimmers, color: "text-abha-green" },
    { icon: "👨‍🏫", label: "المدربون", value: counts.coaches, color: "text-blue-600" },
    { icon: "👨‍👦", label: "أولياء الأمور", value: counts.parents, color: "text-orange-600" },
    { icon: "📰", label: "المستجدات", value: counts.news, color: "text-purple-600" },
  ];

  const ageLabels = ageCategories.filter((a) => swimmersByAge[a] > 0);
  const ageValues = ageLabels.map((a) => swimmersByAge[a]);
  const ageColors = ["#1B5E20", "#2E7D32", "#C9A227", "#0288D1", "#7B1FA2", "#F57C00"];

  const coachLabels = Object.keys(swimmersByCoach);
  const coachValues = coachLabels.map((c) => swimmersByCoach[c]);

  return (
    <Layout>
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-abha-green mb-2">
          مرحباً {user.name || "بك"} 👋
        </h2>
        <p className="text-gray-600">{greetings[user.role]}</p>
      </div>

      {user.role === "admin" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {adminStats.map((s) => (
            <div key={s.label} className="card text-center">
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {user.role === "admin" && counts.swimmers > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="font-bold text-abha-green mb-3">📊 توزيع السباحين حسب الفئة العمرية</h3>
            {ageLabels.length > 0 ? (
              <div style={{ maxHeight: "300px", display: "flex", justifyContent: "center" }}>
                <Doughnut
                  data={{
                    labels: ageLabels,
                    datasets: [
                      {
                        data: ageValues,
                        backgroundColor: ageColors.slice(0, ageLabels.length),
                        borderColor: "#fff",
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
                        labels: { font: { size: 12 }, padding: 12 },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">لا توجد بيانات</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-bold text-abha-green mb-3">👨‍🏫 توزيع السباحين على المدربين</h3>
            {coachLabels.length > 0 ? (
              <div style={{ maxHeight: "300px" }}>
                <Bar
                  data={{
                    labels: coachLabels,
                    datasets: [
                      {
                        label: "عدد السباحين",
                        data: coachValues,
                        backgroundColor: "#1B5E20",
                        borderRadius: 8,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        title: { display: true, text: "عدد السباحين" },
                      },
                      x: {
                        title: { display: true, text: "المدربون" },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">لا توجد بيانات</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: "/trainings",    icon: "📅", title: "جدول التمارين",     desc: "البرنامج الأسبوعي" },
          { to: "/times",        icon: "⏱️", title: "الأرقام والأزمنة",  desc: "النتائج المسجّلة" },
          { to: "/competitions", icon: "🏆", title: "البطولات القادمة",  desc: "المواعيد والنتائج" },
          { to: "/news",         icon: "📢", title: "المستجدات",         desc: "آخر الأخبار" },
        ].map((card) => (
          <a key={card.to} href={card.to} className="card text-center hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-2">{card.icon}</div>
            <h3 className="font-semibold text-abha-green">{card.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
          </a>
        ))}
      </div>
    </Layout>
  );
}