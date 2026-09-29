import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

const greetings: Record<string, string> = {
  admin:   "يمكنك إدارة المدربين والسباحين والمستجدات والتقارير.",
  coach:   "يمكنك تسجيل أرقام السباحين، أهدافهم، والبرنامج الأسبوعي.",
  swimmer: "اطّلع على أرقامك، تمارينك، والبطولات القادمة.",
  parent:  "اطّلع على تقارير ابنك، أزمنته، وأرسل استفساراتك.",
};

const cards = [
  { to: "/trainings",    icon: "📅", title: "جدول التمارين", desc: "البرنامج الأسبوعي" },
  { to: "/times",        icon: "⏱️", title: "الأرقام والأزمنة", desc: "النتائج المسجّلة" },
  { to: "/competitions", icon: "🏆", title: "البطولات القادمة", desc: "المواعيد والنتائج" },
  { to: "/news",         icon: "📢", title: "المستجدات", desc: "آخر الأخبار والتعاميم" },
];

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Layout>
      {/* بطاقة الترحيب */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-abha-green mb-2">
          مرحباً {user.name || "بك"} 👋
        </h2>
        <p className="text-gray-600">{greetings[user.role]}</p>
      </div>

      {/* البطاقات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <a
            key={card.to}
            href={card.to}
            className="card text-center hover:shadow-lg transition cursor-pointer"
          >
            <div className="text-4xl mb-2">{card.icon}</div>
            <h3 className="font-semibold text-abha-green">{card.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
          </a>
        ))}
      </div>
    </Layout>
  );
}