import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

interface Swimmer {
  id: string;
  name: string;
  ageCategory: string;
  team: string;
  coachName: string;
}

interface UserRec {
  id: string;
  name: string;
  username: string;
  role: string;
  swimmerName?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
}

interface Report {
  id: string;
  swimmerName: string;
  month: string;
  rating: string;
}

interface NewsItem {
  id: string;
  title: string;
}

type ResultType = "swimmer" | "user" | "meeting" | "report" | "news";

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  link: string;
}

export default function Search() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [users, setUsers] = useState<UserRec[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | ResultType>("all");

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "swimmers"), (s) => {
      setSwimmers(s.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "",
        ageCategory: d.data().ageCategory || "",
        team: d.data().team || "",
        coachName: d.data().coachName || "",
      })));
    });

    const u2 = onSnapshot(query(collection(db, "users")), (s) => {
      setUsers(s.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "",
        username: d.data().username || "",
        role: d.data().role || "",
        swimmerName: d.data().swimmerName,
      })));
    });

    const u3 = onSnapshot(collection(db, "meetings"), (s) => {
      setMeetings(s.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "",
        date: d.data().date || "",
      })));
    });

    const u4 = onSnapshot(collection(db, "reports"), (s) => {
      setReports(s.docs.map((d) => ({
        id: d.id,
        swimmerName: d.data().swimmerName || "",
        month: d.data().month || "",
        rating: d.data().rating || "",
      })));
    });

    const u5 = onSnapshot(collection(db, "news"), (s) => {
      setNews(s.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "",
      })));
    });

    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const term = search.trim().toLowerCase();

  const results: SearchResult[] = [];

  if (term) {
    // البحث في السباحين
    swimmers.forEach((s) => {
      if (s.name.toLowerCase().includes(term) || s.team.toLowerCase().includes(term)) {
        results.push({
          type: "swimmer",
          id: s.id,
          title: s.name,
          subtitle: `${s.ageCategory} — ${s.coachName}`,
          icon: "🏊",
          link: `/swimmers/${s.id}`,
        });
      }
    });

    // البحث في المستخدمين (أولياء أمور + مدربين)
    users.forEach((u) => {
      if (
        u.name.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term)
      ) {
        const roleLabel = u.role === "parent" ? "ولي أمر" : u.role === "coach" ? "مدرب" : "مشرف";
        results.push({
          type: "user",
          id: u.id,
          title: u.name,
          subtitle: `${roleLabel} — @${u.username}${u.swimmerName ? ` — ابنه: ${u.swimmerName}` : ""}`,
          icon: u.role === "parent" ? "👨‍👦" : u.role === "coach" ? "👨‍🏫" : "🟢",
          link: u.role === "parent" ? "/parents" : u.role === "coach" ? "/coaches" : "/users",
        });
      }
    });

    // البحث في الاجتماعات
    meetings.forEach((m) => {
      if (m.title.toLowerCase().includes(term)) {
        results.push({
          type: "meeting",
          id: m.id,
          title: m.title,
          subtitle: `📅 ${m.date}`,
          icon: "📹",
          link: "/meetings",
        });
      }
    });

    // البحث في التقارير
    reports.forEach((r) => {
      if (r.swimmerName.toLowerCase().includes(term)) {
        results.push({
          type: "report",
          id: r.id,
          title: `تقرير ${r.swimmerName}`,
          subtitle: `${r.month} — ${r.rating}`,
          icon: "📊",
          link: "/reports",
        });
      }
    });

    // البحث في المستجدات
    news.forEach((n) => {
      if (n.title.toLowerCase().includes(term)) {
        results.push({
          type: "news",
          id: n.id,
          title: n.title,
          subtitle: "خبر",
          icon: "📢",
          link: "/news",
        });
      }
    });
  }

  const filtered = filterType === "all" ? results : results.filter((r) => r.type === filterType);

  const filterButtons = [
    { key: "all", label: "الكل", icon: "🔍" },
    { key: "swimmer", label: "سباحون", icon: "🏊" },
    { key: "user", label: "مستخدمون", icon: "👥" },
    { key: "meeting", label: "اجتماعات", icon: "📹" },
    { key: "report", label: "تقارير", icon: "📊" },
    { key: "news", label: "مستجدات", icon: "📢" },
  ] as const;

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-abha-green mb-6">🔍 البحث الشامل</h1>

      <div className="card mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-lg"
          placeholder="ابحث عن سباح، ولي أمر، مدرب، اجتماع، تقرير..."
          autoFocus
        />
      </div>

      {term && (
        <div className="card mb-4">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  filterType === f.key ? "bg-abha-green text-white" : "bg-gray-100"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!term ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500">اكتب في البحث أعلاه للبدء</p>
          <p className="text-xs text-gray-400 mt-2">
            يبحث في: السباحين، أولياء الأمور، المدربين، الاجتماعات، التقارير، المستجدات
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">😔</div>
          <p className="text-gray-500">لا توجد نتائج لـ "{search}"</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 mb-2">
            {filtered.length} نتيجة
          </p>
          {filtered.map((r) => (
            <Link
              key={`${r.type}-${r.id}`}
              to={r.link}
              className="card flex items-center gap-3 hover:shadow-lg transition cursor-pointer"
            >
              <div className="text-3xl">{r.icon}</div>
              <div className="flex-1">
                <h3 className="font-bold text-abha-green">{r.title}</h3>
                <p className="text-sm text-gray-500">{r.subtitle}</p>
              </div>
              <div className="text-gray-400">←</div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}