import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // ✅ تفعيل الإشعارات تلقائياً
  const { permission, requestPermission } = useNotifications({
    userId: user?.uid,
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-abha-bg flex" dir="rtl">
      {/* Overlay للجوال */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 right-0 z-50
          transform transition-transform duration-300 lg:transform-none
          ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* المحتوى */}
      <main className="flex-1 overflow-x-hidden w-full">
        {/* Top Bar للجوال */}
        <div className="lg:hidden bg-abha-green text-white p-3 flex items-center justify-between sticky top-0 z-30 shadow">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-2xl p-1"
            aria-label="فتح القائمة"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="أبها" className="w-8 h-8 object-contain" />
            <span className="font-bold text-sm">نادي أبها للسباحة</span>
          </div>
          <div className="w-8"></div>
        </div>

        {/* شريط الإشعارات (إذا لم يُفعّل) */}
        {permission === "default" && (
          <div className="bg-abha-gold text-white p-3 text-sm flex items-center justify-between shadow">
            <span>🔔 فعّل الإشعارات لتصلك المستجدات والرسائل</span>
            <button
              onClick={requestPermission}
              className="bg-white text-abha-gold px-3 py-1 rounded font-semibold text-xs hover:bg-gray-100"
            >
              تفعيل
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-3 sm:p-6">{children}</div>
      </main>
    </div>
  );
}