import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

interface NewsItem {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date | null;
}

export default function News() {
  const { user } = useAuth();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // قراءة realtime من Firestore
  useEffect(() => {
    const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: NewsItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "",
          body: data.body || "",
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt?.toDate() || null,
        };
      });
      setItems(list);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "news"), {
        title: title.trim(),
        body: body.trim(),
        createdBy: user.uid,
        createdByName: user.name || user.email,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setBody("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("خطأ في النشر");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الخبر ؟")) return;
    try {
      await deleteDoc(doc(db, "news", id));
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (d: Date | null) => {
    if (!d) return "";
    return d.toLocaleString("ar-SA", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-abha-green">📢 المستجدات</h1>
        {user?.role === "admin" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? "إلغاء" : "➕ إضافة خبر"}
          </button>
        )}
      </div>

      {/* نموذج الإضافة */}
      {showForm && user?.role === "admin" && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">العنوان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="عنوان الخبر..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">النص</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input"
              rows={5}
              placeholder="نص الخبر أو التعميم..."
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? "جاري النشر..." : "✅ نشر"}
          </button>
        </form>
      )}

      {/* القائمة */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا توجد مستجدات حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-abha-green">{item.title}</h3>
                {user?.role === "admin" && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap mb-3">{item.body}</p>
              <div className="text-xs text-gray-400 border-t pt-2">
                ✍️ {item.createdByName} — {formatDate(item.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}