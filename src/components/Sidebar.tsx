import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext";

interface MenuItem {
  to: string;
  label: string;
  icon: string;
  roles: Role[];
}

const menuItems: MenuItem[] = [
  { to: "/",              label: "لوحة التحكم",   icon: "📊", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/users",         label: "المستخدمون",    icon: "👥", roles: ["admin"] },
  { to: "/swimmers",      label: "السباحون",      icon: "🏊", roles: ["admin", "coach"] },
  { to: "/news",          label: "المستجدات",     icon: "📢", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/trainings",     label: "جدول التمارين", icon: "📅", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/times",         label: "الأرقام والأزمنة", icon: "⏱️", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/competitions",  label: "البطولات",      icon: "🏆", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/settings",      label: "الإعدادات",     icon: "⚙️", roles: ["admin", "coach", "swimmer", "parent"] },
];

const roleLabels: Record<Role, string> = {
  admin:   "مشرف السياحة",
  coach:   "مدرب",
  swimmer: "سبّاح",
  parent:  "ولي أمر",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visibleItems = menuItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col h-screen sticky top-0">
      {/* الشعار */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-abha-green rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">أ</span>
          </div>
          <div>
            <h1 className="font-bold text-abha-green text-sm">نادي أبها للسباحة</h1>
            <p className="text-xs text-gray-500">{roleLabels[user.role]}</p>
          </div>
        </div>
      </div>

      {/* المستخدم */}
      <div className="p-4 border-b border-gray-200 bg-abha-bg">
        <p className="text-sm font-semibold text-gray-700">{user.name || "بدون اسم"}</p>
        <p className="text-xs text-gray-500 mt-1">{user.email}</p>
      </div>

      {/* القائمة */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? "bg-abha-green text-white font-semibold"
                      : "text-gray-700 hover:bg-abha-bg"
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* زر الخروج */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
        >
          <span className="text-lg">🚪</span>
          <span>خروج</span>
        </button>
      </div>
    </aside>
  );
}