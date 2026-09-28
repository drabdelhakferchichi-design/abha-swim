import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const roleLabels: Record<string, string> = {
  admin:   "مشرف السياحة",
  coach:   "مدرب",
  swimmer: "سبّاح",
  parent:  "ولي أمر",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-abha-bg">
      {/* الشريط العلوي */}
      <header className="bg-abha-green text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold">أ</span>
            </div>
            <div>
              <h1 className="font-bold">نادي أبها للسباحة</h1>
              <p className="text-xs text-white/80">{roleLabels[user.role]}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block">{user.name || user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      {/* المحتوى */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-abha-green mb-2">
            مرحباً {user.name || "بك"} 👋
          </h2>
          <p className="text-gray-600">
            {user.role === "admin" && "يمكنك إدارة المدربين والسباحين والتقارير."}
            {user.role === "coach" && "يمكنك تسجيل الأرقام والتقارير الشهرية."}
            {user.role === "swimmer" && "اطّلع على أرقامك ومواعيد التمارين."}
            {user.role === "parent" && "اطّلع على تقارير ابنك وأرسل استفساراتك."}
          </p>
        </div>

        {/* بطاقات قادمة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-4xl mb-2">📅</div>
            <h3 className="font-semibold">جدول التمارين</h3>
            <p className="text-sm text-gray-500 mt-1">قريباً</p>
          </div>
          <div className="card text-center">
            <div className="text-4xl mb-2">⏱️</div>
            <h3 className="font-semibold">الأرقام والأزمنة</h3>
            <p className="text-sm text-gray-500 mt-1">قريباً</p>
          </div>
          <div className="card text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-semibold">البطولات القادمة</h3>
            <p className="text-sm text-gray-500 mt-1">قريباً</p>
          </div>
        </div>
      </main>
    </div>
  );
}