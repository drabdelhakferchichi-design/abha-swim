import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext";

interface MenuItem {
  to: string;
  label: string;
  icon: string;
  roles: Role[];
}

interface SidebarProps {
  onClose?: () => void;
}

const menuItems: MenuItem[] = [
 { to: "/search",        label: "البحث الشامل",      icon: "🔍", roles: ["admin", "coach", "parent"] },
  { to: "/",              label: "لوحة التحكم",       icon: "📊", roles: ["admin", "coach", "swimmer", "parent"] },

  { to: "/users",         label: "المستخدمون",        icon: "👥", roles: ["admin"] },
  { to: "/swimmers",      label: "السباحون",          icon: "🏊", roles: ["admin", "coach"] },
  { to: "/parents",       label: "أولياء الأمور",     icon: "👨‍👦", roles: ["admin"] },
  { to: "/coaches",       label: "المدربون",          icon: "👨‍🏫", roles: ["admin"] },
  { to: "/qualifying",    label: "الأرقام التأهيلية", icon: "🎯", roles: ["admin", "coach", "parent"] },
  { to: "/news",          label: "المستجدات",         icon: "📢", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/messages",      label: "التواصل",           icon: "💬", roles: ["admin", "coach", "parent"] },
  { to: "/reports",       label: "التقارير",          icon: "📊", roles: ["admin", "coach", "parent"] },
  { to: "/trainings",     label: "جدول التمارين",     icon: "📅", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/times",         label: "الأرقام والأزمنة",  icon: "⏱️", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/competitions",  label: "البطولات",          icon: "🏆", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/settings",      label: "الإعدادات",         icon: "⚙️", roles: ["admin", "coach", "swimmer", "parent"] },
  { to: "/guide",         label: "دليل الاستخدام",    icon: "📖", roles: ["admin", "coach", "parent"] },
  { to: "/meetings",      label: "اجتماعات Zoom", icon: "📹", roles: ["admin", "coach", "parent", "swimmer"] },
];

const roleLabels: Record<Role, string> = {
  admin:   "مشرف السياحة",
  coach:   "مدرب",
  swimmer: "سبّاح",
  parent:  "ولي أمر",
};

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const visibleItems = menuItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col h-screen">
      {/* الشعار */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo.png"
            alt="شعار أبها"
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="font-bold text-abha-green text-sm">نادي أبها للسباحة</h1>
            <p className="text-xs text-gray-500">{roleLabels[user.role]}</p>
          </div>
        </div>
        {/* زر الإغلاق في الجوال */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 text-2xl p-1"
            aria-label="إغلاق"
          >
            ×
          </button>
        )}
      </div>

      {/* المستخدم */}
      <div className="p-4 border-b border-gray-200 bg-abha-bg">
        <p className="text-sm font-semibold text-gray-700">{user.name || "بدون اسم"}</p>
        <p className="text-xs text-gray-500 mt-1" dir="ltr">{user.email}</p>
      </div>

      {/* القائمة */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                onClick={handleLinkClick}
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