import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const greetings: Record<string, string> = {
  admin:   "يمكنك إدارة المدربين والسباحين والمستجدات والتقارير.",
  coach:   "يمكنك تسجيل أرقام السباحين، أهدافهم، والبرنامج الأسبوعي.",
  swimmer: "اطّلع على أرقامك، تمارينك، والبطولات القادمة.",
  parent:  "اطّلع على تقارير ابنك، أزمنته، وأرسل استفساراتك.",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    swimmers: 0, coaches: 0, news: 0, users: 0,
  });

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "swimmers"), (s) =>
      setCounts((c) => ({ ...c, swimmers: s.size }))
    );
    const u2 = onSnapshot(collection(db, "news"), (s) =>
      setCounts((c) => ({ ...c, news: s.size }))
    );
    const u3 = onSnapshot(collection(db, "users"), (s) => {
      let coaches = 0;
      s.forEach((d) => { if (d.data().role === "coach") coaches++; });
      setCounts((c) => ({ ...c, users: s.size, coaches }));
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  if (!user) return null;

  const stats = [
    { icon: "🏊", label: "السباحون",   value: counts.swimmers, color: "text-abha-green" },
    { icon: "👨‍🏫", label: "المدربون",   value: counts.coaches,  color: "text-blue-600" },
    { icon: "📰", label: "المستجدات",  value: counts.news,     color: "text-orange-600" },
    { icon: "👥", label: "المستخدمون", value: counts.users,    color: "text-purple-600" },
  ];

  const cards = [
    { to: "/trainings",    icon: "📅", title: "جدول التمارين",   desc: "البرنامج الأسبوعي" },
    { to: "/times",        icon: "⏱️", title: "الأرقام والأزمنة", desc: "النتائج المسجّلة" },
    { to: "/competitions", icon: "🏆", title: "البطولات القادمة", desc: "المواعيد والنتائج" },
    { to: "/news",         icon: "📢", title: "المستجدات",        desc: "آخر الأخبار" },
  ];

  return (
    <Layout>
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-abha-green mb-2">
          مرحباً {user.name || "بك"} 👋
        </h2>
        <p className="text-gray-600">{greetings[user.role]}</p>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* البطاقات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
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