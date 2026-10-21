import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

// ─── لوحة أبو ناصر ───
function AdminDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ swimmers: 0, coaches: 0, parents: 0, news: 0 });

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "swimmers"), (s) =>
      setCounts((c) => ({ ...c, swimmers: s.size }))
    );
    const u2 = onSnapshot(collection(db, "news"), (s) =>
      setCounts((c) => ({ ...c, news: s.size }))
    );
    const u3 = onSnapshot(collection(db, "users"), (s) => {
      let coaches = 0, parents = 0;
      s.forEach((d) => {
        const role = d.data().role;
        if (role === "coach") coaches++;
        if (role === "parent") parents++;
      });
      setCounts((c) => ({ ...c, coaches, parents }));
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  if (!user) return null;

  const stats = [
    { icon: "🏊", label: "السباحون", value: counts.swimmers, color: "text-abha-green" },
    { icon: "👨‍🏫", label: "المدربون", value: counts.coaches, color: "text-blue-600" },
    { icon: "👨‍👦", label: "أولياء الأمور", value: counts.parents, color: "text-orange-600" },
    { icon: "📰", label: "المستجدات", value: counts.news, color: "text-purple-600" },
  ];

  const cards = [
    { to: "/swimmers", icon: "🏊", title: "السباحون", desc: "إدارة السباحين" },
    { to: "/coaches", icon: "👨‍🏫", title: "المدربون", desc: "إدارة المدربين" },
    { to: "/parents", icon: "👨‍👦", title: "أولياء الأمور", desc: "إدارة الحسابات" },
    { to: "/news", icon: "📢", title: "المستجدات", desc: "نشر الأخبار" },
  ];

  return (
    <>
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-abha-green mb-2">
          مرحباً {user.name} 👋
        </h2>
        <p className="text-gray-600">لوحة تحكم مشرف السياحة</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <a key={card.to} href={card.to} className="card text-center hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-2">{card.icon}</div>
            <h3 className="font-semibold text-abha-green">{card.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
          </a>
        ))}
      </div>
    </>
  );
}

// ─── لوحة المدرب ───
function CoachDashboard() {
  const { user } = useAuth();
  const [mySwimmers, setMySwimmers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "swimmers"), where("coachId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMySwimmers(snap.docs.map((d) => ({ id: d.id, name: d.data().name || "" })));
    });
    return () => unsub();
  }, [user]);

  if (!user) return null;

  const cards = [
    { to: "/swimmers", icon: "🏊", title: "سباحوي", desc: "قائمة السباحين" },
    { to: "/times", icon: "⏱️", title: "تسجيل الأزمنة", desc: "أزمنة السباحين" },
    { to: "/trainings", icon: "📅", title: "التدريبات", desc: "برنامج أسبوعي" },
    { to: "/news", icon: "📢", title: "المستجدات", desc: "آخر الأخبار" },
  ];

  return (
    <>
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-abha-green mb-2">
          مرحباً {user.name} 👋
        </h2>
        <p className="text-gray-600">
          لديك <strong className="text-abha-green">{mySwimmers.length}</strong> سباح
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <a key={card.to} href={card.to} className="card text-center hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-2">{card.icon}</div>
            <h3 className="font-semibold text-abha-green">{card.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
          </a>
        ))}
      </div>

      {mySwimmers.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-bold text-abha-green mb-3">🏊 سباحوي</h3>
          <ul className="space-y-2">
            {mySwimmers.map((s) => (
              <li key={s.id} className="p-2 bg-abha-bg rounded">{s.name}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ─── لوحة ولي الأمر ───
function ParentDashboard() {
  const { user } = useAuth();
  const [swimmer, setSwimmer] = useState<{ name: string; ageCategory: string; team: string; points: number; coachName: string } | null>(null);
  const [news, setNews] = useState<{ id: string; title: string; createdAt: Date | null }[]>([]);

  useEffect(() => {
    if (!user?.swimmerId) return;
    const unsub = onSnapshot(doc(db, "swimmers", user.swimmerId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSwimmer({
          name: data.name || "",
          ageCategory: data.ageCategory || "",
          team: data.team || "",
          points: data.points || 0,
          coachName: data.coachName || "",
        });
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "news"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.slice(0, 3).map((d) => ({
        id: d.id,
        title: d.data().title || "",
        createdAt: d.data().createdAt?.toDate() || null,
      }));
      setNews(items);
    });
    return () => unsub();
  }, []);

  if (!user) return null;

  const cards = [
    { to: "/trainings", icon: "📅", title: "جدول التمارين", desc: "برنامج ابنك الأسبوعي" },
    { to: "/times", icon: "⏱️", title: "الأزمنة", desc: "أرقام ابنك المسجلة" },
    { to: "/competitions", icon: "🏆", title: "البطولات", desc: "المواعيد القادمة" },
    { to: "/news", icon: "📢", title: "المستجدات", desc: "آخر الأخبار" },
  ];

  return (
    <>
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-abha-green mb-2">
          مرحباً {user.name} 👋
        </h2>
        <p className="text-gray-600">
          {swimmer ? `هذه لوحة متابعة ${swimmer.name}` : "لوحة تحكم ولي الأمر"}
        </p>
      </div>

      {swimmer && (
        <div className="card mb-6 bg-gradient-to-br from-abha-green/10 to-abha-gold/10">
          <h3 className="font-bold text-abha-green mb-3">🏊 بيانات ابنك</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">الاسم</p>
              <p className="font-semibold">{swimmer.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">الفئة</p>
              <p className="font-semibold">{swimmer.ageCategory}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">الفريق</p>
              <p className="font-semibold">{swimmer.team || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">النقاط</p>
              <p className="font-bold text-abha-gold">{swimmer.points}</p>
            </div>
          </div>
          {swimmer.coachName && (
            <p className="text-sm text-gray-600 mt-3">
              👨‍🏫 المدرب : <strong>{swimmer.coachName}</strong>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <a key={card.to} href={card.to} className="card text-center hover:shadow-lg transition cursor-pointer">
            <div className="text-4xl mb-2">{card.icon}</div>
            <h3 className="font-semibold text-abha-green">{card.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
          </a>
        ))}
      </div>

      {news.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-abha-green mb-3">📢 آخر المستجدات</h3>
          <ul className="space-y-2">
            {news.map((n) => (
              <li key={n.id} className="p-2 bg-abha-bg rounded">{n.title}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ─── Router حسب الدور ───
export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Layout>
      {user.role === "admin" && <AdminDashboard />}
      {user.role === "coach" && <CoachDashboard />}
      {user.role === "parent" && <ParentDashboard />}
      {user.role === "swimmer" && (
        <div className="card text-center py-12">
          <p className="text-gray-500">لوحة السباح - قريباً</p>
        </div>
      )}
    </Layout>
  );
}