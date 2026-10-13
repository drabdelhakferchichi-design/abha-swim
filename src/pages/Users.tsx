import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

interface AppUser {
  uid: string;
  name: string;
  username: string;
  email: string;
  role: string;
  swimmerName?: string;
  coachName?: string;
}

const roleLabels: Record<string, string> = {
  admin:   "مشرف",
  coach:   "مدرب",
  parent:  "ولي أمر",
};

const roleColors: Record<string, string> = {
  admin:   "bg-green-100 text-green-700",
  coach:   "bg-blue-100 text-blue-700",
  parent:  "bg-orange-100 text-orange-700",
};

export default function Users() {
  const { user } = useAuth();
  const [list, setList] = useState<AppUser[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const items: AppUser[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({
          uid: d.id,
          name: data.name || "",
          username: data.username || "",
          email: data.email || "",
          role: data.role || "",
          swimmerName: data.swimmerName,
          coachName: data.coachName,
        });
      });
      setList(items);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (uid: string) => {
    if (!confirm("هل تريد حذف هذا المستخدم ؟ (لا يمكن التراجع)")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      // ⚠️ ملاحظة : هذا يحذف وثيقة Firestore فقط
      // الحساب في Firebase Auth يحتاج Vercel Function منفصل
    } catch (err) {
      console.error(err);
      alert("خطأ في الحذف");
    }
  };

  // ─── الفلترة ───
  const filtered = list.filter((u) => {
    const matchRole = filter === "all" || u.role === filter;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.username.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  // ─── الإحصائيات ───
  const stats = {
    total: list.length,
    coaches: list.filter((u) => u.role === "coach").length,
    parents: list.filter((u) => u.role === "parent").length,
    admins: list.filter((u) => u.role === "admin").length,
  };

  const isAdmin = user?.role === "admin";

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">👥 إدارة المستخدمين</h1>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-abha-green">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">إجمالي المستخدمين</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.coaches}</div>
          <div className="text-xs text-gray-500 mt-1">المدربون</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-orange-600">{stats.parents}</div>
          <div className="text-xs text-gray-500 mt-1">أولياء الأمور</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-700">{stats.admins}</div>
          <div className="text-xs text-gray-500 mt-1">المشرفون</div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="card mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          placeholder="🔍 ابحث بالاسم أو اسم المستخدم..."
        />

        <div className="flex flex-wrap gap-2">
          {[
            { key: "all",     label: "الكل" },
            { key: "admin",   label: "🟢 مشرف" },
            { key: "coach",   label: "🔵 مدرب" },
            { key: "parent",  label: "🟠 ولي أمر" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                filter === f.key
                  ? "bg-abha-green text-white font-semibold"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* القائمة */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">
            {search || filter !== "all"
              ? "لا توجد نتائج مطابقة"
              : "لا يوجد مستخدمون حالياً"}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-abha-green text-abha-green">
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">اسم المستخدم</th>
                <th className="text-right p-3">الدور</th>
                <th className="text-right p-3">معلومات إضافية</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.uid} className="border-b border-gray-100 hover:bg-abha-bg">
                  <td className="p-3 font-semibold">{u.name || "-"}</td>
                  <td className="p-3 font-mono text-xs" dir="ltr">
                    {u.username || "(غير محدد)"}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${roleColors[u.role] || "bg-gray-100"}`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {u.role === "parent" && u.swimmerName && (
                      <span>👨‍👦 ابنه : {u.swimmerName}</span>
                    )}
                    {u.role === "coach" && (
                      <span>🏊 مدرب سباحة</span>
                    )}
                    {u.role === "admin" && (
                      <span>⭐ مشرف السياحة</span>
                    )}
                  </td>
                  <td className="p-3">
                    {isAdmin && u.uid !== user?.uid && (
                      <button
                        onClick={() => handleDelete(u.uid)}
                        className="text-red-500 hover:text-red-700"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
        ℹ️ إضافة مستخدمين جدد تتم من صفحة "السباحون" (لأولياء الأمور) — قريباً صفحة لإضافة المدربين.
      </div>
    </Layout>
  );
}